# Deploy — Cloud Run via Artifact Registry

Runbook do console do Ecossistema Shemá. Escrito para quem executa **com as credenciais**, na ordem em que
vai precisar. Quem lê isto às 22:00 provavelmente não é quem escreveu.

O que este deploy é, em quatro linhas:

- Um merge na `main` dispara `.github/workflows/deploy.yml`, que constrói a imagem do `Dockerfile` da raiz,
  empurra para o **Artifact Registry** em `us-central1` e faz `gcloud run deploy` no serviço
  `project-management-ecosystem`.
- A imagem é marcada com **o SHA do commit** e também com `latest`. **O deploy nunca aponta para `latest`** —
  sempre para uma tag imutável. `latest` é conveniência de inspeção; rollback é redeploy de uma tag conhecida.
- O contêiner recebe o `.env` **montado** em `/run/secrets/.env`, vindo do Secret Manager do projeto
  `shemaobt-secrets`. Sem ele o `docker-entrypoint.sh` **recusa subir**.
- **O serviço não é público.** `--no-allow-unauthenticated` no deploy, e um passo do workflow falha o job se
  aparecer `allUsers` ou `allAuthenticatedUsers` na política de IAM do serviço. `src/__tests__/deploy.test.ts`
  reprova `npm test` se alguém tirar qualquer um dos dois do workflow — a caixa mais dura da DoD é verificável
  sem credencial nenhuma.

## 1. A decisão de acesso — IAM, não IAP

**Mecanismo: IAM sobre o próprio Cloud Run.** O serviço sobe com `--no-allow-unauthenticated` e o acesso é
`roles/run.invoker` concedido a **contas nomeadas**, uma a uma. Não há grupo curinga, não há
`allAuthenticatedUsers` (que significa *qualquer conta Google do planeta*, não *qualquer pessoa da nossa
organização*).

Por que não IAP: IAP prático pede um HTTPS Load Balancer com domínio e certificado, e **domínio próprio está
fora do escopo desta issue** (FE-42) — ele entra quando o cliente escolher o nome. Subir um LB agora seria
infraestrutura sem dono para sustentar uma decisão que o domínio vai reabrir. IAM entrega hoje a propriedade
que a issue exige (não público, titulares nomeados, revogação em um comando) e **IAP é o passo seguinte**,
no mesmo dia em que o domínio existir: o serviço continua `--no-allow-unauthenticated`, o LB passa a ser o
único invoker e o IAP passa a decidir quem entra.

Por que isto importa mais aqui do que num frontend comum: esta URL mostra **127 projetos reais, nomes de
equipes reais e países reais**, e alguns desses países são `sensitiveCountry` (`CLAUDE.md` §6.1). Fixture
derivada do export do Notion continua sendo informação real sobre pessoas reais em lugares reais. Um deploy
público de onda 1 é um vazamento, não uma demo.

### Quem tem acesso

| Papel | Conta | Concedido por |
|---|---|---|
| Deploy (CI) | a service account de deploy do GitHub Actions (`GCP_SA_KEY`) | `roles/run.admin` no projeto |
| Runtime do serviço | a service account de runtime (`CLOUD_RUN_RUNTIME_SA`) | não é invoker; só roda o contêiner |
| Pessoas | **preencher na primeira execução** — uma linha por conta Google, nome e e-mail | `roles/run.invoker` no serviço |

> **A lista de pessoas é deliberadamente um espaço em branco, não um default.** Quem executa o setup a
> preenche com as contas que o cliente e a equipe aprovarem, e atualiza esta tabela no mesmo commit em que
> rodar os `add-iam-policy-binding`. Uma lista vazia aqui significa *ninguém além do CI alcança o serviço* —
> que é o estado seguro para começar, não um estado quebrado.

## 2. Setup único

Só se faz uma vez. Rode com uma conta que tenha administração no projeto de runtime e no `shemaobt-secrets`.

```sh
export PROJECT_ID=<projeto-de-runtime>          # o mesmo que vai para o secret GCP_PROJECT_ID
export REGION=us-central1
export REPO=project-management-ecosystem
export SERVICE=project-management-ecosystem
export SECRETS_PROJECT=shemaobt-secrets
export SECRET_NAME=project_management_ecosystem_env
export DEPLOY_SA=<sa-de-deploy>@$PROJECT_ID.iam.gserviceaccount.com
export RUNTIME_SA=<sa-de-runtime>@$PROJECT_ID.iam.gserviceaccount.com
```

**Antes de criar qualquer service account, procure a que já existe.** O `meaning-map-ui` já faz este mesmo
caminho no mesmo projeto; reusar a conta dele é o padrão da casa e evita cunhar permissão nova.

```sh
gcloud iam service-accounts list --project "$PROJECT_ID"
```

### 2.1 APIs

```sh
gcloud services enable run.googleapis.com artifactregistry.googleapis.com --project "$PROJECT_ID"
gcloud services enable secretmanager.googleapis.com --project "$SECRETS_PROJECT"
```

### 2.2 Repositório no Artifact Registry

```sh
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Imagens do console do Ecossistema Shemá" \
  --project "$PROJECT_ID"
```

A região tem de ser `us-central1`: é a que o workflow escreve no host da imagem
(`us-central1-docker.pkg.dev/...`) e a mesma de todo frontend da org.

### 2.3 Service accounts e os papéis mínimos

Crie **apenas** as que não existirem:

```sh
gcloud iam service-accounts create <sa-de-deploy>  --project "$PROJECT_ID" --display-name "GitHub Actions deploy"
gcloud iam service-accounts create <sa-de-runtime> --project "$PROJECT_ID" --display-name "Cloud Run runtime — console Shemá"
```

Deploy (o que o CI precisa, e nada além):

```sh
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:$DEPLOY_SA" --role="roles/iam.serviceAccountUser" --project "$PROJECT_ID"
```

O terceiro comando é o que costuma faltar: `run.admin` deixa o CI criar a revisão, mas **fazer deploy *como*
outra service account** exige `iam.serviceAccountUser` **sobre aquela conta** — não no projeto inteiro.

A conta de runtime **não recebe papel nenhum no projeto**. O único acesso que ela ganha é ao segredo, na
próxima seção.

### 2.4 O segredo, e o acesso por segredo

O conteúdo é o `.env` que o contêiner carrega. Hoje é uma linha:

```sh
printf 'BACKEND_URL=https://<host-do-shema-api>\n' > /tmp/pme.env

gcloud secrets create "$SECRET_NAME" \
  --replication-policy=automatic \
  --data-file=/tmp/pme.env \
  --project "$SECRETS_PROJECT"

rm /tmp/pme.env
```

Na onda 1 **não há backend atrás** — qualquer URL `https://` válida serve como placeholder, e o app inteiro
funciona contra fixtures. O que não pode é a variável faltar: o entrypoint recusa subir, de propósito
(`CLAUDE.md` §8, FE-41).

O acesso é **por segredo**, nunca no projeto:

```sh
gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
  --member="serviceAccount:$RUNTIME_SA" \
  --role="roles/secretmanager.secretAccessor" \
  --project "$SECRETS_PROJECT"
```

Para atualizar o valor depois, é uma versão nova (o serviço lê `:latest` na partida da revisão, então o
valor novo entra no próximo deploy):

```sh
printf 'BACKEND_URL=https://<novo-host>\n' | gcloud secrets versions add "$SECRET_NAME" --data-file=- --project "$SECRETS_PROJECT"
```

> ⚠️ **Referência cross-project — confirme na primeira execução.** O segredo mora em `shemaobt-secrets` e o
> serviço mora em outro projeto, então o `--set-secrets` usa o nome completo do recurso:
> `projects/shemaobt-secrets/secrets/project_management_ecosystem_env:latest`. É essa a forma que o workflow
> monta por padrão. **Se o `gcloud run deploy` recusar a referência pedindo o número do projeto**, descubra-o
> e ponha na variável de repositório `GCP_SECRETS_PROJECT_REF` — o workflow a usa no lugar do ID, sem mais
> nenhuma mudança:
>
> ```sh
> gcloud projects describe "$SECRETS_PROJECT" --format='value(projectNumber)'
> gh variable set GCP_SECRETS_PROJECT_REF --body <numero>
> ```

### 2.5 Secrets e variables do GitHub

No repositório `shemaobt/project-management-ecosystem`:

| Nome | Tipo | Valor |
|---|---|---|
| `GCP_PROJECT_ID` | secret | o ID do projeto de runtime |
| `GCP_SA_KEY` | secret | JSON da chave da service account de **deploy** |
| `CLOUD_RUN_RUNTIME_SA` | variable | e-mail da service account de **runtime** |
| `GCP_SECRETS_PROJECT_REF` | variable (opcional) | número do projeto `shemaobt-secrets`, só se §2.4 pedir |

```sh
gh secret   set GCP_PROJECT_ID        --body "$PROJECT_ID"
gh secret   set GCP_SA_KEY            < chave.json
gh variable set CLOUD_RUN_RUNTIME_SA  --body "$RUNTIME_SA"
```

Gere a chave de deploy só se ainda não houver uma em uso, e **apague o arquivo local depois de subir**:

```sh
gcloud iam service-accounts keys create chave.json --iam-account "$DEPLOY_SA" --project "$PROJECT_ID"
gh secret set GCP_SA_KEY < chave.json && rm chave.json
```

O primeiro passo do workflow (`Check required secrets`) falha com mensagem nomeada se qualquer um dos três
obrigatórios estiver faltando. Falhar ali custa dez segundos; falhar no `gcloud run deploy` custa a leitura
de um log.

### 2.6 Conceder acesso às pessoas

```sh
gcloud run services add-iam-policy-binding "$SERVICE" \
  --region "$REGION" --project "$PROJECT_ID" \
  --member="user:<pessoa>@<dominio>" --role="roles/run.invoker"
```

Preencha a tabela do §1 no mesmo momento. **Nunca** `--member="allUsers"` nem `--member="allAuthenticatedUsers"`:
o workflow tem um passo que falha o job quando qualquer um dos dois aparece na política.

## 3. O primeiro deploy

1. Mergeie na `main` (ou rode **Actions → Deploy (Cloud Run) → Run workflow** com `image_tag` **vazio**).
   Disparado de uma branch que não é `main`, com `image_tag` vazio, o workflow constrói e faz deploy **daquela
   branch** — é como se valida uma mudança de infraestrutura antes de mergear, e é mais uma razão para o
   serviço não ser público.
2. O que esperar ver, em ordem: `Required secrets and variables are set.` → `Target tag: <sha>` → build e push
   da imagem → `gcloud run deploy` criando a revisão → `Service is private: no allUsers, no allAuthenticatedUsers.`
   → `Deployed to: https://...` e o mesmo bloco no *summary* do job.
3. Abrir a URL no browser sem estar autenticado devolve **403**. **Isso é o comportamento correto**, não uma
   falha de deploy. Para ver o app:

   ```sh
   gcloud run services proxy "$SERVICE" --region "$REGION" --project "$PROJECT_ID"
   ```

   e abra `http://localhost:8080`. O proxy assina as requisições com a sua conta; ela precisa de
   `roles/run.invoker` (§2.6). Em SDK mais antigo o comando é `gcloud beta run services proxy`.
4. Confira que a revisão está mesmo privada e com o segredo montado:

   ```sh
   gcloud run services get-iam-policy "$SERVICE" --region "$REGION" --project "$PROJECT_ID"
   gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT_ID" \
     --format='value(spec.template.spec.containers[0].image)'
   ```

## 4. Rollback

**Rollback é redeploy de uma tag que já existe.** Nunca é rebuild: rebuild de um commit antigo pode produzir
uma imagem diferente (dependência transitiva que mudou, base image que andou) e leva minutos que você não tem.

1. Ache a tag boa — as tags são SHAs de commit:

   ```sh
   gcloud artifacts docker images list \
     "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend" \
     --include-tags --sort-by=~UPDATE_TIME --limit=20 --project "$PROJECT_ID"
   ```

2. **Actions → Deploy (Cloud Run) → Run workflow**, campo `image_tag` = o SHA. O job pula build e push,
   confere que a imagem existe no Artifact Registry e roda só o `gcloud run deploy`.

   ```sh
   gh workflow run "Deploy (Cloud Run)" --ref main -f image_tag=<sha>
   ```

3. **Quando o GitHub estiver fora**, o equivalente direto:

   ```sh
   gcloud run deploy "$SERVICE" \
     --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/frontend:<sha>" \
     --project "$PROJECT_ID" --region "$REGION" --platform managed \
     --port 8080 --no-allow-unauthenticated \
     --service-account "$RUNTIME_SA" \
     --set-secrets "/run/secrets/.env=projects/$SECRETS_PROJECT/secrets/$SECRET_NAME:latest" \
     --memory 256Mi --cpu 1 --concurrency 80 --timeout 60
   ```

   Repetir a linha inteira não é enfeite: `gcloud run deploy` sem `--no-allow-unauthenticated` **preserva** a
   política atual, mas sem `--set-secrets` e sem `--service-account` a revisão nova pode sair sem o que a
   anterior tinha. Cole o comando como está.

   > Esta é a **única cópia dos flags de deploy fora do workflow**, e existe porque o caminho de emergência
   > não pode depender do GitHub estar de pé. Quem mudar um flag em `.github/workflows/deploy.yml` muda este
   > bloco no mesmo commit.

4. O caminho mais rápido de todos, quando a revisão anterior ainda está no serviço e você só quer desviar o
   tráfego (segundos, sem tocar em imagem):

   ```sh
   gcloud run revisions list --service "$SERVICE" --region "$REGION" --project "$PROJECT_ID"
   gcloud run services update-traffic "$SERVICE" --to-revisions <revisao-boa>=100 \
     --region "$REGION" --project "$PROJECT_ID"
   ```

   Use isto para estancar e o passo 2 para consolidar — senão o próximo deploy volta a mandar 100% para a
   revisão mais nova.

## 5. Quando falha

Onde ler o log do contêiner, sempre:

```sh
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE" \
  --project "$PROJECT_ID" --limit 50 --freshness=1h
```

(`gcloud run services logs read "$SERVICE" --region "$REGION"` é o atalho, quando a sua versão do SDK já o
tem fora do `beta`. O `gcloud logging read` acima funciona em qualquer uma.)

| Sintoma | O que é | O que fazer |
|---|---|---|
| Revisão não fica pronta e o log diz `docker-entrypoint: BACKEND_URL is not set — refusing to start` | **O mais provável na primeira vez.** O arquivo `/run/secrets/.env` não chegou (segredo não criado, nome errado, `--set-secrets` ausente) ou chegou vazio | Confira §2.4 e o `--set-secrets` da revisão: `gcloud run services describe "$SERVICE" --region "$REGION" --format=yaml \| grep -A5 volumeMounts` |
| Log diz `BACKEND_URL='...' must be http(s)://<host>` | O valor existe mas não tem esquema | Nova versão do segredo com `https://` na frente (§2.4) e redeploy |
| `PERMISSION_DENIED` ao acessar o segredo, ou a revisão falha citando Secret Manager | Falta `secretAccessor` **naquele segredo** para a SA de runtime, ou a referência cross-project está pelo ID onde a API quer o número | §2.4 — o binding, e depois o aviso do `GCP_SECRETS_PROJECT_REF` |
| `denied: Permission "artifactregistry.repositories.uploadArtifacts" denied` no push | SA de deploy sem `artifactregistry.writer`, ou o repositório não existe na região | §2.2 e §2.3 |
| `Permission 'iam.serviceaccounts.actAs' denied on service account` | Falta `iam.serviceAccountUser` da SA de deploy **sobre a SA de runtime** | O terceiro comando do §2.3 |
| `The user-provided container failed to start and listen on the port defined by the PORT environment variable` | Porta. O nginx desta imagem escuta **8080 fixo** (`nginx.conf`) e o workflow manda `--port 8080` | Não mude o `--port` sem mudar o `nginx.conf` junto; se mudou, reverta |
| O job passa mas `Assert the service is not publicly reachable` falha | Alguém concedeu `allUsers`/`allAuthenticatedUsers` ao serviço | Remova o binding (§6) e descubra quem o pôs antes de redeployar |
| A URL devolve 403 no browser | Esperado | §3 passo 3 — `gcloud run services proxy`, e `run.invoker` para a pessoa |
| `image_tag '...' has characters an Artifact Registry tag cannot carry` | Digitação no input do rollback | Cole o SHA de `gcloud artifacts docker images list` |
| `A rollback names an immutable tag, never 'latest'` | `image_tag=latest` no rollback | `latest` anda a cada merge: a revisão que ele deployaria hoje não é a que deployaria amanhã, e o serviço deixa de dizer o que está rodando. Use o SHA |

## 6. Acesso: conceder, revogar, auditar

```sh
# quem alcança hoje
gcloud run services get-iam-policy "$SERVICE" --region "$REGION" --project "$PROJECT_ID"

# conceder
gcloud run services add-iam-policy-binding "$SERVICE" --region "$REGION" --project "$PROJECT_ID" \
  --member="user:<pessoa>@<dominio>" --role="roles/run.invoker"

# revogar
gcloud run services remove-iam-policy-binding "$SERVICE" --region "$REGION" --project "$PROJECT_ID" \
  --member="user:<pessoa>@<dominio>" --role="roles/run.invoker"
```

O passo `Assert the service is not publicly reachable` fecha a porta **no momento do deploy**; entre um
deploy e o próximo não há vigilância nenhuma, e é o primeiro comando abaixo que responde quem alcança hoje.
Vale rodá-lo sempre que alguém mexer em IAM no projeto.

Revogar tem efeito na próxima requisição — não há sessão a expirar, porque não há sessão: a autenticação é a
identidade Google de quem chama. Atualize a tabela do §1 nas duas direções; uma lista de titulares que não
bate com a política é pior do que não ter lista.

Quando o domínio próprio chegar (fora do escopo da FE-42), o caminho é: HTTPS Load Balancer na frente,
IAP ligado no backend service, `roles/run.invoker` do serviço restrito **só** à service account do LB, e esta
seção passa a apontar para os titulares do IAP. O `--no-allow-unauthenticated` continua onde está.
