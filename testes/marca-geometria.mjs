#!/usr/bin/env node
// Prova da geometria da marca: lê os SVG gerados em public/ e confere
// caminhos, viewBox, deslocamentos x, recortes, traço e descritor contra os
// números do TEXTO LITERAL de DECISOES-P1a.md (item 1) — não contra
// src/lib/marca.js, para que um erro de transcrição lá também fique vermelho.
//
// Confere:
//   logo.svg                viewBox completo; S-A-N-D-R-O (d, x, clip [0,L]x[0,100],
//                           S sem clip); traço 12 bevel/butt, fill none, currentColor;
//                           só M L A Z e todo arco de raio 22; <text> do descritor
//                           (x, y, font-size, textLength, Inter 600, 2ª palavra
//                           de oficina.nome em caixa alta, com acento).
//   marca-sem-descritor.svg viewBox sem descritor, mesmas letras, sem <text>.
//   logo-mark.svg           selo: polígono, S em translate(40 30), traço 12, sem <text>.
//   favicon.svg             reduzido: polígono, traço 18, caminho reduzido, grupo
//                           da decisão (hoje scale(1)), sem <text>.
//   favicon-32.png          ausente em public/ e sem <link> em src/layouts/Base.astro.
//   ADENDO G1 (DEPOIS)      em logo.svg e marca-sem-descritor.svg, contra o próprio
//                           ADENDO: viewBox, x das letras, traço, caminho, clip e
//                           largura da N, vãos A|N N|D D|R R|O (x da seguinte −
//                           fim do clip da anterior).
//
// Uso: node testes/marca-geometria.mjs [--public DIR] [--decisao ARQ] [--base ARQ]
//   Sai 0 se tudo confere, 1 se algo diverge, 2 se não conseguiu ler a decisão.
//   Só Node 22+, sem dependência.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (nome, padrao) => {
  const i = process.argv.indexOf(nome);
  return i > 0 ? resolve(process.argv[i + 1]) : padrao;
};
const DIR_PUBLIC = arg("--public", join(RAIZ, "public"));
const ARQ_DECISAO = arg("--decisao", resolve(RAIZ, "../DECISOES-P1a.md"));
const ARQ_BASE = arg("--base", join(RAIZ, "src/layouts/Base.astro"));

const falhas = [];
const ok = [];
const confere = (cond, msg) => (cond ? ok.push(msg) : falhas.push(msg));

// ------------------------------------------------------- lê a decisão
function sair2(msg) {
  console.error(`NÃO MONTOU A PROVA: ${msg}`);
  process.exit(2);
}
const decisaoMd = readFileSync(ARQ_DECISAO, "utf-8");
const bloco = decisaoMd.match(/## Texto literal\s*```([\s\S]*?)```/)?.[1];
if (!bloco) sair2(`bloco "Texto literal" não encontrado em ${ARQ_DECISAO}`);
const item1 = bloco.match(/1 MARCA\.([\s\S]*?)\n2 CANTO/)?.[1];
if (!item1) sair2("item 1 MARCA não encontrado");

const num = (re, onde = item1) => {
  const m = onde.match(re);
  if (!m) sair2(`não achei ${re} na decisão`);
  return m.slice(1).map((v) => Number(v.replace(",", ".")));
};
const [H] = num(/H=(\d+)/);
const [TRACO] = num(/traco unico (\d+)/);
const [RAIO] = num(/raio unico (\d+)/);

const SUBCAMINHO = /M-?[\d.]+ -?[\d.]+(?: (?:[Lab]-?[\d.]+ -?[\d.]+|Z))*/g;
const letras = {};
for (const m of item1.matchAll(/\b([SANDRO])\((\d+)\):\s*([\s\S]*?)(?=\s+[SANDRO]\(\d+\):|\n)/g)) {
  letras[m[1]] = { L: Number(m[2]), caminhos: m[3].match(SUBCAMINHO) ?? [] };
}
for (const l of "SANDRO") if (!letras[l]?.caminhos.length) sair2(`letra ${l} sem caminho na decisão`);
const linhaX = item1.match(/x: (S-?\d+ A-?\d+ N-?\d+ D-?\d+ R-?\d+ O-?\d+)/)?.[1];
if (!linhaX) sair2("linha x: não encontrada");
for (const m of linhaX.matchAll(/([SANDRO])(-?\d+)/g)) letras[m[1]].x = Number(m[2]);
const [vbCompleta] = item1.match(/viewBox (-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+)/)?.slice(1) ?? [];
const [vbSem] = item1.match(/sem descritor (-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+)/)?.slice(1) ?? [];
if (!vbCompleta || !vbSem) sair2("viewBox não encontrado");
const [descPeso] = num(/Inter (\d+)/);
const [descFonte] = num(/font-size (\d+)/);
const [descX, descY] = num(/x(\d+) y(\d+)/);
const [descComp] = num(/textLength (\d+)/);
const [seloLado] = num(/Selo (\d+):/);
const seloPoligono = item1.match(/poligono ((?:-?\d+,-?\d+ ?)+)/)?.[1].trim();
const seloTranslado = item1.match(/S em (translate\([^)]*\))/)?.[1];
const linhaFav = item1.match(/Favicon = [^\n]*/)?.[0];
if (!seloPoligono || !seloTranslado || !linhaFav) sair2("selo/favicon não encontrados");
const [favTraco] = num(/traco (\d+)/, linhaFav);
const favTransf = linhaFav.match(/grupo (translate\([^)]*\) scale\([^)]*\) translate\([^)]*\))/)?.[1];
const favPartes = linhaFav.match(/traco \d+, (M[\s\S]*?), cabecas (M[\d .-]+L[\d .-]+?) e (M[\d .-]+L[\d .-]+?),/);
if (!favTransf || !favPartes) sair2("favicon: caminho/grupo não encontrados");
// "M71 6 L40 6 + arcos + L9 94": os arcos são os do S (mesmo esqueleto).
const arcosS = letras.S.caminhos[0].match(/[ab]-?[\d.]+ -?[\d.]+/g).join(" ");
const favPrincipal = favPartes[1].replace(/\s*\+\s*arcos\s*\+\s*/, ` ${arcosS} `);
const favCaminhos = [favPrincipal, favPartes[2].trim(), favPartes[3].trim()];

// ------------------------------------ lê o ADENDO G1 (o que vale DEPOIS)
// O ADENDO G1 trocou linhas do item 1. O que ele fixa DEPOIS vale hoje e é
// conferido abaixo contra os SVG, por conta própria (não contra o item 1):
// caminho, largura e clip da N, traço, vãos entre letras, x das letras e os
// dois viewBox. NÃO se lê o trecho "ANTES ... ->" (valor substituído) nem a
// frase "Razao: ..." (justificativa); testes/marca-geometria-mutacoes.mjs
// exclui os mesmos trechos do domínio de mutação.
const adendoG1 = decisaoMd.match(/^## ADENDO G1 — texto literal[^\n]*\n\s*```([\s\S]*?)```/m)?.[1];
if (!adendoG1) sair2(`bloco "ADENDO G1 — texto literal" não encontrado em ${ARQ_DECISAO}`);
// Uma entrada por linha "ANTES ... -> DEPOIS ...": só o DEPOIS, sem a frase Razao.
const depoisG1 = adendoG1
  .split("\n")
  .filter((l) => /\bANTES\b[\s\S]*?->\s*DEPOIS\b/.test(l))
  .map((l) => l.replace(/^[\s\S]*?->\s*DEPOIS\s*/, "").replace(/\bRazao:[\s\S]*?(?:\.(?=\s)|$)/, ""));
const linhaG1 = (re, rotulo) => {
  const achadas = depoisG1.filter((l) => re.test(l));
  if (achadas.length !== 1) sair2(`ADENDO G1: esperava 1 linha DEPOIS com ${rotulo}, achei ${achadas.length}`);
  return achadas[0];
};
const adendo = {};
{
  const lN = linhaG1(/\bN\(\d+\):/, "N(L):");
  const n = lN.match(/\bN\((\d+)\):\s*(M[^\n]*?)\.(?=\s|$)/);
  if (!n) sair2("ADENDO G1: caminho da N não encontrado");
  adendo.nL = Number(n[1]);
  adendo.nCaminho = n[2].match(SUBCAMINHO)?.join(" ");
  if (!adendo.nCaminho) sair2("ADENDO G1: caminho da N não encontrado");
  [adendo.traco] = num(/Traco (\d+)/, lN);
  adendo.vaos = Object.fromEntries(
    [...(lN.match(/vaos \(([^)]*)\)/)?.[1] ?? "").matchAll(/([SANDRO])\|([SANDRO]) (\d+)/g)].map((m) => [m[1] + m[2], Number(m[3])]),
  );
  if (Object.keys(adendo.vaos).length !== 4) sair2(`ADENDO G1: esperava 4 vãos, achei "${Object.keys(adendo.vaos).join(" ")}"`);
  const [cx0, cx1, cy0, cy1] = num(/clip da N \[(-?[\d.]+),(-?[\d.]+)\]x\[(-?[\d.]+),(-?[\d.]+)\]/, lN);
  adendo.clipN = { x: cx0, y: cy0, w: cx1 - cx0, h: cy1 - cy0 };
  const lX = linhaG1(/(?:^|\s)x: S/, "x:");
  const lx = lX.match(/x: (S-?\d+ A-?\d+ N-?\d+ D-?\d+ R-?\d+ O-?\d+)/)?.[1];
  if (!lx) sair2("ADENDO G1: linha x: do DEPOIS não encontrada");
  adendo.x = Object.fromEntries([...lx.matchAll(/([SANDRO])(-?\d+)/g)].map((m) => [m[1], Number(m[2])]));
  adendo.vbCompleta = lX.match(/viewBox (-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+)/)?.[1];
  adendo.vbSem = lX.match(/sem descritor (-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+)/)?.[1];
  if (!adendo.vbCompleta || !adendo.vbSem) sair2("ADENDO G1: viewBox do DEPOIS não encontrado");
}

const nomeOficina = readFileSync(join(RAIZ, "src/data/oficina.ts"), "utf-8")
  .match(/export const oficina: Oficina = \{[\s\S]*?\bnome:\s*"([^"]+)"/)?.[1];
if (!nomeOficina) sair2("oficina.nome não encontrado");
const descritorEsperado = nomeOficina.trim().split(/\s+/)[1].toLocaleUpperCase("pt-BR");

// ------------------------------------------------------ comparação de d
const expandir = (c) => c.replace(/\b([ab])(-?[\d.]+) (-?[\d.]+)/g, (_, l, x, y) => `A${RAIO} ${RAIO} 0 0 ${l === "a" ? 1 : 0} ${x} ${y}`);
const tokens = (d) => d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
function mesmoD(obtido, esperado) {
  const a = tokens(obtido);
  const b = tokens(expandir(esperado));
  if (a.length !== b.length) return false;
  return a.every((t, i) => (isNaN(t) ? t === b[i] : Math.abs(Number(t) - Number(b[i])) < 1e-9));
}
function soComandosPermitidos(d, rotulo) {
  confere(/^[MLAZ\d\s.-]+$/.test(d), `${rotulo}: só comandos M L A Z`);
  const arcos = [...d.matchAll(/A(-?[\d.]+) (-?[\d.]+)/g)];
  confere(arcos.every((m) => Number(m[1]) === RAIO && Number(m[2]) === RAIO), `${rotulo}: todo arco com raio ${RAIO}`);
}

const ler = (nome) => {
  const p = join(DIR_PUBLIC, nome);
  if (!existsSync(p)) {
    falhas.push(`${nome}: arquivo ausente em ${DIR_PUBLIC}`);
    return null;
  }
  return readFileSync(p, "utf-8");
};
const attr = (tag, nome) => tag.match(new RegExp(`\\s${nome}="([^"]*)"`))?.[1];

function confereLetras(svg, rotulo) {
  const grupo = svg.match(/<g ([^>]*stroke-width="[^"]*"[^>]*)>/)?.[1] ?? "";
  confere(attr(" " + grupo, "stroke-width") === String(TRACO), `${rotulo}: traço ${TRACO}`);
  confere(attr(" " + grupo, "stroke-linejoin") === "bevel", `${rotulo}: junção bevel`);
  confere(attr(" " + grupo, "stroke-linecap") === "butt", `${rotulo}: ponta butt`);
  confere(attr(" " + grupo, "fill") === "none", `${rotulo}: fill none`);
  confere(attr(" " + grupo, "stroke") === "currentColor", `${rotulo}: stroke currentColor`);
  const clips = Object.fromEntries(
    [...svg.matchAll(/<clipPath id="([^"]+)"><rect ([^>]*)\/><\/clipPath>/g)].map((m) => [m[1], " " + m[2]]),
  );
  const achadas = [
    ...svg.matchAll(/<g transform="translate\((-?[\d.]+) (-?[\d.]+)\)">(?:<g clip-path="url\(#([^)]+)\)">)?<path data-letra="(\w)" d="([^"]+)"\/>/g),
  ];
  confere(achadas.map((m) => m[4]).join("") === "SANDRO", `${rotulo}: letras na ordem S-A-N-D-R-O (achei "${achadas.map((m) => m[4]).join("")}")`);
  for (const [, x, y, clip, letra, d] of achadas) {
    const esp = letras[letra];
    confere(Number(x) === esp.x && Number(y) === 0, `${rotulo} ${letra}: deslocamento x ${esp.x} (achei ${x})`);
    confere(mesmoD(d, esp.caminhos.join(" ")), `${rotulo} ${letra}: caminho igual à decisão`);
    soComandosPermitidos(d, `${rotulo} ${letra}`);
    if (letra === "S") {
      confere(!clip, `${rotulo} S: sem clip`);
    } else {
      const r = clips[clip];
      confere(
        !!r && Number(attr(r, "x")) === 0 && Number(attr(r, "y")) === 0 && Number(attr(r, "width")) === esp.L && Number(attr(r, "height")) === H,
        `${rotulo} ${letra}: clip [0,${esp.L}]x[0,${H}]`,
      );
    }
  }
}

// ---------------------------------------------------------- arquivos
const logo = ler("logo.svg");
if (logo) {
  confere(attr(logo, "viewBox") === vbCompleta, `logo.svg: viewBox ${vbCompleta} (achei ${attr(logo, "viewBox")})`);
  confereLetras(logo, "logo.svg");
  const texto = logo.match(/<text ([^>]*)>([^<]*)<\/text>/);
  confere(!!texto, "logo.svg: tem o <text> do descritor");
  if (texto) {
    const t = " " + texto[1];
    confere(Number(attr(t, "x")) === descX && Number(attr(t, "y")) === descY, `logo.svg: descritor em x${descX} y${descY}`);
    confere(Number(attr(t, "font-size")) === descFonte, `logo.svg: descritor font-size ${descFonte}`);
    confere(Number(attr(t, "textLength")) === descComp, `logo.svg: descritor textLength ${descComp}`);
    confere(Number(attr(t, "font-weight")) === descPeso && /Inter/.test(attr(t, "font-family") ?? ""), `logo.svg: descritor Inter ${descPeso}`);
    confere(texto[2] === descritorEsperado, `logo.svg: descritor "${descritorEsperado}" (achei "${texto[2]}")`);
  }
}

const semDesc = ler("marca-sem-descritor.svg");
if (semDesc) {
  confere(attr(semDesc, "viewBox") === vbSem, `marca-sem-descritor.svg: viewBox ${vbSem} (achei ${attr(semDesc, "viewBox")})`);
  confere(!/<text/.test(semDesc), "marca-sem-descritor.svg: sem <text>");
  confereLetras(semDesc, "marca-sem-descritor.svg");
}

function confereSelo(svg, rotulo, { traco, transformacao, caminhos }) {
  confere(attr(svg, "viewBox") === `0 0 ${seloLado} ${seloLado}`, `${rotulo}: viewBox 0 0 ${seloLado} ${seloLado}`);
  confere(!/<text/.test(svg), `${rotulo}: sem <text>`);
  const pol = svg.match(/<polygon points="([^"]+)"/)?.[1];
  confere(pol === seloPoligono, `${rotulo}: polígono ${seloPoligono} (achei ${pol})`);
  const g = svg.match(/<g transform="([^"]+)"><path ([^>]*)\/><\/g>/);
  confere(g?.[1] === transformacao, `${rotulo}: grupo ${transformacao} (achei ${g?.[1]})`);
  if (g) {
    const p = " " + g[2];
    confere(Number(attr(p, "stroke-width")) === traco, `${rotulo}: traço ${traco}`);
    confere(attr(p, "stroke-linejoin") === "bevel" && attr(p, "stroke-linecap") === "butt" && attr(p, "fill") === "none", `${rotulo}: bevel, butt, fill none`);
    confere(mesmoD(attr(p, "d"), caminhos.join(" ")), `${rotulo}: caminho igual à decisão`);
    soComandosPermitidos(attr(p, "d"), rotulo);
  }
}
const selo = ler("logo-mark.svg");
if (selo) confereSelo(selo, "logo-mark.svg (selo)", { traco: TRACO, transformacao: seloTranslado, caminhos: letras.S.caminhos });
const favicon = ler("favicon.svg");
if (favicon) confereSelo(favicon, "favicon.svg (reduzido)", { traco: favTraco, transformacao: favTransf, caminhos: favCaminhos });

// ADENDO G1 (DEPOIS) contra os SVG, independente do item 1.
function letrasDoSvg(svg) {
  const clips = Object.fromEntries(
    [...svg.matchAll(/<clipPath id="([^"]+)"><rect ([^>]*)\/><\/clipPath>/g)].map((m) => [m[1], " " + m[2]]),
  );
  const r = {};
  for (const m of svg.matchAll(/<g transform="translate\((-?[\d.]+) (-?[\d.]+)\)">(?:<g clip-path="url\(#([^)]+)\)">)?<path data-letra="(\w)" d="([^"]+)"\/>/g)) {
    const c = clips[m[3]];
    r[m[4]] = { x: Number(m[1]), d: m[5], clip: c && { x: Number(attr(c, "x")), y: Number(attr(c, "y")), w: Number(attr(c, "width")), h: Number(attr(c, "height")) } };
  }
  return r;
}
function confereAdendoG1(svg, rotulo, vb) {
  const r = `${rotulo} [ADENDO G1]`;
  confere(attr(svg, "viewBox") === vb, `${r}: viewBox ${vb} (achei ${attr(svg, "viewBox")})`);
  const grupo = " " + (svg.match(/<g ([^>]*stroke-width="[^"]*"[^>]*)>/)?.[1] ?? "");
  confere(attr(grupo, "stroke-width") === String(adendo.traco), `${r}: traço ${adendo.traco}`);
  const ls = letrasDoSvg(svg);
  for (const l of "SANDRO") confere(ls[l]?.x === adendo.x[l], `${r} ${l}: x ${adendo.x[l]} (achei ${ls[l]?.x})`);
  const n = ls.N;
  confere(!!n && mesmoD(n.d, adendo.nCaminho), `${r} N: caminho ${adendo.nCaminho}`);
  const c = n?.clip;
  confere(
    !!c && c.x === adendo.clipN.x && c.y === adendo.clipN.y && c.w === adendo.clipN.w && c.h === adendo.clipN.h && c.w === adendo.nL,
    `${r} N: clip [${adendo.clipN.x},${adendo.clipN.x + adendo.clipN.w}]x[${adendo.clipN.y},${adendo.clipN.y + adendo.clipN.h}], largura ${adendo.nL}`,
  );
  for (const [par, vao] of Object.entries(adendo.vaos)) {
    const [a, b] = [ls[par[0]], ls[par[1]]];
    const achado = a?.clip && b ? b.x - (a.x + a.clip.x + a.clip.w) : undefined;
    confere(achado === vao, `${r}: vão ${par[0]}|${par[1]} ${vao} (achei ${achado})`);
  }
}
if (logo) confereAdendoG1(logo, "logo.svg", adendo.vbCompleta);
if (semDesc) confereAdendoG1(semDesc, "marca-sem-descritor.svg", adendo.vbSem);

confere(!existsSync(join(DIR_PUBLIC, "favicon-32.png")), "public/favicon-32.png não existe");
confere(!readFileSync(ARQ_BASE, "utf-8").includes("favicon-32"), "Base.astro não aponta para favicon-32.png");

// ---------------------------------------------------------- resultado
console.log(`decisão: ${ARQ_DECISAO}\npublic:  ${DIR_PUBLIC}`);
console.log(`${ok.length} conferências ok, ${falhas.length} falhas`);
for (const f of falhas) console.log(`  FALHOU: ${f}`);
process.exit(falhas.length ? 1 : 0);
