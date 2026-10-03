# Deploy — Cloud Run via Artifact Registry

**Status:** no ar desde 02/out/2026 em `https://project-management-ecosystem-f7ssqjozfq-uc.a.run.app` (primeiro deploy
e rollback provados no mesmo dia), **público** desde a mesma data. O setup único do §2 foi executado em 02/out/2026 no projeto `gen-lang-client-0886209230` ("OBT Lab",
número `718681737495`), onde todo frontend da org já roda. O §2 é o registro do que existe e de como reconferir,
não uma lista de trabalho. O que ainda falta está no §3 (primeiro deploy) e no §4 (provar o rollback).

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
- **O serviço é público**, como todo frontend da org: `--allow-unauthenticated` no deploy, e um passo do
  workflow confere **em todo deploy** que a URL responde 200 sem credencial e que `/api` é respondido pelo
  backend, não pelo fallback da SPA. `src/__tests__/deploy.test.ts` reprova `npm test` se alguém tirar a flag
  ou o passo do workflow — mas **não é um portão de merge**:
  o `lint.yml` roda só ESLint e `tsc -b` no `pull_request`, então a suíte só roda quando alguém a roda.
  Na prática: **antes de mergear qualquer mudança no `deploy.yml`, rode `npm test`.** Ligar o vitest ao CI é
  uma linha no `lint.yml`, que é dono da FE-40 e não desta issue.

## 1. A decisão de acesso — público, como os irmãos

**O serviço é público.** Sobe com `--allow-unauthenticated`, exatamente como `sound-necklace`,
`facilitator-desk`, `meaning-map-ui` e os demais frontends da org. Quem entra é decidido pelo **login do
próprio app** contra o `shema-api`, não pelo IAM do Cloud Run.

**Isto reabre a OBT-384.** A issue pedia o serviço fora do alcance público, e o primeiro deploy (02/out/2026,
manhã) saiu assim: `--no-allow-unauthenticated`, `roles/run.invoker` por conta nomeada, e um passo que reprovava
`allUsers`. Na mesma data Henok decidiu abrir: a URL precisa ser aberta no navegador por quem não tem `gcloud`,
e o padrão da casa é público. O que a issue temia — 127 projetos reais, equipes e países sensíveis — continua
verdadeiro e passa a ser responsabilidade do login do app e das regras de `CLAUDE.md` §6.1, não do IAM.
O registro da decisão está no `CLAUDE.md` §8 e no comentário da issue.

**Como voltar a fechar**, se a decisão for revertida: `--no-allow-unauthenticated` no workflow, remover o
binding `allUsers` com o comando do §6, e devolver o passo de IAM ao workflow — o commit `6153f00` e os
anteriores dele carregam a versão privada completa, com o teste de contrato que a guardava.

## 2. Setup único

Feito em 02/out/2026. Só se refaz se algum recurso abaixo sumir. Rode com uma conta que tenha administração no
projeto de runtime e no `shemaobt-secrets`.

```sh
export PROJECT_ID=gen-lang-client-0886209230     # o mesmo que está no secret GCP_PROJECT_ID
export PROJECT_NUMBER=718681737495
export REGION=us-central1
export REPO=project-management-ecosystem
export SERVICE=project-management-ecosystem
export SECRETS_PROJECT=shemaobt-secrets
export SECRETS_PROJECT_NUMBER=384168199195
export SECRET_NAME=project_management_ecosystem_env
export GITHUB_REPO=shemaobt/project-management-ecosystem
export DEPLOY_SA=pme-github-deployer@$PROJECT_ID.iam.gserviceaccount.com
export RUNTIME_SA=pme-cloud-run@$PROJECT_ID.iam.gserviceaccount.com
```

**O padrão da casa é uma service account de deploy por repositório** (`sound-necklace-github-deployer`,
`facilit-desk-github-deployer`, …), todas assumidas pelo GitHub Actions via **Workload Identity Federation**
pela pool `github-actions-pool`, que já existe no projeto. Nenhuma delas tem chave JSON, e esta também não.

```sh
gcloud iam service-accounts list --project "$PROJECT_ID" --filter='email~deployer'
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

```sh
gcloud iam service-accounts create pme-github-deployer --project "$PROJECT_ID" --display-name "Project Management Ecosystem GitHub deployer"
gcloud iam service-accounts create pme-cloud-run       --project "$PROJECT_ID" --display-name "Project Management Ecosystem Cloud Run runtime"
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

O que deixa o GitHub Actions *ser* essa conta, sem chave, é a ligação da pool com o repositório — e só com este
repositório, pelo atributo `repository`:

```sh
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" --project "$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/$GITHUB_REPO"
```

A conta de runtime **não recebe papel nenhum no projeto**. O único acesso que ela ganha é ao segredo, na
próxima seção.

### 2.4 O segredo, e o acesso por segredo

O conteúdo é o `.env` que o contêiner carrega. Hoje é uma linha:

```sh
printf 'BACKEND_URL=https://tripod-backend-staging-f7ssqjozfq-uc.a.run.app\n' > /tmp/pme.env

gcloud secrets create "$SECRET_NAME" \
  --replication-policy=automatic \
  --data-file=/tmp/pme.env \
  --project "$SECRETS_PROJECT"

rm /tmp/pme.env
```

**O valor não é placeholder.** `src/services/api/source.ts` já liga a maior parte dos namespaces na API, e as rotas
`/api/shema/*` que eles chamam existem hoje só no `tripod-backend-staging` — o deploy da branch `dev` do
`shema-api`; o `tripod-backend` de produção responde 404 nelas. Quando o `shema-api` promover `dev` para `main`,
a troca é uma versão nova do segredo (abaixo), sem rebuild. E a variável nunca pode faltar: o entrypoint recusa
subir, de propósito (`CLAUDE.md` §8, FE-41).

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

> **Referência cross-project é pelo número do projeto.** O segredo mora em `shemaobt-secrets` e o serviço em
> outro projeto, e o Cloud Run quer `projects/<NÚMERO>/secrets/<nome>:latest` — é assim que o `shema-api` monta
> os dele. O workflow lê o número da variável de repositório `GCP_SECRETS_PROJECT_REF` e **falha no primeiro
> passo** se ela faltar:
>
> ```sh
> gcloud projects describe "$SECRETS_PROJECT" --format='value(projectNumber)'   # 384168199195
> gh variable set GCP_SECRETS_PROJECT_REF --body "$SECRETS_PROJECT_NUMBER"
> ```

### 2.5 Secrets e variables do GitHub

No repositório `shemaobt/project-management-ecosystem`:

Os mesmos três nomes que `sound-necklace`, `facilitator-desk` e `obt-mentor-companion` usam. **Não há
`GCP_SA_KEY`**: a identidade vem do token OIDC do job, trocado pela pool.

| Nome | Tipo | Valor |
|---|---|---|
| `GCP_PROJECT_ID` | secret | `gen-lang-client-0886209230` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | secret | `projects/718681737495/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions` |
| `GCP_WORKLOAD_IDENTITY_SERVICE_ACCOUNT` | secret | e-mail da service account de **deploy** (`$DEPLOY_SA`) |
| `CLOUD_RUN_RUNTIME_SA` | variable | e-mail da service account de **runtime** (`$RUNTIME_SA`) |
| `GCP_SECRETS_PROJECT_REF` | variable | `384168199195`, o número do `shemaobt-secrets` |

```sh
gh secret   set GCP_PROJECT_ID                        --body "$PROJECT_ID"
gh secret   set GCP_WORKLOAD_IDENTITY_PROVIDER        --body "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions"
gh secret   set GCP_WORKLOAD_IDENTITY_SERVICE_ACCOUNT --body "$DEPLOY_SA"
gh variable set CLOUD_RUN_RUNTIME_SA                  --body "$RUNTIME_SA"
gh variable set GCP_SECRETS_PROJECT_REF               --body "$SECRETS_PROJECT_NUMBER"
```

O primeiro passo do workflow (`Check required secrets`) falha com mensagem nomeada se qualquer um dos
obrigatórios estiver faltando. Falhar ali custa dez segundos; falhar no `gcloud run deploy` custa a leitura
de um log.

## 3. O primeiro deploy

1. Mergeie na `main`. **O primeiro deploy só acontece pelo merge**: o GitHub só aceita `workflow_dispatch` de
   um workflow que já exista na branch padrão (`workflow deploy.yml not found on the default branch`, confirmado
   em 02/out/2026). A partir do segundo, **Actions → Deploy (Cloud Run) → Run workflow** com `image_tag`
   **vazio** também serve; disparado de uma branch que não é `main`, constrói e faz deploy **daquela branch** —
   é como se valida uma mudança de infraestrutura antes de mergear, e é mais uma razão para o serviço não ser
   público.
2. O que esperar ver, em ordem: `Required secrets and variables are set.` → `Target tag: <sha>` → build e push
   da imagem → `gcloud run deploy` criando a revisão → `https://... answers 200.` →
   `.../api/shema/session is answered by the backend rather than by the page.` → `Deployed to: https://...` e o
   mesmo bloco no *summary* do job.
3. Abra a URL no browser. Tem de servir a tela de entrada do app sem pedir conta Google.
4. Confira que a revisão está com o segredo montado e pública:

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
     --port 8080 --allow-unauthenticated \
     --service-account "$RUNTIME_SA" \
     --set-secrets "/run/secrets/.env=projects/$SECRETS_PROJECT/secrets/$SECRET_NAME:latest" \
     --memory 256Mi --cpu 1 --concurrency 80 --timeout 60
   ```

   Repetir a linha inteira não é enfeite: sem `--set-secrets` e sem `--service-account` a revisão nova pode
   sair sem o que a anterior tinha. Cole o comando como está.

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
| `PERMISSION_DENIED` ao acessar o segredo, ou a revisão falha citando Secret Manager | Falta `secretAccessor` **naquele segredo** para a SA de runtime, ou `GCP_SECRETS_PROJECT_REF` carrega um número que não é o do `shemaobt-secrets` | §2.4 — o binding, e a variável |
| `Google Auth` falha com `unable to generate Google Cloud federated token` ou `PERMISSION_DENIED` em `iam.serviceAccounts.getAccessToken` | A pool não reconhece este repositório, ou o binding `workloadIdentityUser` da SA de deploy não cobre `attribute.repository/shemaobt/project-management-ecosystem` | O último comando do §2.3 |
| `denied: Permission "artifactregistry.repositories.uploadArtifacts" denied` no push | SA de deploy sem `artifactregistry.writer`, ou o repositório não existe na região | §2.2 e §2.3 |
| `Permission 'iam.serviceaccounts.actAs' denied on service account` | Falta `iam.serviceAccountUser` da SA de deploy **sobre a SA de runtime** | O terceiro comando do §2.3 |
| `The user-provided container failed to start and listen on the port defined by the PORT environment variable` | Porta. O nginx desta imagem escuta **8080 fixo** (`nginx.conf`) e o workflow manda `--port 8080` | Não mude o `--port` sem mudar o `nginx.conf` junto; se mudou, reverta |
| `Verify the service is publicly reachable` falha com 403 | `--allow-unauthenticated` não conseguiu ligar `allUsers` a `run.invoker` e o `gcloud run deploy` **saiu 0 mesmo assim** — foi o que custou um deploy ao `sound-necklace` | A SA de deploy precisa de `roles/run.admin`; `run.developer` não tem `run.services.setIamPolicy`. Confira os papéis do §2.3 |
| `Verify the service is publicly reachable` falha dizendo que `/api` devolveu o HTML do app | O `BACKEND_URL` não chegou à revisão e o `/api` caiu no fallback da SPA | Mesma trilha da primeira linha desta tabela: §2.4 e o `--set-secrets` |
| `image_tag '...' has characters an Artifact Registry tag cannot carry` | Digitação no input do rollback | Cole o SHA de `gcloud artifacts docker images list` |
| `A rollback names an immutable tag, never 'latest'` | `image_tag=latest` no rollback | `latest` anda a cada merge: a revisão que ele deployaria hoje não é a que deployaria amanhã, e o serviço deixa de dizer o que está rodando. Use o SHA |

## 6. Acesso: auditar e fechar

```sh
# quem alcança hoje — o esperado é um único binding, allUsers em roles/run.invoker
gcloud run services get-iam-policy "$SERVICE" --region "$REGION" --project "$PROJECT_ID"

# fechar o serviço, se a decisão do §1 for revertida
gcloud run services remove-iam-policy-binding "$SERVICE" --region "$REGION" --project "$PROJECT_ID" \
  --member="allUsers" --role="roles/run.invoker"
```

Fechar pelo comando acima sem trocar a flag do workflow dura até o próximo deploy: `--allow-unauthenticated`
recoloca o `allUsers`. A troca é no workflow primeiro (§1), e o teste de contrato acompanha.

Quando o domínio próprio chegar (fora do escopo da FE-42), o caminho para restringir sem pedir `gcloud` de
ninguém é HTTPS Load Balancer na frente com IAP ligado — é o que o §1 original desta página desenhava.
