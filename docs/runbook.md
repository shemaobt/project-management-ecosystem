# Runbook de produção — console do Ecossistema Shemá

Escrito na INT-12 ([OBT-417](https://linear.app/shema-obt/issue/OBT-417)) para quem **opera** o console depois do lançamento.
Quem lê isto às 22:00 provavelmente não escreveu o código, então tudo aqui está na ordem em que vai ser preciso.

O deploy do console (Cloud Run, Artifact Registry, IAM, segredo) tem o seu próprio runbook em `docs/deploy.md`, que chega com a FE-42 ([OBT-384](https://linear.app/shema-obt/issue/OBT-384)).
Este arquivo **não repete** aquele: ele cobre o sistema inteiro (console mais `shema-api`) e o que fazer quando um dado parece errado ou vazado.

> **Estado em 1/out/2026: o console ainda não está em produção.** A FE-42 está em revisão e há dois bloqueios de privacidade no servidor ([OBT-551](https://linear.app/shema-obt/issue/OBT-551), [OBT-552](https://linear.app/shema-obt/issue/OBT-552)). Não suba o console com dados reais antes de os dois fecharem.

## 1. O que está no ar e onde

| Peça | Onde | Quem faz o deploy |
|---|---|---|
| Console (este repositório) | Cloud Run `project-management-ecosystem`, `us-central1`, **não público** (IAM) | merge na `main` → `.github/workflows/deploy.yml` (FE-42) |
| API de produção | Cloud Run `tripod-backend`, `us-central1` | merge na `main` do `shema-api` → `deploy.yml` |
| API de staging | Cloud Run `tripod-backend-staging` | merge na `dev` do `shema-api` → `deploy-staging.yml` |
| Banco | Neon Postgres, **compartilhado por seis aplicações** | migration roda no deploy da API, antes da revisão nova |

**O ponto que mais pesa num rollback:** o deploy da API roda `alembic upgrade head` contra o banco **antes** de subir a revisão nova. Voltar a revisão do Cloud Run não volta o banco.

## 2. Rollback

### 2.1 Console

Siga `docs/deploy.md` (FE-42): o rollback é troca de tráfego para uma revisão anterior, marcada pelo SHA do commit, sem rebuild.

Depois de estabilizar, **devolva o tráfego para a revisão mais nova**. Sem isso, cada merge seguinte sobe uma revisão que não recebe tráfego, mesmo com o workflow verde.

### 2.2 API

1. **Volte só o código, se a migration da versão ruim for aditiva** (coluna nova, tabela nova). A revisão anterior ignora o que não conhece.
   ```sh
   gcloud run revisions list --service tripod-backend --region us-central1
   gcloud run services update-traffic tripod-backend --region us-central1 --to-revisions=<REVISAO>=100
   ```
2. **Se a migration removeu ou renomeou algo**, a revisão anterior quebra contra o banco novo. Não faça `downgrade` às pressas: o banco é de seis aplicações. Corrija para a frente (um commit que restaure a compatibilidade) e chame quem escreveu a migration.
3. **Depois de estabilizar:** `gcloud run services update-traffic tripod-backend --region us-central1 --to-latest`.

O `migrations.yml` do `shema-api` prova em todo PR que cada migration sobe e desce (`downgrade -1`). Mesmo assim, um `downgrade` em produção é decisão de quem escreveu a migration, nunca de quem está de plantão.

## 3. A quem chamar

| Assunto | Quem | Por quê |
|---|---|---|
| Módulo Shemá no `shema-api`, escopo de região, redação, deploy da API e do console | Levi | autor do `_scope.py`, do `_redaction`, da FE-42 e das BE do Shemá |
| Integrações do console (sino, exportação, importação, oração), formulário de recursos | Daniel | autor das INT-06, INT-11 e INT-12 |
| Decisão sobre dado de pessoa (o que pode sair, quem pode ver) | Karina, via Daniel | é ela quem decide pelo cliente; **nunca registre uma decisão nossa como dela** |

> **Contatos e plantão: a preencher pela equipe.** Este arquivo não inventa telefone nem horário de ninguém. Preencha aqui, no mesmo commit em que combinarem.

## 4. Conferências de integridade

Todas são **leitura** e rodam contra o banco com uma conta só de leitura. Rode depois de um deploy da API, de uma importação grande ou de qualquer suspeita.

### 4.1 Países sensíveis

```sql
-- Projetos sensíveis: confira que nenhum id carrega o nome do lugar (OBT-552).
SELECT id, region_key, location, team
FROM shema_projects
WHERE sensitive_country
ORDER BY id;
```

**O que é normal:** o `id` não diz o lugar, e o `location`/`team` só aparecem aqui, para quem tem acesso ao banco.

**O que é alarme:** um `id` com nome de país, cidade ou base.

### 4.2 Pedidos de oração

```sql
-- Pedidos com texto e sem autorização para a rede: nunca devem estar num Pulso.
SELECT id, prayer_visibility
FROM shema_projects
WHERE prayer_requests <> '' AND prayer_visibility IS DISTINCT FROM 'rede';

-- O que cada exportação levou, e quem a pediu.
SELECT created_at, exported_by_name, scope_key, format, project_count, withheld_count
FROM shema_exports
ORDER BY created_at DESC
LIMIT 50;
```

`shema_exports.request_ids` guarda os ids dos pedidos autorizados que entraram em cada arquivo. Se um pedido aparecer ali sem estar autorizado hoje, siga para a seção 5.

### 4.3 O console não carrega dado de exemplo

```sh
npm run build && npm run check:bundle
```

O CI roda isso em todo PR. Se falhar, **não suba**: os 127 projetos de exemplo são pessoas reais em lugares reais (§6 do `CLAUDE.md`).

## 5. Se um dado parece errado ou vazado

1. **Pare a saída, não o sistema.** Se um caminho específico vaza (uma rota, a exportação, o Pulso, um aviso), corrija ou desligue **esse caminho**. Derrubar tudo esconde o problema e tira a ferramenta de quem precisa dela.
2. **Descubra até onde foi.** Use `shema_exports` para as exportações, o painel de avisos de quem recebeu e os logs da API, que registram ids e regiões e nunca conteúdo.
3. **Não apague evidência.** O histórico de edições (`shema_record_edits`) e o registro de exportações são o que permite dizer o que saiu.
4. **Avise quem decide.** Dado de pessoa que saiu é decisão da Karina, via Daniel: quem avisar, e se a equipe do projeto precisa saber.
5. **Abra uma issue no Linear com `OBT-###`**, com o caminho, o período e quantas pessoas foram afetadas, sem copiar o dado vazado.

> **Um Pulso enviado não se recolhe.** Retirar a autorização afeta só os próximos (§5.5 do `CLAUDE.md`). Num vazamento por Pulso, o passo 4 é o principal.

## 6. Roteiros de verificação antes do lançamento

Quem tem as contas do staging executa estes roteiros. Para cada passo, abra o DevTools na aba **Network** e confira a **resposta**, não a tela.

### 6.1 Por papel

| Papel | Tarefa | O que conferir na rede |
|---|---|---|
| Coordenador regional | Abrir Projetos, filtrar pela própria região, abrir a ficha de um projeto sensível, editar o status, salvar | `GET /api/shema/projects` só traz projetos da região dele; a ficha de um projeto sensível de **outra** região responde 404 |
| OBT Lab | Abrir Projetos e a ficha de um projeto sensível | o `location` vem como a região, e `team`/base vem vazio |
| Resource Circle | Abrir Oração, gerar um Pulso, cancelar, gerar de novo e salvar | `/prayer/requests` só traz pedidos `rede`; nenhum `health_*` na ficha (hoje vem, [OBT-553](https://linear.app/shema-obt/issue/OBT-553)) |
| Líder de base (pelo celular, sem conta) | Abrir o link do intake, preencher, fechar a aba no meio, voltar, enviar | `GET /intake/{token}` só traz o nome da língua; depois de enviar, o link não abre de novo |
| Admin | Conceder e revogar um papel em Acesso; importar um arquivo | a prévia aparece antes de aplicar; quem não é coordenação vê a frase de que a importação é da coordenação |
| Qualquer papel | Sair e entrar com outra conta no mesmo navegador | em DevTools → Application → Local Storage, nenhuma chave `shema-projects-v1`, `shema-form-submissions-v1` ou `shema-regions-v1` com dados do usuário anterior |

### 6.2 Rede ruim

Faça em DevTools → Network com **Slow 3G**, e depois **Offline**:

1. **Lenta:** abra Projetos e a ficha. Cada parte diz que está carregando e nenhuma mostra *"nenhum projeto"* antes da resposta.
2. **Interrompida no meio de um salvamento:** edite a ficha, clique em Salvar e passe para Offline antes da resposta. A tela diz que não salvou, e o rascunho continua lá.
3. **Offline e de volta:** com a ficha aberta, passe para Offline e depois Online, e salve. O salvamento chega uma vez só, e um conflito de versão (outra pessoa salvou no meio) aparece com quem mudou e o quê.
4. **Exportação longa:** exporte em Slow 3G e feche o diálogo. O download continua e um aviso diz quando terminou.
5. **Sino:** com a aba escondida, ele não consulta o servidor (nenhuma chamada a `/notifications` na aba Network); ao voltar, consulta uma vez.

Anote o resultado de cada roteiro na própria issue da INT-12, com o papel, a data e o que falhou.

## 7. Lista de acesso de produção

Responsável: quem executa o setup da FE-42. A tabela de pessoas fica em `docs/deploy.md`, e a regra é:

- **IAM nomeado**: uma conta por pessoa, nunca `allUsers` ou `allAuthenticatedUsers` (o próprio workflow reprova);
- **Lista pequena**: quem opera, não quem *talvez* precise;
- **Revisada a cada lançamento**: quem saiu da equipe sai da lista no mesmo dia.

O acesso **aos dados** é outra camada: ele vem dos papéis no PME (Admin concede, §5.12 do `CLAUDE.md`), e a API recusa o que o papel não alcança. O IAM do Cloud Run só decide quem chega à página.

## 8. Pendências conhecidas

Todas estão no Linear, com dono:

| Issue | O quê | Dono |
|---|---|---|
| [OBT-551](https://linear.app/shema-obt/issue/OBT-551) | **Bloqueio:** criar projeto revela se um slug existe fora do escopo | Levi |
| [OBT-552](https://linear.app/shema-obt/issue/OBT-552) | **Bloqueio:** o id de um projeto sensível nomeia o lugar | Levi |
| [OBT-553](https://linear.app/shema-obt/issue/OBT-553) | A saúde chega à Resource Circle pela ficha e pelo card | Levi |
| [OBT-554](https://linear.app/shema-obt/issue/OBT-554) | O aviso de oração usa o consentimento antigo | Levi |
| [OBT-555](https://linear.app/shema-obt/issue/OBT-555) | Respostas por leitor sem `no-store` | Levi |
| [OBT-556](https://linear.app/shema-obt/issue/OBT-556) | Achados menores do servidor (avisos guardados, 409, escopo da equipe, facetas, 422, texto livre, intercessores) | Levi |
| [OBT-557](https://linear.app/shema-obt/issue/OBT-557) | As telas que liam a lista inteira passam a ler a busca do servidor; resta o cálculo local do Ritmo, dos indicadores e do relatório anual | Daniel |
| [OBT-558](https://linear.app/shema-obt/issue/OBT-558) | Rascunho do intake e filtros com texto livre no navegador | Daniel |
| [OBT-559](https://linear.app/shema-obt/issue/OBT-559) | Botão Importar para todos os papéis; avisos de projeto em inglês | Levi |
| [OBT-384](https://linear.app/shema-obt/issue/OBT-384) | Deploy do console (FE-42) | Levi |
