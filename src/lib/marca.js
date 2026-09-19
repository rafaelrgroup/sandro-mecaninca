// Marca da oficina: a RECRIAÇÃO do letreiro da fachada (P4, fatias MC1,
// MC1b e MC4). A marca "S-chave" da decisão P1a (item 1) foi APOSENTADA na
// MC4 (2026-09-19): errata em /tmp/nostop-cwd/DECISOES-P1a.md, item 1.
//
// Fonte única: consumida por src/components/ui/Marca.astro e
// src/components/secoes/CtaFinal.astro (inline, cores por var()) e por
// scripts/gerar-marca/index.js (arquivos de public/, cores resolvidas, por
// `arquivosSvgMarca`). O teste testes/marca-geometria.mjs confere public/
// contra esta geração e contra scripts/gerar-marca/origem.json.
//
// JavaScript puro (sem TypeScript) de propósito: o gerador roda direto no
// Node, sem transpilador.

/** Regras de tamanho (altura em px na tela), mantidas da decisão P1a e
 * confirmadas na MC1 (buraco 3): abaixo de 40 px, sem descritor (só SANDRO
 * com o mostrador); abaixo de 24 px, só o selo. */
export const ALTURA_MIN_COM_DESCRITOR = 40;
export const ALTURA_MIN_ASSINATURA = 24;

/** Polígono do selo: quadrado de lado 160 com o canto inferior direito
 * chanfrado. É o chanfro do sistema do site, não vem do letreiro
 * (origem.json, nao_vem_do_letreiro). O conteúdo é `seloLetreiroSvg`. */
export const SELO = {
  lado: 160,
  poligono: "0,0 160,0 160,120 120,160 0,160",
};

// ===========================================================================
// MARCA DO LETREIRO (P4, fatias MC1/MC1b; portão MC2: RECRIADO).
//
// Recriação da marca que já existe na fachada da oficina (fotos 01 e 08 do
// perfil Google, recortes em perfil-google/logo-ref/). Desde a MC4 é a
// única marca: site (MC3) e public/ (MC4) saem daqui.
//
// Origem de cada parte (foto, sha256, caixa do recorte, ponto de amostra
// de cor) e o que NÃO vem do letreiro: scripts/gerar-marca/origem.json.
//
// Unidade: a altura das maiúsculas de SANDRO = 100. Medidas lidas no
// recorte simbolo-sandro-foto01-ampliado-3x.png depois de nivelar (1,51°)
// e desfazer o cisalhamento da perspectiva (4,5%). MECÂNICA foi medida na
// foto 01 com o mesmo nivelamento e desenhada na própria unidade (maiúscula
// = 100) e reduzida a 0,5 — a razão lida entre as duas palavras.
//
// Contornos: `[x, y, r]` = vértice e raio do arredondamento naquele canto
// (0 = canto vivo). `contornoArredondado()` expande para um caminho SVG
// (L + A), sem curva livre. Cantos côncavos (colchete de serifa) usam o
// mesmo raio: o arco sai para o lado certo pelo sentido da volta.
// ===========================================================================

const arred = (n) => Math.round(n * 100) / 100;

/** Expande um polígono de vértices `[x, y, r]` num subcaminho SVG fechado
 * com os cantos arredondados (raio encolhe se o lado não comporta). */
export function contornoArredondado(pontos) {
  const n = pontos.length;
  const partes = [];
  for (let i = 0; i < n; i++) {
    const [x, y, r = 0] = pontos[i];
    const [xa, ya] = pontos[(i + n - 1) % n];
    const [xp, yp] = pontos[(i + 1) % n];
    if (!r) {
      partes.push({ ent: [x, y], sai: [x, y] });
      continue;
    }
    const la = Math.hypot(xa - x, ya - y);
    const lp = Math.hypot(xp - x, yp - y);
    const u1 = [(xa - x) / la, (ya - y) / la];
    const u2 = [(xp - x) / lp, (yp - y) / lp];
    const meio = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]))) / 2;
    let t = r / Math.tan(meio);
    const tMax = Math.min(la, lp) / 2;
    const raio = t > tMax ? tMax * Math.tan(meio) : r;
    t = Math.min(t, tMax);
    const giro = u1[0] * u2[1] - u1[1] * u2[0]; // < 0: volta no sentido horário da tela
    partes.push({
      ent: [x + u1[0] * t, y + u1[1] * t],
      sai: [x + u2[0] * t, y + u2[1] * t],
      arco: `A${arred(raio)} ${arred(raio)} 0 0 ${giro < 0 ? 1 : 0} `,
    });
  }
  let d = `M${arred(partes[0].sai[0])} ${arred(partes[0].sai[1])}`;
  for (let i = 1; i <= n; i++) {
    const p = partes[i % n];
    d += ` L${arred(p.ent[0])} ${arred(p.ent[1])}`;
    if (p.arco) d += ` ${p.arco}${arred(p.sai[0])} ${arred(p.sai[1])}`;
  }
  return `${d} Z`;
}

/** SANDRO: S-A-N-D-R, face amarela. `x` = deslocamento da letra. O risco
 * do A e do R que a MC1 desenhou SAIU na MC1b (portão MC2): é emenda da
 * face do acrílico, não desenho (origem.json, parte "sandro-fenda"). */
export const LETREIRO_SANDRO = [
  {
    letra: "S",
    x: 0,
    pontos: [[0, 0, 16], [74, 0], [74, 22.5], [15, 22.5], [15, 39], [78, 39, 18], [78, 100, 16], [4, 100], [4, 77.5], [63, 77.5], [63, 61], [0, 61, 18]],
  },
  {
    letra: "A",
    x: 92.5,
    pontos: [[0, 100], [0, 0, 22], [81, 0, 22], [81, 100], [65.5, 100], [65.5, 68], [26.5, 68], [26.5, 46], [65.5, 46], [65.5, 23], [15.5, 23], [15.5, 100]],
  },
  {
    letra: "N",
    x: 187,
    pontos: [[0, 0], [15.5, 0], [53.5, 62], [53.5, 0], [70.5, 0], [70.5, 100], [53.5, 100], [53.5, 95], [15.5, 34], [15.5, 100], [0, 100]],
  },
  {
    letra: "D",
    x: 270.5,
    pontos: [[0, 0, 8], [72.5, 0, 30], [72.5, 100, 15], [0, 100], [0, 39], [15.5, 39], [15.5, 77.5], [57, 77.5], [57, 23, 6], [0, 23]],
  },
  {
    letra: "R",
    x: 356,
    pontos: [[0, 0, 6], [80, 0, 22], [80, 68, 14], [56, 68], [73.5, 100], [57.5, 100], [25, 46], [64.5, 46], [64.5, 23, 6], [15.5, 23], [15.5, 100], [0, 100]],
  },
];

/** O de SANDRO = mostrador. Centro do anel amarelo em (495.5, 57.1).
 * Medidas em coordenadas do centro, y PARA CIMA (como na leitura radial
 * feita na foto): anel R 42.5 / r 21.5, corte direito em y=+3.5; o braço
 * esquerdo acaba em ponta na circunferência externa em y=+25.5, e a borda
 * interna sobe até ela num arco tangente ao furo (MC1b). Bisel prata
 * entre a circunferência externa, o anel afastado (R 44) e a interna; a
 * divisa clara/escura sai de K rumo a 56°; a zona escura fecha na reta que
 * passa por `linhaEscura` e na base em y=+10. Os vértices saem das
 * interseções dessas primitivas (mostradorCaminhos). Ponteiro: sai do
 * cubo e passa por cima do bisel, como na foto. */
export const LETREIRO_MOSTRADOR = {
  centro: [495.5, 57.1],
  anel: { raio: 42.5, raioInterno: 21.5, corteDireito: 3.5, corteEsquerdo: 25.5 },
  bisel: {
    externo: { centro: [-2, 9.5], raio: 44 },
    afastamento: 44,
    interno: { centro: [-14, 4], raio: 34 },
    divisa: 56,
    linhaEscura: { ponto: [17.7, 9.3], direcao: [-7.8, 24.3] },
    base: 10,
  },
  // Largura média do ponteiro = meiaBase + meiaPonta = 7,6 ≈ 1/11 do
  // diâmetro do anel (85), como na foto 01 (MC1b; antes 3,6 ≈ 1/19).
  ponteiro: { cubo: [-4.3, 6.4], raioCubo: 3.6, angulo: 59, inicio: 5, ponta: 34, meiaBase: 4.8, meiaPonta: 2.8 },
};

/** Interseções (y para cima). */
function circulos([x1, y1], r1, [x2, y2], r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.hypot(dx, dy);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(r1 * r1 - a * a);
  const [mx, my] = [x1 + (a * dx) / d, y1 + (a * dy) / d];
  return [
    [mx + (h * dy) / d, my - (h * dx) / d],
    [mx - (h * dy) / d, my + (h * dx) / d],
  ];
}
function retaCirculo([px, py], [ux, uy], [cx, cy], r) {
  // p + t u; devolve os dois pontos em ordem de t.
  const [fx, fy] = [px - cx, py - cy];
  const a = ux * ux + uy * uy;
  const b = 2 * (fx * ux + fy * uy);
  const c = fx * fx + fy * fy - r * r;
  const raiz = Math.sqrt(b * b - 4 * a * c);
  return [(-b - raiz) / (2 * a), (-b + raiz) / (2 * a)].map((t) => [px + t * ux, py + t * uy]);
}

/** Caminhos do mostrador em coordenadas SVG da assinatura. */
export function mostradorCaminhos() {
  const { centro, anel, bisel, ponteiro } = LETREIRO_MOSTRADOR;
  const [cx, cy] = centro;
  const p = ([x, y]) => `${arred(cx + x)} ${arred(cy - y)}`;
  const { raio: R, raioInterno: r, corteDireito: cd, corteEsquerdo: ce } = anel;
  // Ponta do braço esquerdo: T na circunferência externa; a borda interna
  // desce de T até (-r, 0) num arco de centro no eixo x (tangente ao furo).
  const T = [-Math.sqrt(R * R - ce * ce), ce];
  const dx = T[0] + r;
  const raioPonta = arred((dx * dx + ce * ce) / (-2 * dx));
  const anelD =
    `M${p([Math.sqrt(R * R - cd * cd), cd])} A${R} ${R} 0 1 1 ${p(T)}` +
    ` A${raioPonta} ${raioPonta} 0 0 1 ${p([-r, 0])} A${r} ${r} 0 1 0 ${p([Math.sqrt(r * r - cd * cd), cd])} Z`;
  const { externo, interno, afastamento: Ra, linhaEscura, base } = bisel;
  const Re = externo.raio;
  const Ri = interno.raio;
  // L1: onde o filete do bisel some, à esquerda (externo x anel afastado, o de baixo).
  const L1 = circulos(externo.centro, Re, [0, 0], Ra).sort((a, b) => a[1] - b[1])[0];
  // M: onde a borda interna deixa o anel e segue pela circunferência interna (o de cima).
  const M = circulos([0, 0], Ra, interno.centro, Ri).sort((a, b) => b[1] - a[1])[0];
  // K: a reta da zona escura encontra a borda interna; P: a divisa no externo.
  const K = retaCirculo(linhaEscura.ponto, linhaEscura.direcao, interno.centro, Ri)[1];
  const t = (bisel.divisa * Math.PI) / 180;
  const P = retaCirculo([0, 0], [Math.cos(t), Math.sin(t)], externo.centro, Re)[1];
  const Q = retaCirculo([0, base], [1, 0], externo.centro, Re)[1];
  const tb = (base - linhaEscura.ponto[1]) / linhaEscura.direcao[1];
  const B = [linhaEscura.ponto[0] + tb * linhaEscura.direcao[0], base];
  const biselD =
    `M${p(K)} L${p(P)} A${Re} ${Re} 0 0 0 ${p(L1)}` + ` A${Ra} ${Ra} 0 0 1 ${p(M)} A${Ri} ${Ri} 0 0 1 ${p(K)} Z`;
  const zonaD = `M${p(K)} L${p(P)} A${Re} ${Re} 0 0 1 ${p(Q)} L${p(B)} Z`;
  // Filete amarelo das fotos 01 e 10: borda de fora do bisel e da cunha
  // (de L1 até Q) e a base da cunha (Q até B). Aberto: é traço, não face.
  const fileteD = `M${p(L1)} A${Re} ${Re} 0 0 1 ${p(P)} A${Re} ${Re} 0 0 1 ${p(Q)} L${p(B)}`;
  const a = (ponteiro.angulo * Math.PI) / 180;
  const u = [Math.cos(a), Math.sin(a)];
  const nrm = [-u[1], u[0]];
  const ao = (d, w) => [ponteiro.cubo[0] + u[0] * d + nrm[0] * w, ponteiro.cubo[1] + u[1] * d + nrm[1] * w];
  const ponteiroD =
    `M${p(ao(ponteiro.inicio, ponteiro.meiaBase))} L${p(ao(ponteiro.ponta, ponteiro.meiaPonta))}` +
    ` L${p(ao(ponteiro.ponta, -ponteiro.meiaPonta))} L${p(ao(ponteiro.inicio, -ponteiro.meiaBase))} Z`;
  const [hx, hy] = ponteiro.cubo;
  const cubo = { cx: arred(cx + hx), cy: arred(cy - hy), r: ponteiro.raioCubo };
  return { anel: anelD, bisel: biselD, zonaEscura: zonaD, filete: fileteD, ponteiro: ponteiroD, cubo };
}

/** MECÂNICA: serifada pesada (colchetes curvos), unidade própria com a
 * maiúscula = 100; o A e o Â são o mesmo desenho. Furo = contraforma. */
const GLIFO_A = {
  largura: 100,
  pontos: [[18, 0, 2], [82, 0, 2], [82, 26, 2], [78, 30, 3], [93, 78, 6], [100, 78, 2], [100, 100, 2], [50, 100, 2], [50, 84], [54, 70, 3], [36, 70, 3], [39, 84], [39, 100, 2], [0, 100, 2], [0, 79, 2], [6, 79, 6], [22, 30, 3], [18, 26, 2]],
  furo: [[40.5, 53], [48, 53], [44.5, 43]],
};
const GLIFO_C = {
  largura: 95,
  pontos: [[0, 0, 34], [95, 0, 20], [93, 33, 3], [80, 37], [62, 24], [44, 24, 20], [44, 76, 20], [62, 76], [80, 62], [94, 64, 3], [95, 100, 30], [0, 100, 46]],
};
export const LETREIRO_MECANICA = {
  escala: 0.5,
  y: 25,
  letras: [
    {
      letra: "M",
      x: 0,
      largura: 145,
      pontos: [[0, 0, 2], [56, 0], [71, 23], [84, 0], [145, 0, 2], [145, 22, 2], [136, 22, 6], [136, 76, 6], [145, 76, 2], [145, 100, 2], [92, 100, 2], [92, 76, 2], [102, 76, 6], [102, 41.85], [74, 100], [64, 100], [31, 34], [31, 76, 6], [41, 76, 2], [41, 100, 2], [0, 100, 2], [0, 76, 2], [10, 76, 6], [10, 22, 6], [0, 22, 2]],
    },
    {
      letra: "E",
      x: 160.3,
      largura: 94,
      pontos: [[0, 0, 2], [94, 0, 2], [94, 34, 3], [82, 34], [66, 23], [43, 23, 6], [43, 41, 6], [64, 41, 3], [64, 59, 3], [43, 59, 6], [43, 77, 6], [66, 77], [82, 64], [94, 64, 3], [94, 100, 2], [0, 100, 2], [0, 77, 2], [9, 77, 6], [9, 23, 6], [0, 23, 2]],
    },
    { letra: "C", x: 270.5, ...GLIFO_C },
    { letra: "Â", x: 383.3, ...GLIFO_A, acento: [[37, -36, 2], [57, -36, 2], [75, -8, 2], [59, -8, 2], [48, -14], [37, -8, 2], [21, -8, 2]] },
    {
      letra: "N",
      x: 502.5,
      largura: 106,
      pontos: [[0, 0, 2], [42, 0], [75, 46.2], [75, 24, 6], [64, 24, 2], [64, 0, 2], [106, 0, 2], [106, 24, 2], [100, 24, 6], [100, 100, 2], [68, 100], [30, 49], [30, 78, 6], [42, 78, 2], [42, 100, 2], [0, 100, 2], [0, 78, 2], [8, 78, 6], [8, 24, 6], [0, 24, 2]],
    },
    {
      letra: "I",
      x: 625.6,
      largura: 56,
      pontos: [[0, 0, 2], [56, 0, 2], [56, 22, 2], [46, 22, 6], [46, 78, 6], [56, 78, 2], [56, 100, 2], [0, 100, 2], [0, 78, 2], [10, 78, 6], [10, 22, 6], [0, 22, 2]],
    },
    { letra: "C", x: 692.3, ...GLIFO_C },
    { letra: "A", x: 801.3, ...GLIFO_A },
  ],
};

/** Composição: MECÂNICA à esquerda, SANDRO à direita, MECÂNICA centrada na
 * altura de SANDRO (como no letreiro nivelado). O vão entre as palavras e a
 * margem do painel NÃO vêm do letreiro (lá o painel tem 11 m e telefones):
 * ver origem.json. */
export const LETREIRO_COMPOSICAO = {
  larguraMecanica: 450.65, // (801.3 + 100) x 0.5
  vao: 48,
  xSandro: 498.65,
  larguraSandro: 538,
  margem: 24,
  // Contorno escuro (MC1b, interpretação declarada em origem.json): fio
  // em volta de toda face (1 para fora) + a mesma face deslocada para a
  // esquerda e para baixo, que engrossa a borda desses dois lados como na
  // foto 01. Vale igual para SANDRO, mostrador e MECÂNICA.
  contorno: { fio: 1, sombra: [-3, 3] },
  filete: 2.5, // filete amarelo do bisel e da cunha (traço centrado)
};
const { xSandro, larguraSandro, margem, larguraMecanica, vao } = LETREIRO_COMPOSICAO;
export const LETREIRO_VIEWBOX_COMPLETA = `${-margem} ${-margem} ${arred(larguraMecanica + vao + larguraSandro + 2 * margem)} ${100 + 2 * margem}`;
export const LETREIRO_VIEWBOX_SEM_DESCRITOR = `${-margem} ${-margem} ${larguraSandro + 2 * margem} ${100 + 2 * margem}`;

/** Cores da marca do letreiro: tokens de src/styles/global.css. */
export const LETREIRO_TOKENS = {
  painel: "grafite-950",
  amarelo: "marca-amarelo",
  vermelho: "marca-vermelho",
  prata: "marca-prata",
  prataEscura: "marca-prata-escura",
  contorno: "marca-contorno",
};
/** Cores como var() dos tokens (para SVG inline no site). */
export const LETREIRO_CORES_VAR = Object.fromEntries(
  Object.entries(LETREIRO_TOKENS).map(([parte, token]) => [parte, `var(--color-${token})`]),
);
/** Cores resolvidas a partir do mapa de lerCores() (arquivos avulsos). */
export function coresLetreiro(mapaTokens) {
  return Object.fromEntries(
    Object.entries(LETREIRO_TOKENS).map(([parte, token]) => {
      if (!mapaTokens[token]) throw new Error(`token --color-${token} ausente`);
      return [parte, mapaTokens[token]];
    }),
  );
}

/** Camada do contorno escuro sob as faces `d` (ver LETREIRO_COMPOSICAO).
 * `regra` evenodd só para MECÂNICA (furo do A); nas outras faces, nonzero:
 * bisel e cunha se tocam e evenodd abriria falha no contorno. */
function contornoSvg(d, cor, regra = "nonzero") {
  const { fio, sombra } = LETREIRO_COMPOSICAO.contorno;
  return (
    `<g data-parte="contorno" fill="${cor}" stroke="${cor}" stroke-width="${2 * fio}" stroke-linejoin="round" fill-rule="${regra}">` +
    `<path d="${d}" transform="translate(${sombra[0]} ${sombra[1]})"/><path d="${d}"/></g>`
  );
}
/** Faces do mostrador na ordem de pintura + filete e ponteiro por cima. */
function mostradorSvg(m, cores) {
  return (
    `<path data-parte="mostrador-anel" d="${m.anel}" fill="${cores.amarelo}"/>` +
    `<path data-parte="mostrador-bisel" d="${m.bisel}" fill="${cores.prata}"/>` +
    `<path data-parte="mostrador-zona-escura" d="${m.zonaEscura}" fill="${cores.prataEscura}"/>` +
    `<path data-parte="mostrador-filete" d="${m.filete}" fill="none" stroke="${cores.amarelo}" stroke-width="${LETREIRO_COMPOSICAO.filete}" stroke-linecap="butt"/>` +
    `<path data-parte="mostrador-ponteiro" d="${m.ponteiro}" fill="${cores.vermelho}"/>` +
    `<circle data-parte="mostrador-cubo" cx="${m.cubo.cx}" cy="${m.cubo.cy}" r="${m.cubo.r}" fill="${cores.prata}"/>`
  );
}

/** Caminho único (subcaminhos) de uma palavra. */
function sandroD() {
  return LETREIRO_SANDRO.map((l) =>
    contornoArredondado(l.pontos.map(([x, y, r]) => [x + l.x, y, r])),
  ).join(" ");
}
function mecanicaD() {
  const { escala, y: y0 } = LETREIRO_MECANICA;
  const t = (x0) => ([x, y, r = 0]) => [arred((x0 + x) * escala), arred(y0 + y * escala), r * escala];
  return LETREIRO_MECANICA.letras
    .flatMap((l) => {
      const sub = [contornoArredondado(l.pontos.map(t(l.x)))];
      if (l.furo) sub.push(contornoArredondado(l.furo.map(t(l.x))));
      if (l.acento) sub.push(contornoArredondado(l.acento.map(t(l.x))));
      return sub;
    })
    .join(" ");
}

/** Todos os caminhos da marca do letreiro, em unidades da assinatura
 * (MECÂNICA já na posição e escala; SANDRO sem o deslocamento xSandro). */
export function letreiroCaminhos() {
  return { mecanica: mecanicaD(), sandro: sandroD(), ...mostradorCaminhos() };
}

/**
 * Conteúdo (sem o <svg> externo) da marca do letreiro. `comDescritor`
 * inclui MECÂNICA; sem ele, só SANDRO com o mostrador (regra: < 40 px).
 * `cores` = LETREIRO_CORES_VAR (site) ou coresLetreiro(lerCores(...)).
 * `painel` false omite o retângulo preto (não usar sobre fundo claro: o
 * amarelo sem painel não passa 3:1 — ver origem.json, buraco 2).
 */
export function letreiroSvg({ comDescritor = true, cores = LETREIRO_CORES_VAR, painel = true } = {}) {
  const [vx, vy, vw, vh] = (comDescritor ? LETREIRO_VIEWBOX_COMPLETA : LETREIRO_VIEWBOX_SEM_DESCRITOR).split(" ");
  const dx = comDescritor ? xSandro : 0;
  const m = mostradorCaminhos();
  const sandro = sandroD();
  const mecanica = comDescritor ? mecanicaD() : "";
  return (
    (painel ? `<rect data-parte="painel" x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${cores.painel}"/>` : "") +
    (comDescritor
      ? contornoSvg(mecanica, cores.contorno, "evenodd") + `<path data-parte="mecanica" d="${mecanica}" fill="${cores.vermelho}" fill-rule="evenodd"/>`
      : "") +
    `<g transform="translate(${dx} 0)">` +
    contornoSvg([sandro, m.anel, m.bisel, m.zonaEscura].join(" "), cores.contorno) +
    `<path data-parte="sandro" d="${sandro}" fill="${cores.amarelo}"/>` +
    mostradorSvg(m, cores) +
    `</g>`
  );
}

/** SELO do letreiro (lado 160, o polígono chanfrado de SELO): o mostrador
 * de SANDRO sobre o painel preto (MC1, buraco 1). Usado no CtaFinal (MC3) e,
 * na MC4, no logo-mark, no favicon e no apple-touch-icon. */
export const LETREIRO_SELO = { lado: 160, escala: 1.2, translacao: [82.1, 85.7] };
export function seloLetreiroSvg({ cores = LETREIRO_CORES_VAR } = {}) {
  const m = mostradorCaminhos();
  const [cx, cy] = LETREIRO_MOSTRADOR.centro;
  const { escala, translacao } = LETREIRO_SELO;
  return (
    `<polygon data-parte="painel" points="${SELO.poligono}" fill="${cores.painel}"/>` +
    `<g transform="translate(${translacao[0]} ${translacao[1]}) scale(${escala}) translate(${-cx} ${-cy})">` +
    contornoSvg([m.anel, m.bisel, m.zonaEscura].join(" "), cores.contorno) +
    mostradorSvg(m, cores) +
    `</g>`
  );
}

/** Escapa texto para atributo XML. */
const attrXml = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Marca do letreiro como SVG avulso (arquivo), com cores já resolvidas
 * (`coresLetreiro`). `extra` vai na raiz (ex.: x/y/width/height no OG). */
export function letreiroSvgAvulso({ comDescritor, cores, nome, extra = "" }) {
  const viewBox = comDescritor ? LETREIRO_VIEWBOX_COMPLETA : LETREIRO_VIEWBOX_SEM_DESCRITOR;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${attrXml(nome)}"${extra}>${letreiroSvg({ comDescritor, cores })}</svg>`;
}

/** Selo do letreiro como SVG avulso (lado 160). */
export function seloLetreiroSvgAvulso({ cores, nome }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SELO.lado} ${SELO.lado}" role="img" aria-label="${attrXml(nome)}">${seloLetreiroSvg({ cores })}</svg>`;
}

/**
 * Os quatro SVG de public/ (MC4), um texto por arquivo. Fonte única do
 * gerador (scripts/gerar-marca/index.js) e do teste
 * (testes/marca-geometria.mjs). Decisões da P4: selo = o mostrador sobre o
 * painel; favicon e tamanhos pequenos = o selo; MECÂNICA separável.
 */
export function arquivosSvgMarca({ cores, nome }) {
  const selo = seloLetreiroSvgAvulso({ cores, nome }) + "\n";
  return {
    "logo.svg": letreiroSvgAvulso({ comDescritor: true, cores, nome }) + "\n",
    "marca-sem-descritor.svg": letreiroSvgAvulso({ comDescritor: false, cores, nome }) + "\n",
    "logo-mark.svg": selo,
    "favicon.svg": selo,
  };
}
