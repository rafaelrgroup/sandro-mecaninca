#!/usr/bin/env node
// PRANCHA da marca para o G1 (CRITICO_VISUAL), renderizada PELO NAVEGADOR.
// Mostra a marca do letreiro (MC4), o selo e o favicon servido nos tamanhos
// do desenho (16/32/64/256) e nos do site (cabeçalho 48, rodapé 72), sobre
// claro, escuro e âmbar, aplicando as regras de tamanho:
//   < 40 px → sem descritor (só SANDRO); < 24 px → só o selo. O selo é um
//   desenho só (mostrador sobre o painel) em qualquer tamanho e fundo.
//
// Saída (fora de src/): <dir>/prancha.html (abre sozinho, com as fontes e
// os SVG copiados ao lado), prancha.png (DPR 1, pixels reais) e recortes
// ampliados 8x (vizinho mais próximo) da faixa de 32 px e de 16 px.
//
// Rode "node scripts/gerar-marca/index.js" antes: a prancha usa os arquivos
// de public/ como são servidos.
// Uso: node scripts/gerar-marca/prancha.js [dir-de-saida]   (padrão: ../prancha)
//
// P4 (MC1): com --letreiro, gera em vez disso a PRANCHA DO COMPARATIVO da
// marca recriada do letreiro da fachada, lendo src/lib/marca.js (não lê
// public/): recorte da foto x SVG renderizado, lado a lado, sobre claro e
// escuro, a 72, 48 e 32 px; selo; detalhe e sobreposição na foto nivelada.
// Uso: node scripts/gerar-marca/prancha.js --letreiro [dir]   (padrão: ../prancha-p4)

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  SELO,
  ALTURA_MIN_COM_DESCRITOR,
  ALTURA_MIN_ASSINATURA,
  LETREIRO_VIEWBOX_COMPLETA,
  LETREIRO_VIEWBOX_SEM_DESCRITOR,
  LETREIRO_MOSTRADOR,
  letreiroSvg,
  letreiroCaminhos,
  seloLetreiroSvg,
  coresLetreiro,
} from "../../src/lib/marca.js";
import { abrirNavegador, lerCores } from "./navegador.js";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
if (process.argv.includes("--letreiro")) {
  await comparativoLetreiro(process.argv.slice(2).filter((a) => a !== "--letreiro")[0]);
  process.exit(0);
}
const saida = path.resolve(process.argv[2] ?? path.join(raiz, "../prancha"));
mkdirSync(path.join(saida, "fontes"), { recursive: true });

const nome = readFileSync(path.join(raiz, "src/data/oficina.ts"), "utf-8").match(
  /export const oficina: Oficina = \{[\s\S]*?\bnome:\s*"([^"]+)"/,
)?.[1];
if (!nome) throw new Error("oficina.nome não encontrado");
const cor = lerCores(path.join(raiz, "src/styles/global.css"));
const coresMarca = coresLetreiro(cor);

// Arquivos servidos, copiados para a prancha abrir sozinha.
for (const f of ["favicon.svg", "logo-mark.svg", "logo.svg", "marca-sem-descritor.svg"]) {
  copyFileSync(path.join(raiz, "public", f), path.join(saida, f));
}
copyFileSync(
  path.join(raiz, "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"),
  path.join(saida, "fontes/inter.woff2"),
);

const TONS = [
  { id: "claro", titulo: "Sobre claro (off-white)", fundo: cor["off-white"], rotulo: cor["grafite-500"] },
  { id: "escuro", titulo: "Sobre escuro (grafite-950)", fundo: cor["grafite-950"], rotulo: cor["grafite-400"] },
  { id: "ambar", titulo: "Sobre âmbar (ambar-500)", fundo: cor["ambar-500"], rotulo: cor["grafite-950"] },
];

/** Marca na altura `px`, aplicando as regras de tamanho (sempre com o
 * painel: a marca do letreiro não vai sem ele). */
function marca(px) {
  if (px < ALTURA_MIN_ASSINATURA) return selo(px, "só o selo (< 24 px)");
  const comDescritor = px >= ALTURA_MIN_COM_DESCRITOR;
  const vb = comDescritor ? LETREIRO_VIEWBOX_COMPLETA : LETREIRO_VIEWBOX_SEM_DESCRITOR;
  const svg = `<svg viewBox="${vb}" style="height:${px}px;width:auto" role="img" aria-label="${nome}">${letreiroSvg({ comDescritor, cores: coresMarca })}</svg>`;
  return celula(svg, `${px} px · ${comDescritor ? "com descritor" : "sem descritor (< 40 px)"}`);
}
function selo(px, nota = "selo") {
  const svg = `<svg viewBox="0 0 ${SELO.lado} ${SELO.lado}" style="height:${px}px;width:${px}px">${seloLetreiroSvg({ cores: coresMarca })}</svg>`;
  return celula(svg, `${px} px · ${nota}`);
}
function favicon(px) {
  return celula(`<img src="favicon.svg" width="${px}" height="${px}" alt="">`, `${px} px · favicon.svg servido (selo)`);
}
const celula = (conteudo, legenda) => `<figure>${conteudo}<figcaption>${legenda}</figcaption></figure>`;

const secao = (tom) => `
<section class="tom" id="tom-${tom.id}" style="background:${tom.fundo};--rotulo:${tom.rotulo}">
  <h2>${tom.titulo}</h2>
  <div class="linha">${marca(256)}${selo(256)}${favicon(256)}</div>
  <div class="linha">${marca(72).replace("com descritor", "com descritor · rodapé")}${marca(64)}${marca(48).replace("com descritor", "com descritor · cabeçalho")}</div>
  <div class="linha" id="linha-32-${tom.id}">${marca(32)}${selo(32)}${favicon(32)}</div>
  <div class="linha" id="linha-16-${tom.id}">${marca(16)}${selo(16)}${favicon(16)}</div>
  <div class="linha">${selo(64)}${favicon(64)}</div>
</section>`;

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Prancha da marca — ${nome}</title>
<style>
@font-face{font-family:"Inter Variable";font-weight:100 900;font-style:normal;src:url(fontes/inter.woff2) format("woff2");}
html,body{margin:0;padding:0;background:${cor["off-white"]};font-family:"Inter Variable",sans-serif}
header{padding:24px 32px;color:${cor["grafite-950"]}}
header h1{margin:0 0 4px;font-size:22px;font-weight:700}
header p{margin:0;font-size:14px;color:${cor["grafite-500"]}}
.tom{padding:24px 32px 32px}
.tom h2{margin:0 0 16px;font-size:16px;font-weight:600;color:var(--rotulo)}
.linha{display:flex;width:fit-content;flex-wrap:wrap;align-items:flex-end;gap:48px;margin-bottom:24px}
figure{margin:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
figure svg,figure img{display:block}
figcaption{font-size:12px;color:var(--rotulo)}
</style></head><body>
<header><h1>Prancha da marca — ${nome}</h1>
<p>Renderizada pelo Chrome. Alturas em px CSS a DPR 1. Marca recriada do letreiro (MC4): &lt; 40 px sem descritor; &lt; 24 px só o selo; cabeçalho 48, rodapé 72. Favicon = o selo.</p></header>
${TONS.map(secao).join("\n")}
</body></html>
`;
writeFileSync(path.join(saida, "prancha.html"), html);

// ------------------------------------------------------------ captura
const rotas = new Map([["/prancha.html", html]]);
for (const f of ["favicon.svg", "logo-mark.svg", "logo.svg", "marca-sem-descritor.svg", "fontes/inter.woff2"]) {
  rotas.set(`/${f}`, { arquivo: path.join(saida, f) });
}
const FONTE = [];
const nav = await abrirNavegador(rotas);
try {
  writeFileSync(path.join(saida, "prancha.png"), await nav.capturar({ rota: "/prancha.html", largura: 1440, altura: 900, fontes: FONTE }));
  // Recortes a DPR 1 (pixels reais) e ampliação 8x por vizinho mais próximo,
  // feita também pelo navegador (image-rendering: pixelated).
  for (const faixa of ["32", "16"]) {
    for (const tom of TONS) {
      const nome1x = `recorte-${faixa}px-${tom.id}-1x.png`;
      const png = await nav.capturar({ rota: "/prancha.html", largura: 1440, altura: 900, fontes: FONTE, seletor: `#linha-${faixa}-${tom.id}` });
      writeFileSync(path.join(saida, nome1x), png);
      const w = png.readUInt32BE(16);
      const h = png.readUInt32BE(20);
      const rota = `/${nome1x}`;
      rotas.set(rota, png);
      rotas.set(
        `/ampliar-${faixa}-${tom.id}.html`,
        `<!doctype html><style>html,body{margin:0;background:${tom.fundo}}img{display:block;width:${w * 8}px;height:${h * 8}px;image-rendering:pixelated}</style><img src="${rota}">`,
      );
      writeFileSync(
        path.join(saida, `recorte-${faixa}px-${tom.id}-ampliado-8x.png`),
        await nav.capturar({ rota: `/ampliar-${faixa}-${tom.id}.html`, largura: w * 8, altura: h * 8 }),
      );
    }
  }
} finally {
  await nav.fechar();
}
console.log(`Prancha em ${saida}: prancha.html, prancha.png, recorte-{32,16}px-{claro,escuro,ambar}-{1x,ampliado-8x}.png`);

// ------------------------------------------------ P4 MC1: --letreiro
// Comparativo da marca do letreiro. Referências: perfil-google/logo-ref/
// (conferidas pelo sha256 de recortes.json antes de usar) e a foto 01
// inteira para a sobreposição do MECÂNICA. A foto 10 (de cliente) NÃO entra.

async function comparativoLetreiro(dirArg) {
  /** Afim 2D no formato do CSS matrix(a, b, c, d, e, f). */
  const afim = {
    compor: ([a2, b2, c2, d2, e2, f2], [a1, b1, c1, d1, e1, f1]) => [
      a2 * a1 + c2 * b1,
      b2 * a1 + d2 * b1,
      a2 * c1 + c2 * d1,
      b2 * c1 + d2 * d1,
      a2 * e1 + c2 * f1 + e2,
      b2 * e1 + d2 * f1 + f2,
    ],
    // Recorte a partir de (ox, oy) e ampliação s.
    recorte: (ox, oy, s) => [s, 0, 0, s, -ox * s, -oy * s],
    // Giro anti-horário na tela (como o Image.rotate do PIL) em volta de (cx, cy).
    giro: (graus, cx, cy) => {
      const t = (graus * Math.PI) / 180;
      const [co, se] = [Math.cos(t), Math.sin(t)];
      return [co, -se, se, co, cx - cx * co - cy * se, cy + cx * se - cy * co];
    },
    // Desfaz o cisalhamento da perspectiva: x' = x - k (y - y0).
    cisalha: (k, y0) => [1, 0, -k, 1, k * y0, 0],
  };

  const obra = path.join(raiz, "..");
  const saidaP4 = path.resolve(dirArg ?? path.join(obra, "prancha-p4"));
  const perfil = path.join(obra, "perfil-google");
  mkdirSync(path.join(saidaP4, "ref"), { recursive: true });
  mkdirSync(path.join(saidaP4, "fontes"), { recursive: true });

  // Referências, conferidas pelo sha256 registrado na colheita.
  const recortes = JSON.parse(readFileSync(path.join(perfil, "logo-ref/recortes.json"), "utf-8"));
  const ref = (arquivo) => {
    const r = recortes.find((x) => x.arquivo === arquivo);
    if (!r) throw new Error(`${arquivo} ausente de logo-ref/recortes.json`);
    const bytes = readFileSync(path.join(perfil, arquivo));
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (sha !== r.sha256) throw new Error(`${arquivo}: sha256 ${sha} ≠ recortes.json ${r.sha256}`);
    writeFileSync(path.join(saidaP4, "ref", path.basename(arquivo)), bytes);
    return { rota: `/ref/${path.basename(arquivo)}`, largura: r.px[0], altura: r.px[1] };
  };
  const letreiro01 = ref("logo-ref/letreiro-foto01-nativo.png");
  const letreiro08 = ref("logo-ref/letreiro-foto08-noite-nativo.png");
  const simbolo = ref("logo-ref/simbolo-sandro-foto01-ampliado-3x.png");
  copyFileSync(path.join(perfil, "fotos/01.jpg"), path.join(saidaP4, "ref/01.jpg"));
  copyFileSync(
    path.join(raiz, "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"),
    path.join(saidaP4, "fontes/inter.woff2"),
  );

  const cor = lerCores(path.join(raiz, "src/styles/global.css"));
  const cores = coresLetreiro(cor);
  const nomeOficina = readFileSync(path.join(raiz, "src/data/oficina.ts"), "utf-8").match(
    /export const oficina: Oficina = \{[\s\S]*?\bnome:\s*"([^"]+)"/,
  )?.[1];
  if (!nomeOficina) throw new Error("oficina.nome não encontrado");

  // Arquivos avulsos da marca nova (cores resolvidas), para quem avalia.
  const [, , wC, hC] = LETREIRO_VIEWBOX_COMPLETA.split(" ");
  const [, , wS, hS] = LETREIRO_VIEWBOX_SEM_DESCRITOR.split(" ");
  const arquivoSvg = (vb, w, h, miolo) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}" role="img" aria-label="${nomeOficina}">${miolo}</svg>\n`;
  writeFileSync(path.join(saidaP4, "marca-letreiro.svg"), arquivoSvg(LETREIRO_VIEWBOX_COMPLETA, wC, hC, letreiroSvg({ cores })));
  writeFileSync(
    path.join(saidaP4, "marca-letreiro-sem-descritor.svg"),
    arquivoSvg(LETREIRO_VIEWBOX_SEM_DESCRITOR, wS, hS, letreiroSvg({ comDescritor: false, cores })),
  );
  writeFileSync(path.join(saidaP4, "selo-letreiro.svg"), arquivoSvg(`0 0 ${SELO.lado} ${SELO.lado}`, SELO.lado, SELO.lado, seloLetreiroSvg({ cores })));

  // Escala da foto 01 (recorte nativo): maiúscula de SANDRO = 77,7 px
  // (233 px no ampliado 3x), então 1 unidade = 0,777 px. Caixas no
  // recorte nativo (px), com a mesma margem de 24 unidades da marca; sem
  // os telefones (x > 1160 fica de fora).
  const U01 = 0.777;
  const caixaCompleta = [192 - 24 * U01, 205.5 - 74 * U01, 1132 + 24 * U01, 205.5 + 74 * U01];
  const caixaSemDescritor = [712 - 24 * U01, caixaCompleta[1], caixaCompleta[2], caixaCompleta[3]];
  const caixaMostrador = [1099.6 - 60 * U01, 213.3 - 62 * U01, 1099.6 + 60 * U01, 213.3 + 58 * U01];

  const foto = (img, [x0, y0, x1, y1], alturaPx) => {
    const f = alturaPx / (y1 - y0);
    return (
      `<div class="foto" style="width:${((x1 - x0) * f).toFixed(1)}px;height:${alturaPx}px">` +
      `<img src="${img.rota}" alt="" style="width:${(img.largura * f).toFixed(2)}px;left:${(-x0 * f).toFixed(2)}px;top:${(-y0 * f).toFixed(2)}px"></div>`
    );
  };
  const marca = (alturaPx, comDescritor) =>
    `<svg viewBox="${comDescritor ? LETREIRO_VIEWBOX_COMPLETA : LETREIRO_VIEWBOX_SEM_DESCRITOR}" style="height:${alturaPx}px;width:auto" role="img" aria-label="${nomeOficina}">${letreiroSvg({ comDescritor, cores })}</svg>`;
  const selo = (alturaPx) =>
    `<svg viewBox="0 0 ${SELO.lado} ${SELO.lado}" style="height:${alturaPx}px;width:${alturaPx}px" role="img" aria-label="${nomeOficina}">${seloLetreiroSvg({ cores })}</svg>`;
  const fig = (conteudo, legenda) => `<figure>${conteudo}<figcaption>${legenda}</figcaption></figure>`;

  const TONS = [
    { id: "claro", titulo: "Tom claro (fundo off-white)", fundo: cor["off-white"], rotulo: cor["grafite-500"] },
    { id: "escuro", titulo: "Tom escuro (fundo grafite-950)", fundo: cor["grafite-950"], rotulo: cor["grafite-400"] },
  ];
  const ALTURAS = [72, 48, 32];
  const linhas = [];
  for (const tom of TONS) {
    const filas = ALTURAS.map((h) => {
      const comDescritor = h >= ALTURA_MIN_COM_DESCRITOR;
      const regra = comDescritor ? "completa (MECÂNICA + SANDRO)" : "sem descritor (< 40 px: só SANDRO)";
      return (
        `<div class="linha" id="cmp-${tom.id}-${h}">` +
        fig(foto(letreiro01, comDescritor ? caixaCompleta : caixaSemDescritor, h), `foto 01 (letreiro) · ${h} px`) +
        fig(marca(h, comDescritor), `SVG de marca.js · ${h} px · ${regra}`) +
        `</div>`
      );
    }).join("");
    const selos =
      `<div class="linha" id="selo-${tom.id}">` +
      fig(foto(letreiro01, caixaMostrador, 72), "foto 01 (mostrador) · 72 px") +
      ALTURAS.map((h) => fig(selo(h), `selo · ${h} px`)).join("") +
      `</div>`;
    linhas.push(
      `<section class="tom" style="background:${tom.fundo};--rotulo:${tom.rotulo}"><h2>${tom.titulo}</h2>${filas}${selos}</section>`,
    );
  }
  // Selo no contexto do CtaFinal (fundo âmbar).
  linhas.push(
    `<section class="tom" style="background:${cor["ambar-500"]};--rotulo:${cor["grafite-950"]}"><h2>Selo sobre âmbar (CtaFinal)</h2>` +
      `<div class="linha" id="selo-ambar">${ALTURAS.map((h) => fig(selo(h), `selo · ${h} px`)).join("")}</div></section>`,
  );

  // Detalhe: recorte ampliado 3x da foto 01 x SVG na mesma escala (a
  // maiúscula de SANDRO com 233 px x 0,5 = 116,5 px nas duas).
  const hDetalhe = Math.round(Number(hS) * 1.165);
  const detalhe =
    `<div class="linha" id="detalhe">` +
    fig(`<img src="${simbolo.rota}" alt="" style="width:${simbolo.largura / 2}px;height:${simbolo.altura / 2}px">`, "foto 01, recorte ampliado 3x (logo-ref), a 50%") +
    fig(marca(hDetalhe, false), `SVG sem descritor, maiúscula de SANDRO na mesma altura`) +
    `</div>` +
    `<div class="linha" id="detalhe-noite">` +
    fig(foto(letreiro08, [150 * 1.745, 110 * 1.745, 1360 * 1.745, 245 * 1.745], 120), "foto 08 (noite), recorte nativo") +
    fig(marca(120, true), "SVG completo · 120 px") +
    `</div>`;

  // Sobreposição: a foto nivelada (1,51°) e sem o cisalhamento (4,5%) —
  // a mesma correção usada para medir — com os contornos do SVG por cima.
  const cam = letreiroCaminhos();
  const cMostrador = [cam.anel, cam.bisel, cam.zonaEscura, cam.ponteiro].join(" ");
  const [ccx, ccy] = [LETREIRO_MOSTRADOR.centro[0] + LETREIRO_MOSTRADOR.ponteiro.cubo[0], LETREIRO_MOSTRADOR.centro[1] - LETREIRO_MOSTRADOR.ponteiro.cubo[1]];
  const traco = cor["whatsapp-400"];
  const sobre = (id, img, matriz, larg, alt, g, d, legenda) =>
    `<div class="linha" id="${id}">` +
    fig(
      `<div class="sobre" style="width:${larg}px;height:${alt}px"><img src="${img}" alt="" style="transform:matrix(${matriz.map((v) => v.toFixed(6)).join(",")})">` +
        `<svg viewBox="0 0 ${larg} ${alt}" width="${larg}" height="${alt}"><g transform="${g}"><path d="${d}" fill="none" stroke="${traco}" stroke-width="1.5" vector-effect="non-scaling-stroke"/></g></svg></div>`,
      legenda,
    ) +
    `</div>`;
  const mSandro = afim.compor(afim.cisalha(0.045, 117), afim.giro(1.51, simbolo.largura / 2, simbolo.altura / 2));
  const mMecanica = afim.compor(afim.cisalha(0.045, 100), afim.compor(afim.giro(1.51, 420, 140), afim.recorte(1560, 1100, 2)));
  const sobreposicoes =
    sobre(
      "sobre-sandro",
      simbolo.rota,
      mSandro,
      simbolo.largura,
      simbolo.altura,
      "translate(96 117) scale(2.34)",
      `${cam.sandro} ${cMostrador} M${ccx + 3.6} ${ccy} a3.6 3.6 0 1 0 -7.2 0 a3.6 3.6 0 1 0 7.2 0`,
      "SANDRO + mostrador: foto 01 (ampliada 3x) nivelada, contorno do SVG por cima",
    ) +
    sobre(
      "sobre-mecanica",
      "/ref/01.jpg",
      mMecanica,
      840,
      280,
      "translate(63 64) scale(1.56)",
      cam.mecanica,
      "MECÂNICA: foto 01 (x2) nivelada, contorno do SVG por cima",
    );

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Prancha P4 — marca do letreiro — ${nomeOficina}</title>
<style>
@font-face{font-family:"Inter Variable";font-weight:100 900;font-style:normal;src:url(fontes/inter.woff2) format("woff2");}
html,body{margin:0;padding:0;background:${cor["off-white"]};font-family:"Inter Variable",sans-serif}
header{padding:24px 32px;color:${cor["grafite-950"]}}
header h1{margin:0 0 4px;font-size:22px;font-weight:700}
header p{margin:0;font-size:14px;color:${cor["grafite-500"]};max-width:1100px}
.tom{padding:24px 32px 32px;--rotulo:${cor["grafite-500"]}}
.tom h2{margin:0 0 16px;font-size:16px;font-weight:600;color:var(--rotulo)}
.linha{display:flex;width:fit-content;flex-wrap:wrap;align-items:flex-end;gap:32px;padding:8px;margin-bottom:16px}
figure{margin:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
figure svg,figure img{display:block}
figcaption{font-size:12px;color:var(--rotulo)}
.foto{position:relative;overflow:hidden}
.foto img{position:absolute;max-width:none}
.sobre{position:relative;overflow:hidden}
.sobre img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none}
.sobre svg{position:absolute;left:0;top:0}
</style></head><body>
<header><h1>Prancha P4 — marca recriada do letreiro da fachada — ${nomeOficina}</h1>
<p>Lado a lado: recorte da foto 01 (letreiro, de dia; conta do dono) e o SVG de src/lib/marca.js renderizado pelo Chrome a DPR 1, nos tons claro e escuro, a 72, 48 e 32 px de altura (a 32 px vale a regra &lt; 40 px: sem descritor). Telefones do letreiro fora da marca e fora dos recortes. Abaixo: selo, detalhe na escala do recorte ampliado, foto 08 (noite) e a sobreposição dos contornos na foto nivelada.</p></header>
${linhas.join("\n")}
<section class="tom"><h2>Detalhe e sobreposição</h2>${detalhe}${sobreposicoes}</section>
</body></html>
`;
  writeFileSync(path.join(saidaP4, "prancha.html"), html);

  const rotas = new Map([["/prancha.html", html], ["/fontes/inter.woff2", { arquivo: path.join(saidaP4, "fontes/inter.woff2") }]]);
  for (const f of ["letreiro-foto01-nativo.png", "letreiro-foto08-noite-nativo.png", "simbolo-sandro-foto01-ampliado-3x.png", "01.jpg"]) {
    rotas.set(`/ref/${f}`, { arquivo: path.join(saidaP4, "ref", f) });
  }
  const nav = await abrirNavegador(rotas);
  const gerados = ["prancha.png"];
  try {
    const opcoes = { rota: "/prancha.html", largura: 1440, altura: 900 };
    writeFileSync(path.join(saidaP4, "prancha.png"), await nav.capturar(opcoes));
    const recortar = async (seletor, nome) => {
      writeFileSync(path.join(saidaP4, nome), await nav.capturar({ ...opcoes, seletor }));
      gerados.push(nome);
    };
    for (const tom of TONS) {
      for (const h of ALTURAS) await recortar(`#cmp-${tom.id}-${h}`, `comparativo-${tom.id}-${h}px.png`);
      await recortar(`#selo-${tom.id}`, `selo-${tom.id}.png`);
    }
    await recortar("#selo-ambar", "selo-ambar.png");
    await recortar("#detalhe", "detalhe-mostrador.png");
    await recortar("#detalhe-noite", "detalhe-noite.png");
    await recortar("#sobre-sandro", "sobreposicao-sandro.png");
    await recortar("#sobre-mecanica", "sobreposicao-mecanica.png");
  } finally {
    await nav.fechar();
  }
  console.log(`Prancha do letreiro em ${saidaP4}: prancha.html, ${gerados.join(", ")}, marca-letreiro*.svg, selo-letreiro.svg`);
}
