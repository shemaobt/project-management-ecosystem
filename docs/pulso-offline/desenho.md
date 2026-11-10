# Pulso Mensal offline — desenho (OBT-691)

**Estado: 10/nov/2026. Desenho, não código.** Este documento cobre a ponta que falta do Pulso Mensal: a coordenação gera o
formulário do projeto, o líder o preenche no celular sem internet, e o arquivo volta com os dados
embutidos para o PME importar ([OBT-687](https://linear.app/shema-obt/issue/OBT-687)).

**Fontes:**
- um levantamento do código de 10/nov (PME em `e02e297`, shema-api `dev` em `fe2f9294`), com um build de medição;
- a leitura da API do lado do shema-api (10/nov);
- `docs/data-contracts.md` §5.7, §9.9 e §11.3;
- o protótipo `DS-PROJECT/modals.jsx` (`generateFieldFormHTML`);
- o teste local do protótipo desta pasta (§10).

Cada linha diz de quem é. Há três tipos:
- **Decidido**, com o dono e a data;
- **Proposto**, nosso e com recomendação, para o Daniel decidir;
- **A provar no aparelho**, que só o teste no Android responde.

Nada aqui é da Karina, a não ser onde está escrito que é.

---

## 1. O que já está decidido

| | Decisão | De quem |
|---|---|---|
| D1 | **O que sai é `.html`** — o formulário do Pulso Mensal é um arquivo `.html` | GATE-03; a escolha foi delegada a nós (3.5) e o teste de campo com a Karina, 2–8/nov/2026, fechou ([OBT-389](https://linear.app/shema-obt/issue/OBT-389), `data-contracts.md` §11.3) |
| D2 | **O que volta é o mesmo `.html`, com a resposta estruturada embutida num bloco JSON com versão**; o PME lê, valida e aplica esse bloco; nenhum `.json` solto ao lado; a leitura mora num lugar só | **Nosso** — Daniel, 9/nov/2026 (§11.3). A validar com um arquivo real |
| D3 | **O Pulso devolvido é guardado para sempre** (*"faz parte da história do projeto"*), e um pedido de oração com autorização retirada é apagado do Pulso guardado quando o texto é exatamente igual | Karina, 22/set (3.2), 1/out (3b), 6/out (10b) |
| D4 | **Uma imagem por Pulso, com descrição e autorização de uso**; JPEG, PNG ou WebP; teto de 10 MiB; bucket privado | Karina, via Daniel, 6/out (a imagem, a descrição e a autorização); o resto é do Daniel, 8/out ([OBT-578](https://linear.app/shema-obt/issue/OBT-578)…582) |
| D5 | **Voz: basta escrever.** O campo `voice` continua texto (`longText`, 4000); **nada de gravação de áudio neste ciclo** — nem na página, nem pelo gravador do celular, nem no pedido de oração | **Daniel, 10/nov/2026** |
| D6 | **O rascunho offline fica guardado no celular**, com chave por **projeto e período**, e com um botão para **apagar o rascunho**. Contraria a [OBT-558](https://linear.app/shema-obt/issue/OBT-558) (rascunho só na aba, por causa do celular emprestado) **só para o arquivo offline**; o link online continua em `sessionStorage` | **Daniel, 10/nov/2026** |
| D7 | As perguntas são as da definição do servidor (`PULSE_FIELDS`, `app/utils/shema_forms.py`), validadas contra a versão que o líder viu (`definitionVersion`); um campo fora da definição é recusado inteiro | BE-12 ([OBT-401](https://linear.app/shema-obt/issue/OBT-401)), no `dev` |
| D8 | `POST /forms/submissions` **arquiva e aplica na mesma chamada** (`file_submission`: *"File an answer… and apply it in one call"*), com `If-Match`; num 409 a resposta fica arquivada e sem aplicar, e se aplica de novo pelo `/{id}/import`, o passo do envelope que veio pelo link. A importação é idempotente e transacional; o envelope é arquivado byte a byte; o aplicar passa pela ficha com `If-Match`, e o 409 é o da ficha | BE-12 e [OBT-652](https://linear.app/shema-obt/issue/OBT-652) parte A, no `dev` e no `main` |

**O que D5 muda em relação ao protótipo.** O protótipo aprovado (`generateFieldFormHTML`) tem um
botão *"Tocar para gravar · até 5 minutos"* e *"Gravar pedido em áudio · até 2 min"*, e a issue
fala em *"gravação de voz"* citando as SHM-07.x canceladas. Com D5, essas duas superfícies **não
entram**; a pergunta 01 fica com a caixa de texto que o protótipo já tem (*"ou prefere escrever?"*).
É uma divergência do protótipo decidida pelo Daniel, e vai com a tela construída para a Karina ver.

## 2. O fluxo, de ponta a ponta

1. **Gerar.** Na ficha (ou no hub de Formulários), a coordenação pede o Pulso do mês.
   - O PME chama `POST /api/shema/forms/pulse/{projectId}` (§7), recebe a definição e o cabeçalho do arquivo, e monta o `.html` no navegador (§3).
   - A coordenação salva o arquivo e manda ao líder pelo WhatsApp.
2. **Preencher.** O líder abre o arquivo **no Chrome**, sem internet, e responde.
   - O rascunho fica no celular (§4).
   - Ele escolhe uma foto, que é reduzida ali mesmo (§5).
3. **Devolver.** *Salvar o arquivo* gera o mesmo `.html`, agora com o bloco de respostas preenchido e a foto embutida (§6).
   - O arquivo vai para Downloads, ou para o menu de compartilhar, onde o aparelho deixar.
   - O líder manda o arquivo à coordenação pelo WhatsApp, como documento.
4. **Receber.** No *Receber atualização* ([OBT-687](https://linear.app/shema-obt/issue/OBT-687)), a coordenação sobe o arquivo.
   - O PME lê os blocos sem executar o arquivo (§8).
   - Sobe a foto por uma porta autenticada (§5.3).
   - Mostra as respostas lidas do bloco **antes de enviar**, para a coordenação ver o que vai entrar (P8).
   - Entrega o bloco de respostas, verbatim, a `POST /api/shema/forms/submissions`, com `If-Match`. **Essa chamada arquiva e aplica de uma vez** (D8).
5. **Se a ficha mudou no meio.** O 409 deixa a resposta arquivada e sem aplicar, e ela aparece na caixa. Aplicar de novo é o caminho da [OBT-652](https://linear.app/shema-obt/issue/OBT-652) parte A (`POST /forms/submissions/{id}/import`, com o `ETag` da recusa). Essa porta já existe e não muda.

**Nenhum token viaja no arquivo.** A volta é sempre pela porta autenticada da coordenação. É isso
que mantém fora deste desenho a superfície do Levi (`_deps.py`, `_scope.py`, `session.py`,
`auth.py`, `access_control.py`, `tokens/`): do lado da API, ficou confirmado que nada ali precisa ser editado
enquanto o arquivo não carregar token.

## 3. O conteúdo do `.html`

Um documento só, sem nenhum recurso de fora. A estrutura proposta:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:">
  <title>Pulso Mensal · {nome de saída} · {AAAA-MM}</title>
  <style id="shema-style">…</style>
  <script type="application/json" id="shema-pulso-def">{definição + cabeçalho}</script>
  <script type="application/json" id="shema-pulso" data-format-version="1">null</script>
  <script type="application/json" id="shema-pulso-media">{}</script>
</head>
<body>
  <main id="root">Abra este arquivo com o Chrome.</main>
  <script id="shema-app">…o formulário, em um script clássico…</script>
</body>
</html>
```

- **`shema-pulso-def`** é o que a rota devolve (§7):
  - `projectId`, `kind`, `definitionVersion` e `fields`;
  - o nome de saída do projeto (`languageName`, `languageNameWithheld`, `locationWithheld`);
  - `period`, o mês para o qual o arquivo foi gerado, já preenchido e editável pelo líder;
  - `generatedAt`.
- **`shema-pulso`** nasce `null` e é o bloco que volta (§6).
- **`shema-pulso-media`** nasce `{}` e leva a foto, em base64, endereçada pelo hash (§5).
- **`shema-app`** é o formulário. Ele precisa ser um **script clássico, inline**, porque é ele mesmo que se recopia no arquivo de volta (lido por `textContent`).
- **A CSP proíbe toda rede.** Um arquivo que circula no WhatsApp não chama nada, nem por engano.

**Proposto (P1): o formulário é o mesmo React da página do líder, num build próprio.** O levantamento mediu:
- um build de arquivo único com `IntakeShell` + `IntakeFormView` dá **726 KB** (223 KB com gzip);
- desses, cerca de **209 KB são os dois catálogos inteiros do i18n**.

Recomendação:
- **(a) uma segunda entrada no Vite**, com `vite-plugin-singlefile`. O build do console não muda.
- **(b) só as chaves que o formulário usa**, geradas no build: `intake_*`, `forms_q_*`, `BookTable`, `PrayerConsent`. Estimativa de 300–400 KB, ainda a construir.
- **(c) fonte do sistema.** Os `woff2` relativos quebram em `file://`, e embutir os dois Montserrat custaria ~165 KB.
- **(d) a mesma validação do cliente** (`validateIntakeAnswers`) e a mesma redução de foto (`prepareIntakeImage`), que funcionam sem rede. A redução ganha o fallback para JPEG da P9 (§5.1).

A alternativa é um formulário à mão, em JS puro, como o protótipo desta pasta (21 KB). Ele é menor,
mas seria uma segunda cópia das telas e da validação, e as duas iam divergir.

**O arquivo é gerado no navegador, não no servidor** — ver P3 (§7).

## 4. O progresso offline (D6)

- **As respostas** ficam em `localStorage`, na chave `shema-pulso:{projectId}:{period}`.
  - `period` é o do cabeçalho (o mês para o qual o arquivo foi gerado), não o que o líder digita.
  - Assim a chave existe antes de qualquer resposta.
- **A foto** fica em IndexedDB, na mesma chave. Uma foto reduzida em base64 cabe no `localStorage`, mas estoura a cota junto com outra.
- **O rascunho é gravado a cada mudança.** Abrir o arquivo de novo restaura o rascunho.
- Um arquivo **já devolvido** (com o bloco `shema-pulso` preenchido) abre mostrando as respostas de dentro dele, e não as do celular.
- **O botão *Apagar o rascunho deste celular*** remove as duas chaves, depois de uma confirmação que diz que o arquivo salvo continua em Downloads.
- **Proposto (P2): o rascunho não some sozinho ao salvar o arquivo.**
  - O líder pode salvar, perceber um erro e corrigir. Apagar sozinho perderia o trabalho.
  - O preço é o motivo da OBT-558: num celular emprestado, o rascunho fica até alguém apertar o botão.
  - A frase da tela diz isso.
- **A provar no aparelho:**
  - se `localStorage` e IndexedDB persistem num arquivo aberto do WhatsApp (`content://`) entre uma abertura e outra;
  - se dois arquivos de projetos diferentes, no mesmo celular, ficam separados. Ficam pela chave, mas a origem em `content://` é desconhecida.

## 5. A foto e o tamanho

### 5.1 No celular

- **Entrada:** `<input type="file" accept="image/jpeg,image/png,image/webp">`, **sem** `capture`. Assim o Android oferece câmera **e** galeria. O protótipo usava `capture`, que em alguns aparelhos força a câmera.
- **Redução antes de entrar:** a do PME (`prepareIntakeImage`, `src/services/mediaStorage.ts`), que hoje faz assim:
  - recusa pelo tipo antes de decodificar (JPEG, PNG, WebP);
  - reduz o lado maior a 1200px e codifica WebP 0,85;
  - checa o teto de 10 MiB **nos bytes que saem, depois da redução**, e não na foto de origem. A docstring diz que uma foto real nunca chega a esse teto.
- **Proposto (P9): um fallback de codificação.**
  - `toWebpBlob` pede `image/webp` ao `canvas.toBlob` e não tem fallback. Um navegador que não codifica WebP devolve PNG pela especificação (ou `null`, e aí a foto é recusada como ilegível), e PNG de 1200px é bem maior.
  - Medido localmente, num navegador headless WebKit: ele não codifica WebP.
  - O protótipo desta pasta já experimenta outra saída: quando o resultado não sai WebP, ele recodifica em JPEG 0,85. Esse JPEG e a recusa da foto de origem acima de 10 MiB são **do protótipo**, não do PME.
  - **Recomendação:** a I3 acrescenta o fallback para JPEG em `prepareIntakeImage`, que serve também o link online. Se o Chrome do Android codificar WebP, isso só importa noutros navegadores.
- **Tamanho típico:** 100–300 KB depois de reduzir, ou seja, 130–400 KB em base64.
  - No teste local, um PNG de 1600×1000 (134 KB) virou um JPEG de 71 KB (95 KB no bloco de mídia).
  - O tamanho de uma foto real de campo é **a provar no aparelho**.

### 5.2 No arquivo

- A foto vai em `shema-pulso-media`, como `{"sha256:<hex>": {"type": "image/webp", "b64": "…"}}`.
- A resposta `answers.image` leva a mesma referência, `"sha256:<hex>"`.
- **O hash é calculado em JS puro.** `crypto.subtle` pede contexto seguro, que ninguém garante em `content://`.
  - O protótipo traz um SHA-256 de ~40 linhas.
  - No teste local, o hash bateu com o `hashlib` do Python sobre os mesmos bytes.
- **A mídia nunca vai dentro de `answers`.** O envelope tem teto de **256 KiB** (`MAX_PAYLOAD_BYTES`, `_submission_archive.py:90`), e uma foto não cabe.

### 5.3 Na importação — Proposto (P5), com a forma proposta do lado da API

Hoje a importação da coordenação **recusa foto**:
- `import_submission.py:239-241` chama `bind_intake_image(..., link=None)`;
- `_submission_archive.py:200-202`: *"an image reaches a Pulse only through the team's own link"*.

A proposta é:
1. **Porta nova `POST /api/shema/forms/pulse/{projectId}/image`**, com `CoordinatorUser` + `WriteScope` e o corpo cru com `Content-Type`, igual à porta do link.
   - O tipo é provado pelos bytes e o teto é de 10 MiB.
   - A resposta é `{id, sha256}`.
2. **`answers.image = "sha256:<hex>"`** passa a ser uma segunda origem aceita por `_image_for`. O servidor resolve o hash para a imagem que **essa coordenação subiu para esse projeto**.
   - Isso pede uma migração: `intake_link_id` passa a aceitar nulo, e entra `uploaded_by`.
3. **O PME sobe a foto primeiro e o envelope depois.**
   - Com a foto ausente, ilegível ou com hash que não confere, o PME não envia nada e diz por quê.
   - Uma foto subida duas vezes cai no mesmo hash.

**Recomendação: aceitar P5.** A alternativa, a foto dentro do envelope, obrigaria a subir o teto de
256 KiB, que protege a porta, e misturaria a mídia com o bloco que é arquivado byte a byte.

### 5.4 Os tetos

| O quê | Teto | Fonte |
|---|---|---|
| Bloco de respostas (`shema-pulso`) | **256 KiB** | `_submission_archive.py:90` — no `dev` |
| Foto reduzida, no celular | **10 MiB**, checado depois da redução | D4; `prepareIntakeImage` |
| Foto subida à porta nova | **10 MiB** | proposta do lado da API, igual à do link |
| Arquivo devolvido inteiro | **proposto: 8 MiB** | a porta de arquivo (P4) proposta do lado da API; com uma foto, o arquivo fica bem abaixo |
| Corpo de uma requisição no Cloud Run do shema-api | 32 MiB | configuração do shema-api (memória 4 Gi, timeout 300 s) |
| **Corpo no nginx do PME** | **1 MB — o padrão, nada declarado** | `nginx.conf`, `location ^~ /api`, sem `client_max_body_size` |

**O nginx do PME é um gargalo que nenhuma porta vê hoje.** Tudo que o PME manda ao `/api` passa por
ele, e sem `client_max_body_size` o nginx responde 413 com a página dele acima de 1 MB. É o mesmo
defeito que o formulário de solicitação corrigiu na OBT-656 (`11m`). A foto do link hoje passa
porque o PME a reduz antes de subir. Uma foto maior, ou o arquivo inteiro de P4, não passaria.
**Proposta (P6): declarar `client_max_body_size 11m` em `location ^~ /api`**, junto com a issue que
fizer a primeira porta passar de 1 MB.

## 6. O bloco que volta — o contrato

```html
<script type="application/json" id="shema-pulso"
        data-format-version="1" data-saved-at="2026-11-10T14:45:48.803Z">{"projectId":"…","definitionVersion":3,"answers":{…}}</script>
```

- **O conteúdo do bloco é exatamente o envelope `SubmissionImport`**: `{projectId, definitionVersion, answers}` e nada mais.
  - O modelo é `extra="forbid"`, então qualquer outra chave dentro do bloco (`format`, `formatVersion`, `generatedAt`, `media`) é recusada.
- **A versão do formato** do arquivo fica no atributo `data-format-version`, junto com `data-saved-at`, fora do JSON.
  - São **duas versões diferentes**, e não se confundem:
    - `data-format-version` versiona a **forma do arquivo**: os ids dos blocos, onde mora a mídia, a referência `sha256:`;
    - `definitionVersion` versiona **as perguntas**, e quem a decide é o servidor (D7).
  - O leitor do PME recusa um `data-format-version` que não conhece, com uma frase dele.
- **`answers`** tem as chaves de `PULSE_FIELDS`, com os tipos que o servidor valida:

  | chave | tipo | regra |
  |---|---|---|
  | `submittedBy` | texto | obrigatório, até 200 |
  | `period` | `AAAA-MM` | obrigatório (`^\d{4}-(0[1-9]\|1[0-2])$`) |
  | `voice` | texto | até 4000 (D5: só texto) |
  | `bookProgress` | linhas de progresso | validadas pelo `ShemaProjectUpdate` (BE-06) |
  | `blockers` | texto | até 4000 |
  | `prayerRequest` | texto | até 4000 |
  | `prayerVisibility` | `coordenacao` \| `rede` | ausente = coordenação (`data-contracts.md` §8.2) |
  | `image` | `"sha256:<hex>"` | **proposto (P5)**; hoje o servidor só aceita o id do upload do link |
  | `imageDescription` | texto | até 1000 |
  | `imageAuthorized` | `true`/`false` | ausente e `false` = nada autorizado |

- **O JSON é escrito com `<` como `\u003c`**, que continua sendo JSON válido e não fecha a tag.
  - No teste local, um nome *Fresia `</script>` `<b>x</b>`* atravessou o arquivo, voltou e foi lido igual.
  - O arquivo continuou com exatamente quatro `</script>`.
- **Fora dos blocos JSON, todo valor que vem do servidor ou de uma pessoa é escapado como HTML** (`&`, `<`, `>`, `"`).
  - Isso vale para o `<title>`, que leva o nome de saída do projeto, e para qualquer texto escrito direto no documento. Um nome de língua nunca é normalizado (`CLAUDE.md` §5.2), e um `<` no `<title>` quebraria o `<head>` que o leitor da OBT-687 relê com `DOMParser`.
  - **Quem escapa é quem escreve o arquivo:** o gerador do PME (I3/I4) ao montar o `.html`, e o próprio formulário ao montar o arquivo de volta. É um escapador só, com teste de um nome hostil.
  - Dentro do formulário, o React (ou `textContent`) pinta as respostas, e nada vira HTML.
- **A validação acontece em dois lugares, com a mesma regra.**
  - No celular, `validateIntakeAnswers` impede salvar sem nome e sem mês, e diz o que falta.
  - No servidor, a validação é a de sempre (D7).
  - O PME **não valida as respostas uma terceira vez**: ele só confere a forma do arquivo (§8).

## 7. A rota `POST /api/shema/forms/pulse/{projectId}`

- **Proposto (P3) — quem monta o `.html`.**
  - **(a)** a rota devolve **JSON** e o PME monta o arquivo no navegador, com o build offline (P1);
  - **(b)** o shema-api guarda um template `.html` construído pelo PME, como artefato versionado.
  - **Recomendação: (a)**, que é também a preferência do lado da API. Um build só, sem artefato do front dentro da API, e o arquivo continua sendo trocado num lugar só (D2).
  - A docstring de `forms.py:56` (*"the generated artifact"*) muda junto.
- **É `POST` porque publica.** A rota publica a definição vigente (`publish_definition`, idempotente por conteúdo), como a emissão do link faz. Uma submissão é validada contra a versão que o líder viu.
- **Guarda:** `CoordinatorUser` + `WriteScope`, consumidos de `_deps.py` sem editar o arquivo. Fica no roteador interno, fora de `UNAUTHENTICATED_PATHS`.
- **Resposta:** `{projectId, kind, definitionVersion, fields, languageName, languageNameWithheld, locationWithheld, period, generatedAt}`.
  - É a forma de saída, sem leitor (`outside`). Um projeto sensível sai com o nome público ou a chave da região, como o link do líder desde a OBT-692.
  - O arquivo é leitor `outside`: `shema_privacy.py:143` já lista *"the Pulse"*.
  - `period` entrou por este desenho (§4).
- **Sem token, sem URL, sem nada que leve de volta à plataforma.**

## 8. A leitura no PME (para a OBT-687)

- **O arquivo devolvido não é executado.** O PME o lê com `DOMParser` (`text/html`), que não roda scripts, e pega os três blocos por id. O arquivo nunca entra na página, nem num iframe.
- **O bloco vai verbatim.** O `textContent` de `#shema-pulso` é o corpo de `POST /forms/submissions` (`application/json`), sem reserializar. Junto vão os cabeçalhos que a porta já pede (`If-Match`, `X-Shema-Local-Date`).
  - **Proposto (P7) — o hash da idempotência.**
    - **(a)** sobre os bytes como chegam, como hoje;
    - **(b)** sobre o bloco canônico, no servidor.
    - **Recomendação: (a)**, como propõe o lado da API.
    - O mesmo arquivo subido duas vezes manda os mesmos bytes e colide no índice `(project_id, content_hash)`. Isso só vale se o PME **não reserializar**; um teste no leitor fixa isso.
    - (b) protegeria contra um leitor que reserializa, mas mudaria uma regra do servidor que já está no `dev`.
- **A ordem é: a foto, depois o envelope, que já aplica (D8).**
  - Uma falha no meio é dita com a frase do servidor. O 409 é o `readConflict` da parte A, e a resposta fica na caixa para aplicar de novo.
  - **Proposto (P8) — ver antes de aplicar.** Na caixa, a parte A mostra as respostas antes do *Aplicar*. Pelo arquivo, a mesma chamada arquiva e aplica, e a coordenação não veria nada antes.
    - **Recomendação:** o PME mostra as respostas lidas do bloco **antes** de enviar, e só envia depois que a coordenação confirma. É local e não muda o servidor.
    - A alternativa é uma porta que arquive sem aplicar, para o arquivo cair na caixa como o link. Isso muda o servidor, e a [OBT-687](https://linear.app/shema-obt/issue/OBT-687) já foi escrita para *"arquiva e aplica"*.
- **O leitor fica num módulo só** (D2), que conhece `data-format-version`. Um formato desconhecido é recusado ali, com uma frase.

### 8.1 Arquivar o `.html` inteiro? — Proposto (P4), com uma colisão de privacidade

Do lado da API veio a proposta de uma porta nova: `PUT /forms/submissions/{id}/file`, com corpo cru, chave por
`sha256` e teto de ~8 MiB, para guardar o arquivo inteiro em `storage_key`. Essa coluna existe para
*"the day GATE-03 settles a format that produces one"* e hoje fica nula.

**Isso colide com D3.**
- O arquivo inteiro guarda o pedido de oração **em texto**, dentro do bloco.
- A regra 3b manda apagar esse pedido do Pulso guardado quando a autorização é retirada.
- Com o `.html` no bucket byte a byte, apagar o pedido é **reescrever o arquivo**, e aí ele deixa de ser byte a byte. Ou então o pedido fica.

O mesmo vale para a foto cuja autorização de uso for retirada (OBT-582).

**Recomendação: não arquivar o `.html` inteiro.**
- O que a regra *"arquivado byte a byte"* protege já está guardado: o envelope que chega à API, como hoje, e que a OBT-561 já sabe apagar.
- A foto fica no bucket como hoje, onde a retirada já funciona.
- O arquivo inteiro não acrescenta dado nenhum: é o formulário mais esses dois.

Se o Daniel quiser o arquivo, essa porta resolve. Mas o apagar da 3b tem que ganhar um passo
que alcance o bucket, e a regra *"byte a byte"* passa a ter uma exceção escrita.

## 9. Privacidade

- **A opção `rede` diz, no arquivo offline como no link, que o que vai à rede não pode ser recolhido.**
  - Essa linha é **decidida**, não proposta: é a regra 4 do §11.3, *"em toda superfície que pede a autorização"*, que vem da 3.3 da Karina (22/set: a equipe é avisada **antes** de autorizar).
  - O texto é o `prayer_vis_network_no_recall` (*"Depois que um pedido é enviado à rede, ele não pode ser recolhido."*), dito sob a opção, marcada ou não, como o `PrayerConsent` faz no link (`intakeViews.test.ts`).
  - Vale **qualquer que seja a forma do formulário (P1)**. Se o formulário for escrito à mão, ele leva a frase do mesmo jeito, e a I3 a testa.
- O arquivo gerado é de saída e circula fora da plataforma. Um projeto sensível sai com o nome reduzido (§7).
- O arquivo não leva nenhum dado de outro projeto e nenhum token.
- O rascunho no celular (D6) é do próprio líder, sobre o próprio projeto. O botão de apagar é a saída para o celular emprestado.
- O pedido de oração **só em texto** (D5) mantém as regras 3b e 10b aplicáveis. Com áudio, *"o texto exatamente igual"* não teria sujeito.
- O leitor do PME não executa o arquivo (§8). O servidor revalida tudo.

## 10. O protótipo de teste — `docs/pulso-offline/teste-aparelho.html`

É um `.html` de 21 KB, em JS puro. **Não é o formulário do produto**: serve só para provar o
aparelho. Ele faz o caminho inteiro, com perguntas reduzidas, e mostra uma caixa de diagnóstico
para fotografar:
- protocolo e origem, contexto seguro e `crypto.subtle`;
- se o `localStorage` persistiu entre aberturas (contador por abertura);
- se o IndexedDB abriu e devolveu a foto;
- os tamanhos do arquivo, do bloco e da mídia;
- se o compartilhar com arquivo existe;
- ao reabrir um arquivo devolvido, se a mídia confere com o hash.

**Medido localmente (navegador headless, 360px, via `http://` e via `file://`, 10/nov):**
- rascunho e foto restaurados depois de recarregar;
- arquivo de volta com 116 KB (bloco de 320 bytes, mídia de 95 KB);
- o bloco tem exatamente `{projectId, definitionVersion, answers}`;
- o hash da foto bate com o do Python;
- texto hostil escapado;
- o arquivo devolvido reabre com as respostas.

As perguntas do protótipo são reduzidas: a linha de capítulos leva só `{name, translated}`, e o servidor recusaria essa linha, porque o `BookProgressItem` pede mais campos. O protótipo prova o arquivo, não o formulário.

**Nada disso diz o que o Android faz.**

**O roteiro para o Daniel, no Android, em modo avião:**

1. Mandar `teste-aparelho.html` para si mesmo pelo WhatsApp, como documento.
2. Ligar o modo avião. Abrir o documento pelo WhatsApp.
   - **Anotar quem abre**: o Chrome, o visualizador de HTML ou outro app.
   - Se o texto *"Se esta frase continuar aqui, o JavaScript não rodou"* ficar, o JS não rodou. Tentar *Abrir com → Chrome*.
3. Preencher nome e uma resposta, e escolher uma foto da galeria. Repetir com a câmera.
4. **Fechar o Chrome inteiro** e abrir o documento de novo pelo WhatsApp.
   - O nome e a foto voltaram?
   - O contador diz *"abertura nº 2"*?
5. *Compartilhar o arquivo*: o menu do sistema aparece com o WhatsApp?
   - Se não aparecer, usar *Salvar o arquivo*. O arquivo chegou em Downloads, com o nome `pulso-mensal-…-2026-11.html`?
6. Ainda em modo avião, abrir o arquivo salvo. Ele mostra *"Este arquivo já foi preenchido"*, com as respostas e a foto?
7. **Fotografar a caixa de diagnóstico** nos passos 2, 4 e 6.
8. Tirar o modo avião e mandar o arquivo salvo para si mesmo pelo WhatsApp: ele chega inteiro, com o mesmo tamanho?
9. *Apagar o rascunho deste celular* e reabrir: o rascunho sumiu?

O resultado responde o que está marcado **a provar no aparelho**:
- se o arquivo abre com JS a partir do WhatsApp;
- se o rascunho persiste em `content://`;
- como o arquivo sai (compartilhar ou download);
- o tamanho real de uma foto de campo.

Se o passo 2 falhar no Chrome, o desenho inteiro muda: o formato volta à mesa, e isso é do GATE-03.

## 11. As propostas, para virar issues

Estimativas em pontos, grosseiras, para dimensionar.

| # | Repo | O quê | Est. | Depende de |
|---|---|---|---|---|
| I1 | shema-api | `POST /forms/pulse/{projectId}` devolve JSON e publica a definição (P3a); `period` no cabeçalho; nome de saída reduzido; docstrings de `forms.py:56` e `shema_forms.py:29-36` | 3 | — |
| I2 | shema-api | Porta `POST /forms/pulse/{projectId}/image` e a origem `sha256:` em `_image_for`, com migração (P5) | 5 | — |
| I3 | pme | Build offline: segunda entrada no Vite, arquivo único, i18n reduzido, fonte do sistema, blocos `shema-pulso-*`, rascunho em `localStorage`/IndexedDB por projeto e período, *Apagar o rascunho*, arquivo de volta autocopiado, hash em JS puro, fallback JPEG na redução (P1, P9, D5, D6) | 8 | I1 |
| I4 | pme | O botão *Gerar Pulso Mensal* chama I1 e monta e salva o arquivo; `forms_format_pending` sai | 3 | I1, I3 |
| I5 | pme | **[OBT-687](https://linear.app/shema-obt/issue/OBT-687), já aberta** — o leitor do arquivo (`DOMParser`, blocos, `data-format-version`), as respostas mostradas antes de enviar (P8), a foto por I2, o envelope verbatim que arquiva e aplica, o 409 | — | I2, I3 |
| I6 | pme | `client_max_body_size 11m` em `/api` no `nginx.conf` (P6) | 1 | — |

P4 (arquivar o `.html` inteiro) **não vira issue** enquanto o Daniel não decidir a colisão do §8.1.

## 12. O que fica para o Daniel decidir

| | Pergunta | Recomendação |
|---|---|---|
| P1 | O formulário offline é o React da página do líder, num build próprio, ou JS à mão? | O build próprio (§3) |
| P2 | O rascunho some sozinho ao salvar o arquivo? | Não; só pelo botão (§4) |
| P3 | Quem monta o `.html`: o PME, com a rota devolvendo JSON (a), ou um template guardado na API (b)? | (a) (§7) |
| P4 | Arquivar o `.html` inteiro em `storage_key`? | Não, por causa da 3b (§8.1) |
| P5 | A foto entra na importação da coordenação por porta própria e referência `sha256:`? | Sim (§5.3) |
| P6 | Abrir o nginx do PME a 11 MB em `/api`? | Sim, junto com a primeira porta que precisar (§5.4) |
| P7 | O hash da idempotência é sobre os bytes como chegam, ou sobre o bloco canônico? | Os bytes, com o PME mandando verbatim (§8) |
| P8 | Pelo arquivo, a coordenação vê as respostas antes de a chamada aplicar? | Sim, mostradas do bloco antes de enviar, sem mudar o servidor (§8) |
| P9 | A redução da foto ganha um fallback para JPEG onde o navegador não codifica WebP? | Sim, na I3, em `prepareIntakeImage` (§5.1) |
