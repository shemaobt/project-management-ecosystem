# Acessibilidade — o que FE-43 encontrou e não consertou

Levantado na passada de acessibilidade e responsividade da onda 1
([OBT-385](https://linear.app/shema-obt/issue/OBT-385), FE-43). O que **foi** consertado está na
descrição da PR; este arquivo é o resto, ordenado por quanto pesa para quem usa o produto — um
coordenador regional, no celular, em campo, muitas vezes num aparelho emprestado.

Cada item diz **o que é**, **onde**, **por que ficou fora desta passada** e **o que seria preciso**.
Cada um deve virar uma issue própria no Linear.

---

## 1. Ninguém passou um leitor de tela de verdade nesta interface

**O que é.** A DoD pedia uma passada de leitor de tela em Projetos e na Ficha. Esta sessão não tinha
leitor de tela nenhum (sem NVDA, sem VoiceOver, sem Orca) e nenhum foi instalado.

**O que foi provado no lugar.** A estrutura que o leitor lê foi medida no DOM renderizado, num Chrome
de verdade: Projetos tem um `<main>`, um `<h1>`, uma `<nav>` nomeada ("Áreas") e duas regiões
nomeadas ("Filtros e visões salvas", "Resultados"); a Ficha é um diálogo nomeado por um `<h1>` com o
nome do projeto e dez abas vindas do primitivo Radix (um `role=tablist`, dez `role=tab`). Isso diz
que a árvore está certa. **Não diz como soa.**

**Por que ficou fora.** Instalar e operar um leitor de tela é trabalho de sessão com áudio e com
alguém escutando, não de varredura automatizada.

**O que seria preciso.** Uma pessoa com NVDA (Windows) ou VoiceOver (macOS/iOS) percorrendo Projetos
e as dez abas da Ficha, com o roteiro: navegar por landmarks, navegar por headings, navegar por
formulário, abrir e fechar a Ficha, e dizer se cada parada faz sentido dita em voz alta. Idealmente
com um usuário que já use leitor de tela no dia a dia.

---

## 2. Nada foi verificado num aparelho real

**O que é.** A verificação de viewport foi feita em **emulação** — Chrome headless 153 com
`Emulation.setDeviceMetricsOverride` a 320×568, 360×740, 512×384 e 640×512. Emulação acerta o
layout; não acerta toque, teclado virtual, notch, barra de endereço que encolhe a viewport, nem a
lentidão de um aparelho antigo.

**Por que ficou fora.** Não havia aparelho nesta sessão.

**O que seria preciso.** Abrir as nove rotas num Android de entrada e num iPhone, com o teclado
virtual aberto sobre cada formulário longo (Ficha em modo editar, Intercessores, Avaliação), e
confirmar que o campo em foco não fica embaixo do teclado.

---

## 3. `role="button"` no cartão inteiro apaga o conteúdo dele do leitor de tela

**O que é.** `ProjectCardAtlas` e `ProjectCardDiario` são `<article role="button" tabindex="0">`. Pela
especificação ARIA, `button` é um papel de **filhos apresentacionais**: tudo dentro dele sai da árvore
de acessibilidade. Medido no Chrome, com `Accessibility.getFullAXTree` sobre um cartão do Diário: o nó
`button` tem 7 filhos, **seis deles ignorados**, e a subárvore de 64 nós não contém **nenhuma** menção a
saúde ou a prioridade. Um leitor de tela ouve `"Abrir o projeto Afrikaans: Kaaps, botão"` e mais nada.

**Onde.** `src/components/pages/projetos/card.ts:63` (`openableCardProps`),
`src/components/pages/projetos/ProjectCardAtlas.tsx:66`.

**Consequência direta para o que FE-43 fez.** Os canais de texto que esta passada colocou e reforçou —
o `sr-only` de `StatusDot` (que já existia) e o novo de `PriorityPin` — **funcionam no showcase e no
`title` do mouse, e não chegam ao leitor de tela dentro dos dois cartões.** O canal visual dos quatro
estados de saúde (o glifo `✓ ! × –`) continua valendo em todo lugar, e é ele que responde à caixa em
negrito da DoD; o canal falado, nos cartões, está bloqueado por este item. Isto está dito assim na PR.

**Detalhe adicional:** `ProjectCardDiario` passa `aria-label` ("Abrir o projeto {{language}}") e o
Atlas não — medido, o `aria-label` do cartão do Atlas é `null`, então o nome dele é a concatenação do
conteúdo inteiro ("afr ISO Afrikaans: Kaaps YWAM Sydney South Africa Bíblia Completa…").

**Por que ficou fora.** As três saídas são todas de desenho, não de atributo: (a) o cartão deixa de ser
um botão e ganha um controle "Abrir" dentro dele; (b) o que importa entra no **nome** do cartão, o que
faz o nome crescer muito; (c) um `aria-describedby` apontando para um resumo `sr-only` fora do botão.
Escolher entre as três é decidir o que um cartão deve dizer quando lido em voz alta — pergunta de
produto, e é por isso que este item vem logo depois dos dois limites da sessão.

**O que seria preciso.** Uma issue própria, com a decisão acima tomada, os dois cartões unificados
num único helper com rótulo obrigatório, e um teste que asserte a árvore de acessibilidade — não o
HTML — do cartão.

---

## 4. Alvos de toque abaixo de 24×24 px

**O que é.** WCAG 2.5.8 (AA, 2.2) pede 24×24 CSS px de área alvo. Medidos a 360px de largura, num
navegador de verdade:

| Onde | Tamanho | Observação |
|---|---|---|
| `src/components/ui/Checkbox.tsx:15` e `src/components/ui/RadioGroup.tsx:26` — a caixa e o ponto (`size-4`) | 16×16 | atenuado: `optionLabel` (`src/components/ui/option.ts`) embrulha o controle num `<label>` clicável, e o alvo efetivo é o rótulo. Quem usa `Checkbox`/`Radio` **sem** rótulo ao lado fica com 16×16 de verdade. |
| `src/components/pages/ficha/tabs/equipe/RegionalRoles.tsx:30` — o link "Abrir a área Equipe" | 119×19 | link em linha, sem atenuante |
| `src/components/pages/ficha/tabs/equipe/PeopleField.tsx:77` — o `×` de remover pessoa (`size-5`) | 20×20 | sem atenuante |

Os controles circulares de `size-6.5` (26×26) passam. Medido a 360px com
`getBoundingClientRect()`, não estimado a partir da classe.

**Por que ficou fora.** Aumentar o alvo muda o desenho de linhas que vêm do protótipo, e §2 dá o
visual ao protótipo. A saída sem custo visual é área de toque maior que o pixel desenhado (padding
transparente ou pseudo-elemento), mas isso muda o espaçamento das grades e merece ser visto num
aparelho — veja o item 2.

**O que seria preciso.** Uma issue que aumente a área alvo sem mexer no pixel desenhado, começando
pelos dois sem atenuante; e decidir se `Checkbox`/`Radio` podem ser usados sem rótulo.

---

## 5. O globo do Atlas é só para mouse

**O que é.** O SVG do globo tem 244 nós e **zero elementos focáveis dentro**. Os medalhões e os
marcadores de projeto abrem só com clique e arrasto.

**Onde.** `src/components/pages/projetos/Atlas/Globe.tsx`, `GlobeMarkers.tsx`, `Medallion.tsx`.

**Atenuante importante:** a mesma informação está alcançável por teclado logo abaixo — a visão Atlas
renderiza a lista de `ProjectCardAtlas`, e cada cartão é focável e abre a Ficha com Enter ou Espaço.
Nenhum projeto fica inacessível; o que fica inacessível é **o globo como controle**.

**Por que ficou fora.** Dar teclado ao globo é redesenhar a interação (ordem entre marcadores,
rotação por seta, o que acontece com um marcador atrás do planeta), não ajustar um atributo. É uma
issue de produto.

**O que seria preciso.** Decidir se o globo é controle ou ilustração. Se for ilustração, marcá-lo
`aria-hidden` e dizer isso em texto; se for controle, dar a ele um contrato de teclado próprio.

---

## 6. Prioridade tem oito significados, cinco cores e uma forma só

**O que é.** FE-43 deu a `PriorityPin` um canal de texto (`title` + `sr-only`, oito frases próprias).
O canal **visual** continua sendo só cor: um ponto de 8px, e as oito prioridades caem em cinco
cores — `canceled`, `paused`, `unknown` e o caso comum pintam todas o mesmo `bg-status-na`. Quem não
distingue cores, e quem usa o produto sem passar o mouse, vê quatro estados diferentes como um só.

**Ver também o item 3:** dentro dos dois cartões, nem o canal de texto que FE-43 deu ao alfinete
chega ao leitor de tela.

**Onde.** `src/components/common/StatusBadge.tsx` (`PriorityPin`, `PRIORITY_TONES` em
`src/styles/badges.ts`), consumido por `src/components/pages/projetos/Journal/ProjectCardDiario.tsx`.
A fita de washi do mesmo cartão (`TAPE_TONES`) tem o mesmo problema e é `aria-hidden`.

**Por que ficou fora.** Dar forma própria a oito estados num ponto de 8px é decisão de desenho, e o
alfinete é do protótipo.

**O que seria preciso.** O designer decidir: ou um glifo dentro do alfinete (como o ponto de saúde já
faz com `✓ ! × –`), ou reduzir a oito-para-cinco a uma escala honesta de três ou quatro níveis de
atenção que a cor consiga carregar.

---

## 7. Falta um tom quieto para superfície escura (`on-dark-muted`)

**O que é.** FE-19 já registrou que `text-areia` é o único tom de tinta que não migrou para a camada
semântica, porque `on-dark` é branco cheio e não existe nada mais quieto. FE-43 tornou isso mais
visível: os rótulos do painel do globo eram `text-areia` sobre a pílula translúcida e mediam **2.91**,
então foram para `text-on-dark`, e a varredura pós-conserto não os reporta mais abaixo do piso — mas
eles passaram a ter o mesmo brilho do número que legendam.

**Onde.** `src/components/pages/projetos/Atlas/GlobeOverlays.tsx` (os rótulos do painel e o aviso de
países sensíveis); `DialogDescription` e a assinatura da topbar continuam em `text-areia`, onde a
superfície é o verde e o número é 6.03 — esses estão bem.

**Por que ficou fora.** Inventar um valor de marca é decisão do dono da marca, não de engenharia
(§7.4). E ele viaja junto com a paleta escura, que segue pendente desde FE-02.

**O que seria preciso.** Um valor de `--fg-on-dark-muted` do designer, no mesmo pedido dos sete
valores da paleta escura.

---

## 8. A escala de títulos virou fluida, e o designer não pediu isso

**O que é.** `--fs-display`, `--fs-h1`, `--fs-h2` e `--fs-h3` eram px fixos. Um `<h1>` de 56px não
cabe em 320px — medimos 427px de scrollWidth numa viewport de 320. Agora são `clamp()`, com o **teto
igual ao valor que §7.2 declara**: a 1280px nada mudou, só o piso é novo.

**Por que está aqui mesmo tendo sido consertado.** Porque é uma mudança na escala tipográfica, que é
autoridade de design. O conserto foi feito porque texto que força rolagem horizontal é
comportamento, não decoração (a mesma régua de FE-31 e FE-34) — mas o designer precisa ver e ou
ratificar os pisos, ou dar os dele.

**Os pisos escolhidos:** display 44px · h1 32px · h2 26px · h3 22px.

---

## 9. Nenhuma concessão a `prefers-reduced-motion`

**O que é.** A interface anima: `animate-fade-in`, `animate-slide-up`, `animate-slide-in-right`,
`hover:-translate-y-1` nos cartões do Diário, `transition-[width]` nas barras de progresso. Não há
uma única `@media (prefers-reduced-motion: reduce)` no repositório.

**Onde.** `src/index.css` (o bloco `@theme` que declara as animações) e todo componente que as usa.

**Por que ficou fora.** É uma regra global nova no `@layer base` mais uma decisão sobre o que é
movimento essencial — cabe numa issue própria, curta.

**O que seria preciso.** Um bloco em `@layer base` que zere duração e transform sob
`prefers-reduced-motion: reduce`, e um teste de fonte que impeça a próxima animação de escapar dele.

---

## 10. Projetos tem um heading e mais nada

**O que é.** Navegando por headings, a tela principal do produto oferece uma parada: o `<h1>`
"Projetos". Os títulos de seção da barra lateral ("Visões salvas", "Time por região", cada grupo de
filtro) são `<p class="text-eyebrow">`, não headings — visualmente são títulos, semanticamente não
são.

**Onde.** `src/components/pages/projetos/Sidebar/` (`SavedViews/index.tsx`, `TeamByRegion.tsx`,
`Filters/FilterSection.tsx`, `Chips.tsx`).

**Atenuante:** os grupos de filtro têm `role="group"` e a barra inteira tem nome, então a navegação
por landmark funciona. É a navegação por heading que fica pobre.

**Por que ficou fora.** Promover eyebrows a headings muda o sumário de várias telas ao mesmo tempo
(o mesmo padrão aparece em Ritmo, ETEN, Formulários e Equipe) e merece uma decisão única sobre o
nível de cada um, não seis decisões locais.

**O que seria preciso.** Uma issue que defina a hierarquia de headings por área e converta os
eyebrows de seção de uma vez, com um teste de render fixando a hierarquia sem pulo por tela.

---

## 11. Nove pares preenchimento/tinta abaixo de 4.5, todos hoje sem texto

**O que é.** `scripts/contraste.mjs` reporta nove pares abaixo de 4.5:1. Nenhum é defeito hoje: ou
são cruzamentos de estados que nunca coexistem (o scanner vê `bg-muted` e `text-on-brand` na mesma
string de classe, em variantes diferentes), ou são o `:hover` de um controle **só-ícone**, onde vale
o piso de 3:1 para objeto gráfico e `telha` sobre `accent-soft` mede 3.69.

**Onde.** Os sete arquivos estão nomeados em `GLYPH_ONLY`, em
`src/styles/__tests__/tokens.test.ts`.

**O risco.** No dia em que um desses botões ganhar um rótulo ao lado do ícone, o par passa a carregar
texto e reprova — e a isenção está lá, escrita, dizendo que pode.

**O que seria preciso.** Ou mover os sete para `accent-press` de uma vez (o hover fica um pouco mais
escuro), ou um guard que confira que o elemento isento não tem filho de texto — o que exige
renderizar, não varrer fonte.

---

## 12. As garantias de contraste valem só para o tema claro

**O que é.** Toda medição desta passada — a matriz de tokens, os 34 varrimentos de DOM renderizado, o
piso novo de `fg-subtle` — é sobre as superfícies claras. `@custom-variant dark` existe desde FE-02 e
**não há nenhum valor de paleta escura**, então não há o que medir.

**O que seria preciso.** Quando a paleta escura chegar (FE-02 / [OBT-349](https://linear.app/shema-obt/issue/OBT-349)),
rodar `node scripts/contraste.mjs` e a varredura de DOM contra ela antes de considerá-la pronta. O
ferramental já está no repositório.

---

## 13. Auditoria WCAG AA formal

Fora de escopo por decisão da própria issue OBT-385: "vale, separada, com quem faz isso direito".
Esta passada cobriu 1.4.3 (contraste), 1.4.10 (reflow), 1.4.11 (não-texto), 2.1.1 (teclado),
2.4.1 (pular blocos), 2.4.3/2.4.7 (ordem e visibilidade do foco), 2.4.6 (rótulos), 1.3.1
(informação e relações) e 1.4.1 (uso da cor) — não cobriu o resto do critério.
