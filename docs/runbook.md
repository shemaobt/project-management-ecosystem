# Runbook de produção — console do Ecossistema Shemá

Escrito na INT-12 ([OBT-417](https://linear.app/shema-obt/issue/OBT-417)) para quem **opera** o console depois do lançamento.
Quem lê isto às 22:00 provavelmente não escreveu o código, então tudo aqui está na ordem em que vai ser preciso.

O deploy do console (Cloud Run, Artifact Registry, IAM, segredo) tem o seu próprio runbook em `docs/deploy.md`, que chega com a FE-42 ([OBT-384](https://linear.app/shema-obt/issue/OBT-384)).
Este arquivo **não repete** aquele: ele cobre o sistema inteiro (console mais `shema-api`) e o que fazer quando um dado parece errado ou vazado.

> **Estado em 9/nov/2026.** A passada adversarial de privacidade da INT-12 foi feita na bancada `qa-e2e` em 6/nov/2026 (Rastro), junto com os roteiros da §6 (Prumo); o resultado está na §9.
>
> - Os bloqueios de 1/out estão fechados: [OBT-551](https://linear.app/shema-obt/issue/OBT-551) e [OBT-552](https://linear.app/shema-obt/issue/OBT-552) (Done em 2/out). Na passada, os ids de projeto sensível já são UUID e não nomeiam o lugar; o resíduo do 551 é o A-07, Baixo (§9).
> - Os dois bloqueios novos da passada estão corrigidos **e remedidos na bancada** em 6/nov: o A-02, [OBT-688](https://linear.app/shema-obt/issue/OBT-688) (shema-api#1021), e o A-03, [OBT-689](https://linear.app/shema-obt/issue/OBT-689) (shema-api#1020).
> - O deploy do console existe desde a FE-42 ([OBT-384](https://linear.app/shema-obt/issue/OBT-384), Done em 2/out). **Se ele já roda com dados reais: confirmar** — este arquivo não tem fonte para dizer.
> - **Pendente:** a lista de acesso de produção (§7) **ainda não foi revista**. É do Daniel e do Levi, e é o que segura a [OBT-417](https://linear.app/shema-obt/issue/OBT-417).

## 1. O que está no ar e onde

| Peça | Onde | Quem faz o deploy |
|---|---|---|
| Console (este repositório) | Cloud Run `project-management-ecosystem`, `us-central1`, **público** desde 2/out/2026 (`--allow-unauthenticated`; decisão do Henok, `docs/deploy.md` §1): quem decide o que cada um lê é o login do app | merge na `main` → `.github/workflows/deploy.yml` (FE-42) |
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
2. **Descubra até onde foi.** Use `shema_exports` para as exportações, o painel de avisos de quem recebeu e os logs da API, que registram ids e regiões e nunca conteúdo (medido na passada de 6/nov: só ids, região e operação; nenhum nome, lugar, e-mail, token ou senha). **Os logs de requisição do Cloud Run e do balanceador são outra coisa**: eles gravam a URL inteira, e ela carrega a busca (`?q=`) e o token de **todo link que leva token na URL**. Em 9/nov/2026 eram estas famílias, cada uma com a página e a rota da API; trate a lista como ponto de partida, não como garantia de que não há outra:

   - **Console (este repositório):** o link do líder (`/intake/{token}`, `/api/shema/intake/{token}`), a saída do intercessor (`/leave/{token}`, `/api/shema/intercessors/leave/{token}`) e o convite (`/convite?token=`, `/api/shema/access/invites/{token}`).
   - **Formulário de recursos:** o link de solicitação (`/solicitar/{token}`, `/api/resource-requests/link/{token}`), o endosso do líder de base (`/endossar/{token}`, `/api/resource-requests/endorse/{token}` e `…/verify`) e o convite (`/api/resource-requests/access/invites/{token}` e `…/accept`).

   Ver §9.2.
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
| OBT Lab | Abrir Projetos e a ficha de um projeto sensível, e a aba Recursos dela | o `location` vem como a região, e `team`/base vem vazio; em `GET /api/resource-requests/projects/{id}/requests`, o `reg_name` vem como *Projeto sensível — {região}* e `started_by_name` vem nulo ([OBT-688](https://linear.app/shema-obt/issue/OBT-688)). Ainda chegam nomes de pessoa (`teamLeader` e outros): é o A-05, conhecido ([OBT-694](https://linear.app/shema-obt/issue/OBT-694) item 6) |
| Resource Circle | Abrir Oração, gerar um Pulso, cancelar, gerar de novo e salvar | `/prayer/requests` só traz pedidos `rede`, e projeto sensível aparece como *Projeto sensível — {região}*. A ficha **traz** os `health_*`: o Resource Circle lê tudo e não edita ([OBT-571](https://linear.app/shema-obt/issue/OBT-571); *"ver tudo"* é da Karina, via Daniel, 6/out/2026; que o *tudo* inclua a saúde é decisão do Daniel). Depois de *Salvar o Pulso* a tela não confirma nada (OBT-694 item 13) |
| Líder de base (pelo celular, sem conta) | Abrir o link do intake, preencher, fechar a aba no meio, voltar, enviar | `GET /intake/{token}` só traz o nome da língua; num projeto sensível, o nome redigido, e a tela diz *Conta o mês, Projeto sensível — {região}.* ([OBT-692](https://linear.app/shema-obt/issue/OBT-692)). O rascunho vive só na aba e some ao enviar. **O link é multiuso até expirar** (`docs/shema.md` do `shema-api`, §6.7 *Link tokens*): depois de enviar, ele abre de novo e aceita outra resposta, e a lista da coordenação o marca `used`. Quando o líder muda, **revogue o link** (decisão do Daniel, 9/nov/2026, na OBT-692) |
| Admin | Conceder e revogar um papel em Acesso | conceder um papel regional pede a região; revogar o último papel regional avisa que as regiões saem junto, e a conta passa a receber 403 |
| Coordenador regional | Importar um arquivo | a prévia aparece antes de aplicar, e nada é gravado até confirmar. **Só vê o botão Importar quem tem o papel de coordenador ou de Admin e escreve algum projeto** ([OBT-559](https://linear.app/shema-obt/issue/OBT-559), [OBT-593](https://linear.app/shema-obt/issue/OBT-593); `canImportProjects`). Um Admin sem região de escrita não vê o botão (medido em 6/nov). Um Admin que também é coordenador vê, e o admin da instalação que tem o papel de Admin também; sem nenhum dos dois papéis, a tela não mostra o botão e quem decide é o servidor. A frase `import_coordination_only` existe, mas nenhuma tela chega a ela (OBT-694 item 5) |
| Qualquer papel | Sair e entrar com outra conta no mesmo navegador | em DevTools → Application, depois de Sair **não existe** nenhuma destas chaves: `shema-projects-v1`, `shema-form-submissions-v1`, `shema-regions-v1`, `shema-filters-v1`, `shema-record-drafts-v1`, `shema-saved-views-v1`, `shema-assessments-v1`, `shema-rhythm-drafts-v1` (Local Storage) e `shema-intercessors-v1` (Session Storage). As três de [OBT-693](https://linear.app/shema-obt/issue/OBT-693) entraram em 9/nov; antes elas sobravam, a primeira com a busca da conta anterior (R6b). `shema-last-reader-v1` também sai. Ficam o tema, a ordenação e a língua, sem dado de ninguém. Fica também `shema-notifications-v1`, que só o modo de exemplo grava. E fica o rascunho de intake de um líder (`shema-intake-draft-v2`, Session Storage), se a mesma aba tiver aberto um link: ele vive na aba, não na conta. Depois de Sair o endereço é `/`, sem a busca nem os filtros, e Projetos abre sem eles para a outra conta. **Fechar a aba sem Sair não dispara nada**: as chaves ficam até o próximo login, que as apaga se a conta for outra |

### 6.2 Rede ruim

Faça em DevTools → Network com **Slow 3G**, e depois **Offline**:

1. **Lenta:** abra Projetos e a ficha. Cada parte diz que está carregando e nenhuma mostra *"nenhum projeto"* antes da resposta.
2. **Interrompida no meio de um salvamento:** edite a ficha, clique em Salvar e passe para Offline antes da resposta. A tela diz que não salvou, e o rascunho continua lá.
3. **Offline e de volta:** com a ficha aberta, passe para Offline e depois Online, e salve. O salvamento chega uma vez só, e um conflito de versão (outra pessoa salvou no meio) aparece com quem mudou e o quê.
4. **Exportação longa:** exporte em Slow 3G e feche o diálogo. O download continua e um aviso diz quando terminou.
5. **Sino:** com a aba escondida, ele não consulta o servidor (nenhuma chamada a `/notifications` na aba Network); ao voltar, consulta uma vez.

Anote o resultado de cada roteiro na própria issue da INT-12, com o papel, a data e o que falhou.

**O que o Prumo mediu em 6/nov/2026** (bancada `qa-e2e`; `roteiros-0611.json`, casos N1–N5). O portal não emula rede, então a rede lenta foi um proxy que atrasa 4 s por requisição e limita a 20 KB/s, e o offline foi matar esse proxy. Não é o *Slow 3G* do DevTools: não simula perda de pacote.

| Roteiro | Resultado | Ressalva |
|---|---|---|
| 1. Lenta | Passou: o painel e a ficha ficam em *carregando* e nunca dizem *nenhum projeto* antes da resposta | a lista de Projetos em si não foi vista em *carregando* |
| 2. Interrompida | Passou: a tela diz que não salvou e o rascunho continua; o banco não mudou | a frase fala de *erro 500*, não de *sem conexão*, porque o proxy do Vite responde assim quando o destino some |
| 3. Offline e de volta | Passou: um PATCH só chega; o 409 mostra quem salvou e o quê | *Salvar de novo* grava por cima do outro editor; a escolha é de quem salva |
| 4. Exportação longa | Parcial: fechar o diálogo não para o download, e o aviso *Dados exportados.* aparece no fim | **o arquivo baixado não foi visto**: o portal não expõe downloads |
| 5. Sino | Passou: com a aba escondida, nenhuma chamada a `/notifications`; ao voltar, uma | a aba escondida foi simulada (`visibilityState`) |

**O que não foi medido:** o arquivo baixado (exportação e Pulso de Oração) e a **impressão** — o portal não emula impressão, então a Parte C impressa foi conferida só pelo CSS.

## 7. Lista de acesso de produção

> **Em 9/nov/2026 a revisão desta lista ainda não foi feita.** É do Daniel e do Levi, e é o item da [OBT-417](https://linear.app/shema-obt/issue/OBT-417) que falta.

**O IAM do Cloud Run não é mais a barreira.** O console é público desde 2/out/2026 (`docs/deploy.md` §1). A regra que vinha aqui era a do primeiro deploy, da mesma data: IAM nomeado, nunca `allUsers`, o workflow reprovando. Hoje o workflow confere o contrário: a URL responde sem credencial. Para voltar a fechar, siga `docs/deploy.md` §1.

**O acesso aos dados vem dos papéis no PME**: quem tem cada papel, e em que regiões. O Admin concede (§5.12 do `CLAUDE.md`), e a API recusa o que o papel não alcança. **Qual lista a OBT-417 espera — os papéis no PME de produção, as contas de deploy do `docs/deploy.md`, ou as duas — é a confirmar com o Daniel e o Levi.** Para qualquer uma, a regra continua:

- **Lista pequena**: quem opera, não quem *talvez* precise;
- **Revisada a cada lançamento**: quem saiu da equipe perde o papel no mesmo dia.

## 8. Pendências conhecidas

**As pendências de 2/out/2026 estão fechadas**, todas Done no Linear (conferido em 9/nov/2026):

| Issue | O quê |
|---|---|
| [OBT-551](https://linear.app/shema-obt/issue/OBT-551) | Criar projeto revelava se um slug existia fora do escopo (resíduo: A-07, §9) |
| [OBT-552](https://linear.app/shema-obt/issue/OBT-552) | O id de um projeto sensível nomeava o lugar |
| [OBT-553](https://linear.app/shema-obt/issue/OBT-553) | A saúde chegava à Resource Circle — depois revisto pela [OBT-571](https://linear.app/shema-obt/issue/OBT-571), que dá ao Resource Circle a leitura de tudo (§6.1) |
| [OBT-554](https://linear.app/shema-obt/issue/OBT-554) | O aviso de oração usava o consentimento antigo |
| [OBT-555](https://linear.app/shema-obt/issue/OBT-555) | Respostas por leitor sem `no-store` no módulo `shema` |
| [OBT-556](https://linear.app/shema-obt/issue/OBT-556) | Achados menores do servidor |
| [OBT-557](https://linear.app/shema-obt/issue/OBT-557) | As telas que liam a lista inteira |
| [OBT-558](https://linear.app/shema-obt/issue/OBT-558) | Rascunho do intake e filtros com texto livre no navegador |
| [OBT-559](https://linear.app/shema-obt/issue/OBT-559) | Botão Importar só para a coordenação; avisos na língua do leitor |
| [OBT-384](https://linear.app/shema-obt/issue/OBT-384) | Deploy do console (FE-42) |

**O que a passada de 6/nov deixou está em [OBT-694](https://linear.app/shema-obt/issue/OBT-694)**, uma issue de pacote com 13 itens: cada um vira issue própria quando alguém o pegar. Dois deles, por tocarem o cache:

- **Os envelopes de erro de `/api/shema` não mandam `Cache-Control`** — decisão documentada do módulo (`_deps.py`, `_no_store`), do Levi (item 8).
- **`/api/auth/login`, `/api/auth/me` e `/api/auth/my-roles` não mandam `Cache-Control`** — rotas do Levi; Baixo, porque `/me` devolve só a própria conta (item 10).

E a [OBT-692](https://linear.app/shema-obt/issue/OBT-692) (o nome no link de intake de projeto sensível) está mergeada nos dois repositórios, mas ainda não foi remedida na bancada.

## 9. Resultado da passada de 6/nov/2026

Rastro (passada adversarial, `qa-e2e/execucao/adversarial-0611.md`) e Prumo (roteiros da §6, `roteiros-0611.json`), contra shema-api `dev` `6da89534`, PME `6b58272` e Formulário `1b01eba`. A varredura leu 1683 respostas GET de 11 papéis, procurando marcadores reais tirados do banco.

**Contagem ao fim da remedição de 6/nov: 0 bloqueio · 0 alto · 3 médio · 4 baixo · 2 nota · 1 desenho.** A passada abriu com 1 bloqueio · 0 alto · 4 médio · 3 baixo · 2 nota · 1 desenho (cabeçalho do relatório). Na remedição, o A-02 fechou e o resto do A-03 desceu a Baixo. A tabela do relatório nomeia só dois achados Baixo (A-07 e A-08) contra os três do cabeçalho; a diferença está na fonte e não foi resolvida aqui.

### 9.1 Os achados

| id | O quê | Situação |
|---|---|---|
| A-01 | O pedido inteiro de projeto sensível chega à mesa, ao Gestor e ao Admin | **Desenho**: [OBT-571](https://linear.app/shema-obt/issue/OBT-571) e [OBT-568](https://linear.app/shema-obt/issue/OBT-568) |
| A-02 | O OBT Lab lia o nome do pedido e de quem o iniciou, em projeto sensível | **Fechado e remedido** em 6/nov: [OBT-688](https://linear.app/shema-obt/issue/OBT-688) |
| A-03 | `/api/resource-requests/*` sem `Cache-Control` | **Fechado e remedido** para o prefixo (72 respostas, todas `private, no-store`): [OBT-689](https://linear.app/shema-obt/issue/OBT-689). Resta `/api/auth/*`, Baixo (OBT-694 item 10) |
| A-04 | O link de intake de projeto sensível entregava o nome da língua | Corrigido pela [OBT-692](https://linear.app/shema-obt/issue/OBT-692), depois da passada; **não remedido** |
| A-05 | Nome de pessoa de projeto sensível chega ao OBT Lab | Médio · OBT-694 item 6 |
| A-06 | `POST /api/auth/signup` diz se um e-mail tem conta | Médio · OBT-694 item 7 |
| A-07 | Um 409 confirma a existência de um id que quem pergunta já tenha | Baixo · ids são UUID desde a OBT-552 |
| A-08 | `project_hint` do link de solicitação, texto livre do Admin, aparece na página pública | Baixo · OBT-694 item 9 |
| A-09 | Um 422 ecoa ao próprio autor o valor que ele enviou | Nota |
| A-10 | O e-mail de chegada mostra a chave interna `triagem` | Nota · OBT-694 item 13 |

### 9.2 O que depende de staging ou produção e não deu para medir

- **Logs de requisição do Cloud Run e do balanceador.** Gravam a URL completa, com a busca (`?q=`) e o token de todo link que leva token na URL (as famílias da §5, item 2). Na bancada só a instrumentação dela mostra isso. **Falta conferir no staging o que esses logs guardam e quem os lê.**
- **E-mails antigos:** a bancada guarda só as últimas 500 mensagens.
- **Mídia e anexos:** a bancada não tem bucket; só as guardas antes do arquivo foram medidas.
- **Projeto nascido de pedido aprovado:** não se mediu se um local em país sensível levanta a marca de sensível.
- **Ataques de tempo e limite de requisições**, fora do código do link.
