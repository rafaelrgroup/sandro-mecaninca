# Design system — Sandro Mecanica

Todos os tokens vivem em `src/styles/global.css`, dentro do bloco `@theme`.
É o único arquivo do projeto onde um valor hexadecimal pode aparecer.
Nenhuma classe Tailwind com valor arbitrário (`bg-[#...]`, `text-[14px]`
etc.) é permitida — sempre use um token (`bg-ambar-500`, `text-sm`, ...).

A paleta, as famílias de fonte, os raios e as sombras padrão do Tailwind
são desligados (`--color-*`, `--font-*`, `--radius-*`, `--shadow-*`:
`initial`); só existem os tokens listados abaixo. Sem isso, `rounded-md`,
`rounded-lg` e `shadow-*` cairiam calados no padrão do Tailwind.

As decisões de marca e sistema da parte P1a (fechadas pelo DESIGN_SYSTEM,
texto literal em `/tmp/nostop-cwd/DECISOES-P1a.md`) estão na seção
"Decisões P1a", uma por item, no fim deste arquivo.

## Cor

### Grafite (neutros)

| token | hex | uso típico |
|---|---|---|
| `grafite-950` | `#14161a` | fundo escuro principal (hero, rodapé) |
| `grafite-900` | `#1b1e24` | fundo escuro secundário |
| `grafite-800` | `#262a33` | texto principal sobre fundo claro |
| `grafite-700` | `#343a46` | bordas/divisores sobre fundo claro |
| `grafite-600` | `#4a5262` | ícones/elementos secundários |
| `grafite-500` | `#636c7e` | texto secundário/muted sobre fundo claro |
| `grafite-400` | `#8890a0` | texto secundário/muted sobre fundo escuro |
| `grafite-300` | `#b0b6c2` | texto terciário sobre fundo escuro |
| `grafite-100` | `#e4e6ea` | fundo alternado, divisores claros |

### Base

| token | hex | uso |
|---|---|---|
| `off-white` | `#f7f5f2` | fundo claro principal do site |
| `white` | `#ffffff` | cartões, fundo de contraste máximo |

### Âmbar (acento da marca)

| token | hex | uso |
|---|---|---|
| `ambar-700` | `#9c6208` | texto/ícone âmbar sobre fundo claro (é o único tom de âmbar com AA para texto normal sobre `off-white`/`white`) |
| `ambar-600` | `#b8790a` | hover de botão âmbar, decorativo |
| `ambar-500` | `#e0921a` | fundo do botão primário; texto grande sobre `grafite-950`/`grafite-900` |
| `ambar-400` | `#f0a93a` | decorativo, destaque em texto grande sobre fundo escuro |

### WhatsApp (exclusivo do botão de WhatsApp)

| token | hex | uso |
|---|---|---|
| `whatsapp-700` | `#0d5c3f` | tom CLARO: fundo do botão, texto `white` |
| `whatsapp-800` | `#0a4a33` | tom CLARO: hover; tom ÂMBAR: fundo do botão, texto `white` |
| `whatsapp-400` | `#25d366` | tom ESCURO e barra: fundo do botão, texto `grafite-950` |
| `whatsapp-300` | `#5fe08f` | tom ESCURO e barra: hover |

O verde é escolhido pelo TOM da superfície, não por um verde único: sobre
superfície clara, verde escuro com texto `white`; sobre superfície escura
(e na barra), o verde oficial `#25d366` (`whatsapp-400`) com texto
`grafite-950` — nunca com texto branco, que não atinge 4.5:1.

## Contraste — pares usados na interface (WCAG AA)

AA exige 4.5:1 para texto normal e 3:1 para texto grande (≥ 24px, ou
≥ 19px em negrito) e para elementos gráficos/estado de foco.

Coluna **forma**: contraste do fundo ou da borda do componente contra a
SUPERFÍCIE em que ele está (regra: ≥ 3:1 em todo tom). "—" quando o par é
só texto sobre fundo, sem forma de componente.

| par (primeiro-plano / fundo) | razão | passa AA texto normal (4.5:1) | passa AA texto grande / gráfico (3:1) | forma (componente × superfície) |
|---|---|---|---|---|
| `off-white` / `grafite-950` | 16.64:1 | sim | sim | — |
| `grafite-950` / `off-white` | 16.64:1 | sim | sim | — |
| `grafite-800` / `off-white` | 13.21:1 | sim | sim | — |
| `grafite-500` / `off-white` | 4.85:1 | sim | sim | — |
| `grafite-400` / `grafite-950` | 5.64:1 | sim | sim | — |
| `grafite-300` / `grafite-950` | 8.90:1 | sim | sim | — |
| `ambar-500` / `grafite-950` (texto grande/ícone) | 7.16:1 | sim | sim | — |
| `grafite-950` / `ambar-500` (texto do botão primário) | 7.16:1 | sim | sim | botão âmbar × `grafite-950`: 7.16:1 |
| `ambar-700` / `off-white` (texto normal âmbar) | 4.63:1 | sim | sim | — |
| `ambar-700` / `white` (texto normal âmbar) | 5.04:1 | sim | sim | — |
| `white` / `whatsapp-700` (botão WhatsApp, tom claro) | 8.02:1 | sim | sim | `whatsapp-700` × `off-white`: 7.37:1 |
| `white` / `whatsapp-800` (hover, tom claro) | 10.29:1 | sim | sim | `whatsapp-800` × `off-white`: 9.46:1 |
| `grafite-950` / `whatsapp-400` (botão WhatsApp, tom escuro e barra) | 9.13:1 | sim | sim | `whatsapp-400` × `grafite-950`: 9.13:1; × `grafite-800`: 7.25:1 |
| `grafite-950` / `whatsapp-300` (hover, tom escuro) | 10.82:1 | sim | sim | `whatsapp-300` × `grafite-950`: 10.82:1; × `grafite-800`: 8.58:1 |
| `white` / `whatsapp-800` (botão WhatsApp, tom âmbar) | 10.29:1 | sim | sim | `whatsapp-800` × `ambar-500`: 4.07:1 |
| `grafite-800` / `off-white` (Ligar, contorno 2px, tom claro) | 13.21:1 | sim | sim | borda `grafite-800` × `off-white`: 13.21:1 |
| `off-white` / `grafite-950` (Ligar, contorno 2px `grafite-400`, tom escuro) | 16.64:1 | sim | sim | borda `grafite-400` × `grafite-950`: 5.64:1; × `grafite-800`: 4.47:1 |
| `grafite-950` / `ambar-500` (Ligar, contorno 2px `grafite-950`, tom âmbar) | 7.16:1 | sim | sim | borda `grafite-950` × `ambar-500`: 7.16:1 |
| `ambar-500` / `grafite-950` (Ligar, hover/active, tom âmbar: fundo `grafite-950`) | 7.16:1 | sim | sim | `grafite-950` × `ambar-500`: 7.16:1 |
| `grafite-950` / `ambar-500` (primário, tom claro, contorno 2px `grafite-950`) | 7.16:1 | sim | sim | borda `grafite-950` × `off-white`: 16.64:1 (× `white` 18.11:1); sem contorno o fundo dá 2.32:1 |
| `grafite-950` / `ambar-400` (primário, hover, tons claro e escuro) | 9.01:1 | sim | sim | — |
| `grafite-950` / `ambar-600` (primário, active, tons claro e escuro) | 4.98:1 | sim | sim | — |
| `grafite-950` / `ambar-500` (primário, tom escuro, `border-transparent`) | 7.16:1 | sim | sim | fundo `ambar-500` × `grafite-950` 7.16:1 / × `grafite-900` 6.60:1 / × `grafite-800` 5.68:1 ("Como chegar") |
| `ambar-500` / `grafite-950` (primário, tom âmbar, `border-transparent`) | 7.16:1 | sim | sim | fundo `grafite-950` × `ambar-500`: 7.16:1 |
| `ambar-500` / `grafite-800` (primário, hover/active, tom âmbar) | 5.68:1 | sim | sim | — |
| `grafite-800` / `off-white` (fantasma, tom claro; × `white` 14.37:1) | 13.21:1 | sim | sim | sem forma (isento do 3:1) |
| `grafite-800` / `grafite-100` (fantasma, hover/active, tom claro) | 11.50:1 | sim | sim | — |
| `off-white` / `grafite-950` (fantasma, tom escuro; × `grafite-900` 15.34:1) | 16.64:1 | sim | sim | sem forma (isento do 3:1) |
| `ambar-400` / `grafite-800` (fantasma, hover/active, tom escuro) | 7.15:1 | sim | sim | — |
| `grafite-950` / `ambar-500` (fantasma, tom âmbar) | 7.16:1 | sim | sim | sem forma (isento do 3:1) |
| `grafite-950` / `ambar-400` e `ambar-600` (fantasma, hover e active, tom âmbar) | 9.01:1 / 4.98:1 | sim | sim | — |
| anel de foco `ambar-700` (superfície clara) | — | — | sim | × `off-white` 4.63:1 / × `white` 5.04:1 / × `grafite-100` 4.03:1 |
| anel de foco `ambar-500` (superfície grafite) | — | — | sim | × `grafite-950` 7.16:1 / × `grafite-900` 6.60:1 / × `grafite-800` 5.68:1 |
| anel de foco `grafite-950` (superfície âmbar) | — | — | sim | × `ambar-500` 7.16:1 |
| (proibido) `whatsapp-700` sobre superfície escura | — | — | — | × `grafite-950`: 2.26:1 — NÃO PASSA; por isso o par por tom |

Razões da coluna "forma" são as da decisão P1a (itens 3+5) e, nas
linhas de primário, fantasma, hover âmbar e anel de foco, do ADENDO 3
(DECISOES-P1a.md; tabela de tom completa na seção "ADENDO 3" abaixo). Os valores
de `whatsapp-300` e de `whatsapp-800` × `off-white`, que a decisão não
escreveu, foram calculados (fórmula WCAG) a partir dos hex dos tokens.

Regra prática: `ambar-500` e `ambar-600` só carregam texto/ícone quando
o texto é grande (títulos, números) ou quando o próprio âmbar está no
fundo com texto `grafite-950` por cima (botão primário). Para âmbar como
cor de texto normal sobre fundo claro, use sempre `ambar-700`.

## Tipografia

- **Display** (`font-display`, `Barlow Condensed`): condensada, pesos
  600/700/800. Usada em títulos (`h1`–`h4`, elementos com a classe
  utilitária `.fonte-display`). Self-hosted via `@fontsource/barlow-condensed`.
- **Texto** (`font-texto`, `Inter Variable`): fonte variável, usada no
  corpo do texto. Self-hosted via `@fontsource-variable/inter`.
- Ambas carregam com `font-display: swap` (padrão dos pacotes
  `@fontsource*`), evitando texto invisível durante o carregamento.

## Escala de espaço

`3xs` 0.25rem · `2xs` 0.5rem · `xs` 0.75rem · `sm` 1rem · `md` 1.5rem ·
`lg` 2rem · `xl` 3rem · `2xl` 4.5rem · `3xl` 6rem · `4xl` 8rem.
Tokens nomeados da mesma escala: `barra` 4rem e `alvo` 3rem (itens 6 e 7).

Usada via utilitários padrão do Tailwind (`p-md`, `gap-lg`, `mt-2xl`...),
já que os tokens entram no namespace `--spacing-*`.

## Raio e sombra

Ver a decisão 2 (CANTO) abaixo: `radius-sm` 0.25rem (controles) e
`radius-full` 999px (só luz-espia e marco). Não há mais `radius-md`,
`radius-lg` nem token de sombra.

## Easing e duração

- `ease-padrao` — transições de estado (hover, foco).
- `ease-entrada` — elemento saindo de tela/perdendo destaque.
- `ease-saida` — elemento entrando/ganhando destaque.
- `duracao-rapida` 150ms (microinterações, hover) · `duracao-base` 250ms
  (padrão) · `duracao-lenta` 400ms (transições maiores).
- Durações de entrada: ver a decisão 4 (TEMPO) abaixo.

## Regras do projeto

- Proibido valor arbitrário em classe Tailwind (`[...]`).
- Proibido hex fora de `src/styles/global.css`.
- Qualquer cor nova entra primeiro na tabela deste arquivo, com o
  cálculo de contraste correspondente, antes de ser usada em componente.
- **Texto nunca sobre foto, foto nunca sob véu nem gradiente; painel
  encosta na foto.** (Nada ocupa o canto chanfrado; nenhum retângulo de
  nó de texto intersecta o retângulo de uma foto.)

## Pares de contraste acrescentados com a landing

| par (primeiro-plano / fundo) | razão | AA texto normal | AA texto grande / gráfico |
|---|---|---|---|
| `grafite-100` / `grafite-950` (subtítulo do hero e do CTA) | 14.49:1 | sim | sim |
| `ambar-400` / `grafite-950` (destaque de título) | 9.01:1 | sim | sim |
| `grafite-400` / `grafite-900` | 5.20:1 | sim | sim |
| `grafite-300` / `grafite-900` | 8.20:1 | sim | sim |
| `ambar-500` / `grafite-900` (texto grande "2018") | 6.60:1 | sim | sim |
| `grafite-500` / `white` (texto de apoio em cartão) | 5.28:1 | sim | sim |
| `grafite-800` / `white` | 14.37:1 | sim | sim |

## Largura máxima de bloco (tokens `--container-*`)

Os nomes padrão `max-w-xs` … `max-w-3xl` do Tailwind **colidem** com a
escala de espaço (`--spacing-xs` … `--spacing-3xl`) e passam a valer
0.75rem, 4.5rem etc. Por isso a landing usa três larguras próprias:

| token | valor | uso |
|---|---|---|
| `max-w-legenda` | 20rem | legenda/apoio curto (ex.: texto ao lado do título do painel de sintomas) |
| `max-w-texto` | 36rem | parágrafos e subtítulos (~65 caracteres por linha) |
| `max-w-titulo` | 48rem | bloco de título de seção e do hero |

`max-w-4xl` em diante e `max-w-prose` não colidem e podem ser usados.

## Movimento (tokens e regras)

- Tokens de duração, atraso e teto: decisão 4 (TEMPO) abaixo.
- Script inline no `<head>` (antes do CSS) põe `js` e, se for o caso,
  `movimento-reduzido` em `<html>`.
- `src/scripts/reveal.ts`: só esconde elementos `[data-reveal]` depois
  de pôr `reveal-ativo` em `<html>`; o que já está na tela nesse momento
  é marcado como revelado antes. Sem JS, com erro no script ou com
  `prefers-reduced-motion`, nada fica oculto.

## Componentes de UI — ajustes feitos com a landing

- `CabecalhoSecao`: novas props `tom` (`claro` | `escuro`, para fundo
  grafite), `nivel` (`h2` | `h3`) e `idTitulo` (para `aria-labelledby`).
  Título agora em caixa alta, `leading-none`, até `text-6xl`.
- `Card`: repassa `target`/`rel` quando vira `<a>`.
- `Marca`: marca inline (SVG, `currentColor`) gerada de `src/lib/marca.js`;
  `tamanho` `sm` (cabeçalho, 48 px), `lg` (rodapé, 72 px), `xs` (32 px, sem
  descritor).

### Nota sobre `duration-*`

Os utilitários `duration-rapida|base|lenta` só existem porque
`global.css` publica os apelidos `--transition-duration-*` apontando
para os tokens `--duracao-*` (o Tailwind lê o primeiro namespace, não o
segundo). Ao criar uma nova duração, crie o par.

---

## Decisões P1a

Uma seção por decisão, na numeração da decisão. Cada uma traz o token ou
a regra, o valor, a regra de uso e a razão em uma linha. A razão vem de
`/tmp/nostop-cwd/DESENHO-APROVADO.md` ou das medições em
`critica-sistema/RELATO.md` e `critica-sistema-medida/RELATO.md`. Onde
nenhuma dessas fontes registra a razão, está escrito "razão não
registrada".

### 1 MARCA — "chave em S" + A-N-D-R-O

- **Token/regra:** geometria em `src/lib/marca.js` (fonte única); arquivos
  em `public/` gerados por `node scripts/gerar-marca/index.js`; conferida
  por `node testes/marca-geometria.mjs`.
- **Valor:** H=100, traço único 12, raio único 22; só `stroke`
  `currentColor`, `fill none`, junção `bevel`, ponta `butt`; só comandos
  M L A Z. Letras com clipPath da caixa [0,L]×[0,100], S sem clip. Larguras
  S 80, A 64, N 72, D 56, R 56, O 56; x: S 0, A 74, N 146, D 236, R 308,
  O 380. viewBox `0 -12 436 160` (com descritor) e `0 -12 436 124` (sem
  descritor). Descritor = 2ª palavra de `oficina.nome`, com acento, em
  `<text>` Inter 600, font-size 41, x 74, y 148, textLength 362. Selo 160:
  polígono `0,0 160,0 160,120 120,160 0,160` `ambar-500`, S em
  `translate(40 30)` `grafite-950`, inverte sobre âmbar. Favicon reduzido
  (só `favicon.svg`): traço 18, cabeças sem entalhe, grupo
  `translate(80 80) scale(1) translate(-40 -50)`. Apple-touch 180 opaco:
  quadrado inteiro `ambar-500` sob o selo (sem transparência no canto).
- **Uso:** cabeçalho 48 px, rodapé 72 px (com descritor); abaixo de 40 px
  de altura a versão sem descritor é obrigatória
  (`marca-sem-descritor.svg`, `Marca tamanho="xs"`); abaixo de 24 px só o
  selo (`logo-mark.svg`); selo de lado < 32 px = reduzido (desenho do
  `favicon.svg`), ≥ 32 px S completo. Ícone quadrado usa o selo. Cor única.
- **Razão:** a crítica a 1440 leu o símbolo como moeda (círculo/hexágono) e
  viu o nome em Barlow corrida, sem desenho próprio nem relação com o
  símbolo; agora o símbolo é o S do nome (DESENHO §2). Os limiares de
  40/24 px e as alturas 48/72: razão não registrada (a medição só mostra
  que o S antigo virava "mancha vertical de 4 px" a 16 px).

### 2 CANTO — chanfro e raios

- **Token/regra:** `--chanfro-sm` (<768), `--chanfro` (≥768); `--radius-sm`;
  `--radius-full`. Removidos: `--radius-md`, `--radius-lg` e todos os
  `--shadow-*`.
- **Valor:** chanfro de 45° só no canto inferior direito; `--chanfro-sm` =
  `spacing-md`, `--chanfro` = `spacing-xl`; `radius-sm` 0.25rem (4px);
  `radius-full` 999px.
- **Uso:** chanfro em selo, moldura de foto e painel; os demais cantos são 0,
  sem sombra e sem borda. Controles com `rounded-sm`. `rounded-full` só em
  luz-espia e marco da estrada.
- **Razão:** um vocabulário de canto só, porque o chanfro de 45° é A forma
  da marca (DESENHO §2). A medição achou 4 raios + chanfro na página e
  "três raios na mesma dobra", e sombras que não se distinguem do fundo ou
  que chegam à borda da tela a 360.

### 3+5 VERDE e FORMA — par por tom

- **Token/regra:** `whatsapp-700`/`800` (claro), `whatsapp-400`/`300`
  (escuro e barra, NOVOS); coluna "forma" na tabela de contraste.
- **Valor:** claro: `whatsapp-700` + `white`, forma 7,37, hover
  `whatsapp-800`. Escuro/barra: `whatsapp-400` `#25d366` + `grafite-950`,
  9,13 (7,25 em `grafite-800`), hover `whatsapp-300` `#5fe08f`. Âmbar:
  `whatsapp-800` + `white`, forma 4,07. Ligar, contorno 2px: `grafite-800`
  (claro, 13,21), `grafite-400` + texto `off-white` (escuro, 5,64/4,47),
  `grafite-950` (âmbar, 7,16).
- **Uso:** o fundo ou a borda do componente × a superfície tem de dar ≥ 3:1
  em todo tom. O botão primário é o elemento mais saliente da dobra. O
  verde é exclusivo do WhatsApp. A prop `tom` do Botao é de P2.
- **Razão:** `whatsapp-700` dá 2,26:1 de forma contra `grafite-950` e some
  no hero escuro (medido: 2,22–2,28:1; no hover cai a 1,76:1).

### 4 TEMPO — durações de entrada, atraso e teto

- **Token/regra:** `--duracao-entrada-texto`, `--duracao-entrada-cortina`,
  `--duracao-entrada-traco`, `--duracao-entrada-hodometro`,
  `--duracao-estrada`, `--atraso-escalonamento`, `--escalonamento-teto`
  (cada duração com o par `--transition-duration-*`). Removido:
  `--duracao-entrada` 700ms.
- **Valor:** texto 400ms (sobe 16px); cortina 500ms (frente paralela ao
  chanfro, do canto superior esquerdo até ele); traço 300ms; hodômetro
  800ms; estrada 1600ms (4×400); atraso 60ms; teto 300ms.
- **Uso:** atraso de cada item = `min(ordem × 60ms, 300ms)`, com a ordem
  contada no lote. Observer com `rootMargin` 0. O movimento em si é de P3.
- **Razão:** o desenho (§5) exige início ≤100 ms, texto ≤500 ms, cortina
  ≤600 ms e escalonamento TOTAL ≤300 ms (antes 90 ms × n); parado 1 s,
  nada visível pode ficar oculto (a crítica a 360 achou faixa branca de
  até 173 px).

### 6 BARRA — `--spacing-barra`

- **Token/regra:** `--spacing-barra`.
- **Valor:** 4rem = filete de 2 `ambar-500` + 6 + botões de 48 + 8; fundo
  `grafite-950`; colunas 3fr/2fr (WhatsApp/Ligar), vão 8.
- **Uso:** abaixo de 768, a altura da barra, o padding inferior do body e o
  `scroll-padding-bottom` valem token + safe-area; o inset fica DENTRO da
  barra; `viewport-fit=cover` em Base.astro. A implementação é de P2.
- **Razão:** barra fixa, opaca e sempre presente a <768, com altura de
  60–64 px num token e alvos ≥48 (DESENHO §4). Barra de 60 descartada:
  razão não registrada.

### 7 ALVO — `--spacing-alvo`

- **Token/regra:** `--spacing-alvo`.
- **Valor:** 3rem (48px); 8px entre alvos.
- **Uso:** todo interativo ≥ 48×48 (chips, luzes, marca, telefones,
  créditos). Só o link dentro de frase é isento.
- **Razão:** a medição achou alvos abaixo de 48 px: "Ligar" do cabeçalho
  com 36, chips com 35,5, telefone do rodapé com 24, créditos com 17 e o
  link do logo com 38 a 360. Alvo de 44 descartado: razão não registrada.

### 8 ABRIDOR — `CabecalhoSecao.astro` (implementação em P2)

- **Token/regra:** três variantes de abridor de seção.
- **Valor:** *etiqueta*: filete 32×2, H2 36/48/60, a ≥1024 lead à direita
  7/5 (Serviços, FAQ). *placa*: bloco `grafite-950` com `chanfro-sm`,
  padding 24/32, H2 `off-white` 30/36/48, lead fora; em painel escuro
  entra nele (Sintomas, Como funciona, Localização). *dado*: valor de
  `oficina.ts`, Barlow 800 tabular 72/96/128, na cor do eyebrow do tom
  (`ambar-700` no claro, `ambar-500` no escuro; ADENDO 3 item 4), H2
  30/36/36 (Sobre). Em superfície âmbar o abridor não entra.
- **Uso:** seções vizinhas não repetem a mesma variante. Abridor sticky
  descartado.
- **Razão:** razão não registrada (o desenho só pede "3 variantes de
  abridor" em P1a).

### 9 FOTO — receita de tratamento (implementação na fatia de fotos)

- **Token/regra:** `scripts/tratar-fotos/index.js`; original fora de `src/`.
- **Valor (receita transcrita da decisão):** mestres: hero 3:2 1920×1280;
  serviço 3:2 1440×960; sobre 4:5 1440×1800. Três passadas sharp, com
  ordem interna fixa e PNG entre elas. A: rotate, extract, resize.
  B: `linear([gR,1,gB])`, com gB calculado primeiro:
  gB = clamp(0,94·mG/mB; 0,94; 1,12) e
  gR = clamp(1,04·mG/mR; 0,90; min(1,15; 1,106·gB)); `normalise(1,99)`.
  C: saturation 0.80; `gamma(1, g0)`, g0 = clamp(0,6625 + 0,0075·lumaA;
  1,00; 1,15) a 0,01, lumaA = luma média da saída de A;
  `linear([.9294,.9176,.8980],[10,11,13])`. Luma média da tratada ≥
  original; se não for, gammaOut = min(1,30; g0 + k·0,05). Mestre JPEG
  q90; build AVIF q50 + WebP q75; em DEV só WebP. (ADENDO G1-FOTOS,
  2026-09-19: mudaram só o clamp de B e a gama/linear de C.)
- **Uso:** toda foto da página passa pela receita. Texto nunca sobre foto,
  foto nunca sob véu nem gradiente (ver Regras do projeto).
- **Regra de uso (ADENDO G1-FOTOS):** nem preto puro dá borda legível
  contra grafite-950 (~1,1:1). Foto com preto na borda não vai em slot que
  encosta em painel escuro; a troca T4-c → T4-a no servico-1 é a correção,
  a receita só tira o leitoso e o igual-à-página.
- **Razão:** "cinco fotos, cinco paletas" na crítica a 1440 → UNIFICAR,
  NÃO ESCURECER: uma temperatura, saturação reduzida, mesma curva, e a
  tratada não sai mais escura que a original (DESENHO §3). Escurecer e
  grão foram descartados. Adendo: o piso de gB é o próprio alvo e o teto
  de calor gR/gB ≤ 1,04/0,94 = 1,106 (a receita aquece até onde aqueceria
  uma foto neutra, nunca além; média azul por causa do ASSUNTO para de
  amarelar o branco); o offset é metade de grafite-950, no mesmo matiz,
  abaixo do painel em que a foto encosta, com o branco em (247,245,242);
  chave baixa (lumaA ≤ 45) não tem a sombra aberta.

## ADENDO 3 — foco, hover da foto, abridor dado, botão por tom (ACAB)

Texto literal em `DECISOES-P1a.md` ("ADENDO 3"). Regra-mãe: âmbar sobre
claro = `ambar-700`; sobre grafite = `ambar-500`; sobre âmbar =
`grafite-950`.

### Foco (item 6)

- **Token:** `--color-foco` (utilitário `outline-foco`), em `global.css`.
- **Regra:** um só anel para todo interativo, em `:focus-visible`
  (`@layer base`): sólido de 2px, afastado 2px, `scroll-m-3xs`. Nenhum
  componente põe `focus-visible:outline-*` próprio.
- **Cor por superfície:** `data-superficie` no elemento que pinta o
  fundo. Clara é o padrão (`:root`): `ambar-700`. `data-superficie="grafite"`:
  `ambar-500` (Hero, painel de Sintomas, faixa Peças de Serviços,
  destino do Como funciona, coluna escura de Localização, Rodapé, barra
  fixa). `data-superficie="ambar"`: `grafite-950` (CTA final).
- **Mapa de Localização:** `tabindex="-1"` no iframe. O foco dentro de um
  documento de outra origem não recebe o anel nem respeita a reserva da
  barra fixa; o que o mapa oferece está nos links ao lado (Como chegar,
  Waze, Google). Clique e toque não mudam.

### Hover da foto (item 1)

- **Token:** `--escala-foto-aproxima: 1.04`.
- **Regra:** `ui/Foto` aproxima a imagem dentro da moldura em
  `duracao-lenta` / `ease-padrao`, origem no centro, só com hover real
  (`hover:hover`) e sem movimento reduzido (`motion-safe`; sem substituto).
  Nada no toque, sem `:active` nem foco: nenhuma Foto é link. O `scale(1.08)`
  do keyframe `foto-assentar` é entrada e sai em P3.

### Botão por tom (itens 2 e 3)

Toda variante com `tom` tem `border-2`; sem contorno visível ela é
`border-transparent` (caixa igual à do contorno vizinho; WhatsApp e
Ligar empilhados ficam da mesma altura).

| tom | primário | WhatsApp | contorno (Ligar) | fantasma |
|---|---|---|---|---|
| claro | `ambar-500` + `grafite-950`, borda `grafite-950`; hover `ambar-400`, active `ambar-600` | `whatsapp-700` + `white`; hover/active `whatsapp-800` | `grafite-800`, borda `grafite-800` | `grafite-800`; hover/active fundo `grafite-100` |
| escuro | `ambar-500` + `grafite-950`, borda transparente; hover `ambar-400`, active `ambar-600` | `whatsapp-400` + `grafite-950`; hover `whatsapp-300` | `off-white`, borda `grafite-400`; hover borda `ambar-500` + texto `ambar-400` | `off-white`; hover/active fundo `grafite-800` + texto `ambar-400` |
| âmbar | `grafite-950` + `ambar-500`, borda transparente; hover/active `grafite-800` | `whatsapp-800` + `white`, sem cor no hover/active (só o transform) | `grafite-950`, borda `grafite-950`; hover/active fundo `grafite-950` + texto `ambar-500` | `grafite-950`; hover `ambar-400`, active `ambar-600` |

- **Uso do fantasma:** não tem forma (isento do 3:1): só ação terciária,
  com ícone, junto de botão com forma; nunca ação única. Sem uso hoje.
- Sem `tom`, o botão mantém as cores de antes (`classesVariante`).

### Selo do CTA (item 5)

- 72px (`size-2xl`) em toda largura: S completo (≥32), 3× a pista de 24,
  mesma altura da marca do rodapé.
