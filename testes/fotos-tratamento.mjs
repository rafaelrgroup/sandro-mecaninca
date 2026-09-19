#!/usr/bin/env node
// Prova dos 18 mestres do tratamento de fotos (DECISOES-P1a.md item 9 FOTO +
// ADENDO G1-FOTOS, scripts/tratar-fotos/): os 14 de banco + os 4 reais de
// FOTOS-TRIAGEM-PERFIL.md (P4/FT2), cada P* com o original de sha256 igual ao
// de perfil-google/inventario.json. Para cada mestre de CREDITOS.json:
//   1. existe, mede EXATAMENTE o tamanho do lugar (hero 1920x1280, servico
//      1440x960, sobre 1440x1800) e o sha256 bate com o registrado;
//   2. a janela é a de janelas.json, tem a proporção do lugar (±1 px), não
//      pede ampliação e cai DENTRO da região aprovada na triagem (lida como
//      texto de fotos-brutas/recortes.mjs, com a regra de arredondamento
//      largura = round((x+w)·W) − left; APROVADAS sem recorte = quadro inteiro);
//   3. gB em [0,94; 1,12] e gR em [0,90; min(1,15; 1,106·gB)] (gB primeiro),
//      E são os que a receita dá para o original naquela janela (±0,001);
//   4. g0 = clamp(0,6625 + 0,0075·lumaA; 1,00; 1,15) a 0,01 e gammaOut na
//      escada min(1,30; g0 + k·0,05);
//   5. luma média (Rec. 709) do mestre >= a do original na mesma janela e
//      tamanho, e lumaConforme true;
//   6. refazer B e C (linear [.9294,.9176,.8980],[10,11,13]) com esses números
//      dá o mesmo arquivo byte a byte, e o gammaOut é o menor da escada que
//      cumpre a luma;
//   7. SANIDADE do ADENDO, nos pontos do G1: T3-d fundo branco R 225–236,
//      G 217–228, B 207–219, R−G ≤ 10, G−B ≤ 13, R−B ≤ 20; T4-c preto de borda
//      (esquerda, inferior, canto do chanfro) R ≤ 14, G ≤ 15, B ≤ 18, e T4-c
//      com gammaOut 1,00;
//   8. T2-b e T5-c levam o aviso "não usar como hero" em CREDITOS.json.
// Não reaproveita funções do script: recalcula tudo por conta própria.
// Mestre que não pôde ser conferido (janela fora do quadro etc.) conta como falha.
//
// Uso: node testes/fotos-tratamento.mjs [dir-das-tratadas]
//   (padrão: <obra>/fotos-tratadas). Sai 0 se tudo passa, 1 se algo falha,
//   2 se não conseguiu montar a prova. Não escreve nada.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PROJETO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OBRA = resolve(PROJETO, "..");
const BRUTAS = join(OBRA, "fotos-brutas");
const DIR = resolve(process.argv[2] ?? join(OBRA, "fotos-tratadas"));

const TAM = { hero: [1920, 1280], servico: [1440, 960], sobre: [1440, 1800] };
const ESPERADOS = [
  ...["T2-b", "T2-c", "T5-c", "T7-b", "T1-b"].map((id) => `${id}-hero`),
  ...["T4-a", "T4-c", "T4-d", "T3-d", "T5-a", "T5-b", "T1-a", "T1-b"].map((id) => `${id}-servico`),
  "T6-a-sobre",
  // P4/FT2: fotos reais do perfil Google aprovadas em FOTOS-TRIAGEM-PERFIL.md
  // ("Decisão por slot"): hero ← P08, servico-1 ← P03, servico-2 ← P06, sobre ← P05.
  "P08-hero",
  "P03-servico",
  "P06-servico",
  "P05-sobre",
];
// Original de cada P* = perfil-google/fotos/<nn>.jpg, com o sha256 de
// perfil-google/inventario.json (pega original trocado, recomprimido ou miniatura).
const INVENTARIO = join(OBRA, "perfil-google/inventario.json");
const SEM_RECORTE = ["T1-b", "T4-c", "T4-d"];
const CLAMP_B = [0.94, 1.12];
const CLAMP_R = [0.9, 1.15];
const TETO_CALOR = 1.106;
const r2 = (v) => Math.round(v * 100) / 100;
/** Escada de gammaOut a partir da luma da saída de A (ADENDO G1-FOTOS, C). */
function escada(lumaA) {
  const g0 = r2(Math.min(1.15, Math.max(1, 0.6625 + 0.0075 * lumaA)));
  const passos = [];
  for (let k = 0; ; k++) {
    const g = Math.min(1.3, r2(g0 + k * 0.05));
    passos.push(g);
    if (g >= 1.3) break;
  }
  return { g0, passos };
}
// Pontos da sanidade (px do mestre 1440x960). T3-d: fundo branco à direita do
// braço, onde o original mede ~(221,221,223) e a receita anterior dava
// ~(239,224,207). T4-c: preto das bordas esquerda e inferior e do canto do
// chanfro, onde a receita anterior dava ~(21,22,26).
const SANIDADE = {
  "T3-d-servico": {
    caixas: { fundo: { left: 1300, top: 448, width: 136, height: 64 } },
    faixa: { R: [225, 236], G: [217, 228], B: [207, 219] },
    difs: { RG: 10, GB: 13, RB: 20 },
  },
  "T4-c-servico": {
    caixas: {
      borda_esquerda: { left: 0, top: 600, width: 24, height: 360 },
      borda_inferior: { left: 0, top: 936, width: 1440, height: 24 },
      canto_chanfro: { left: 1248, top: 912, width: 192, height: 48 },
    },
    faixa: { R: [0, 14], G: [0, 15], B: [0, 18] },
    gammaOut: 1,
  },
};
const AVISO_HERO = ["T2-b-hero", "T5-c-hero"];

const luma = (c) => 0.2126 * c[0].mean + 0.7152 * c[1].mean + 0.0722 * c[2].mean;

let creditos, janelas, regioes, inventario;
try {
  inventario = JSON.parse(readFileSync(INVENTARIO, "utf8")).fotos;
  creditos = JSON.parse(readFileSync(join(DIR, "CREDITOS.json"), "utf8")).mestres;
  janelas = JSON.parse(readFileSync(join(PROJETO, "scripts/tratar-fotos/janelas.json"), "utf8")).mestres;
  const fonte = readFileSync(join(BRUTAS, "recortes.mjs"), "utf8");
  const bloco = fonte.match(/export const recortes = \{([\s\S]*?)\};/)[1];
  regioes = Object.fromEntries([...bloco.matchAll(/"([^"]+)":\s*\[([^\]]+)\]/g)].map((m) => [m[1], m[2].split(",").map(Number)]));
  for (const id of SEM_RECORTE) regioes[id] ??= [0, 0, 1, 1];
} catch (e) {
  console.error(`MONTAGEM: ${e.message}`);
  process.exit(2);
}

const falhas = [];
const falha = (chave, msg) => falhas.push(`${chave}: ${msg}`);

const chaves = creditos.map((c) => `${c.id}-${c.lugar}`);
for (const k of ESPERADOS) if (!chaves.includes(k)) falha(k, "ausente de CREDITOS.json");
for (const k of chaves) if (!ESPERADOS.includes(k)) falha(k, "sobra em CREDITOS.json (não é um dos 14 + 4 reais da triagem do perfil)");
for (const id of new Set(ESPERADOS.filter((k) => k.startsWith("P")).map((k) => k.split("-")[0]))) {
  const n = id.slice(1);
  const doInv = inventario.find((f) => f.arquivo === `fotos/${n}.jpg`);
  const arq = join(BRUTAS, `${id}.jpg`);
  if (!doInv) falha(id, `fotos/${n}.jpg ausente de ${INVENTARIO}`);
  else if (!existsSync(arq)) falha(id, `original ${arq} não existe`);
  else {
    const sha = createHash("sha256").update(readFileSync(arq)).digest("hex");
    if (sha !== doInv.sha256) falha(id, `sha256 do original ${sha.slice(0, 12)}… ≠ inventario.json ${doInv.sha256.slice(0, 12)}…`);
  }
}

async function conferir(c, k) {
  const [Lw, Lh] = TAM[c.lugar] ?? [];
  if (!Lw) { falha(k, `lugar desconhecido "${c.lugar}"`); return; }
  const arq = join(DIR, `${k}.jpg`);
  if (!existsSync(arq)) { falha(k, `arquivo ${arq} não existe`); return; }

  // 1. dimensões e sha256
  const buf = readFileSync(arq);
  const meta = await sharp(buf).metadata();
  if (meta.width !== Lw || meta.height !== Lh) falha(k, `mede ${meta.width}x${meta.height}, lugar pede ${Lw}x${Lh}`);
  if (c.largura !== Lw || c.altura !== Lh) falha(k, `CREDITOS diz ${c.largura}x${c.altura}, lugar pede ${Lw}x${Lh}`);
  if (meta.format !== "jpeg") falha(k, `formato ${meta.format}, não jpeg`);
  const sha = createHash("sha256").update(buf).digest("hex");
  if (sha !== c.sha256) falha(k, `sha256 do arquivo ${sha.slice(0, 12)}… ≠ registrado ${String(c.sha256).slice(0, 12)}…`);

  // 2. janela
  const jj = janelas.find((j) => j.id === c.id && j.lugar === c.lugar);
  const j = c.janela;
  if (!jj) falha(k, "sem janela em janelas.json");
  else if (JSON.stringify(jj.janela) !== JSON.stringify(j)) falha(k, `janela de CREDITOS ${JSON.stringify(j)} ≠ janelas.json ${JSON.stringify(jj.janela)}`);
  const om = await sharp(join(BRUTAS, `${c.id}.jpg`)).metadata();
  const W = om.autoOrient?.width ?? om.width;
  const H = om.autoOrient?.height ?? om.height;
  const [x, y, w, h] = regioes[c.id] ?? [];
  if (x === undefined) { falha(k, "sem região aprovada"); return; }
  const left = Math.round(x * W), top = Math.round(y * H);
  const r = { left, top, right: Math.round((x + w) * W), bottom: Math.round((y + h) * H) };
  if (j.left < r.left || j.top < r.top || j.left + j.width > r.right || j.top + j.height > r.bottom)
    falha(k, `janela ${JSON.stringify(j)} sai da região aprovada ${JSON.stringify(r)}`);
  // |w/h − Lw/Lh|·h ≤ 1 px, a mesma regra do script
  if (Math.abs(j.width * Lh - j.height * Lw) > Lh) falha(k, `janela ${j.width}x${j.height} não tem a proporção ${Lw}:${Lh}`);
  if (j.width < Lw || j.height < Lh) falha(k, `janela ${j.width}x${j.height} exigiria ampliar`);

  // original na mesma janela e tamanho (passada A, refeita aqui)
  const pngA = await sharp(join(BRUTAS, `${c.id}.jpg`)).rotate().extract(j).resize(Lw, Lh, { fit: "fill" }).png().toBuffer();
  const ch = (await sharp(pngA).stats()).channels;

  // 3. ganhos: gB primeiro, o teto de gR depende dele
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  if (!(typeof c.gB === "number" && c.gB >= CLAMP_B[0] && c.gB <= CLAMP_B[1])) falha(k, `gB=${c.gB} fora de [${CLAMP_B}]`);
  const tetoR = Math.min(CLAMP_R[1], TETO_CALOR * c.gB);
  if (!(typeof c.gR === "number" && c.gR >= CLAMP_R[0] && c.gR <= tetoR + 1e-4)) falha(k, `gR=${c.gR} fora de [${CLAMP_R[0]}; min(${CLAMP_R[1]}; 1,106·gB=${(TETO_CALOR * c.gB).toFixed(4)})]`);
  const gB = clamp((0.94 * ch[1].mean) / ch[2].mean, ...CLAMP_B);
  const gR = clamp((1.04 * ch[1].mean) / ch[0].mean, CLAMP_R[0], Math.min(CLAMP_R[1], TETO_CALOR * (Math.round(gB * 1e4) / 1e4)));
  if (Math.abs(gR - c.gR) > 1e-3) falha(k, `gR registrado ${c.gR} ≠ receita ${gR.toFixed(4)}`);
  if (Math.abs(gB - c.gB) > 1e-3) falha(k, `gB registrado ${c.gB} ≠ receita ${gB.toFixed(4)}`);

  // 4. g0 e gammaOut
  const lo = luma(ch);
  const { g0, passos: GAMMAS } = escada(lo);
  if (c.g0 !== g0) falha(k, `g0 registrado ${c.g0} ≠ receita ${g0} (lumaA ${lo.toFixed(2)})`);
  if (!GAMMAS.includes(c.gammaOut)) falha(k, `gammaOut=${c.gammaOut} fora da escada {${GAMMAS}}`);

  // 5. luma
  const lt = luma((await sharp(buf).stats()).channels);
  if (!(lt >= lo)) falha(k, `luma tratada ${lt.toFixed(2)} < original ${lo.toFixed(2)}`);
  if (c.lumaConforme !== true) falha(k, `lumaConforme=${c.lumaConforme}`);

  // 6. tom: refaz B e C com os ganhos da receita e o gammaOut registrado e exige o
  //    mesmo arquivo byte a byte (prova normalise, saturação, gamma e linear);
  //    e exige que o gammaOut seja o MENOR da escada que cumpre a regra da luma.
  const pngB = await sharp(pngA).linear([Math.round(gR * 1e4) / 1e4, 1, Math.round(gB * 1e4) / 1e4], [0, 0, 0]).normalise({ lower: 1, upper: 99 }).png().toBuffer();
  const tom = (g) => sharp(pngB).modulate({ saturation: 0.8 }).gamma(1, g).linear([0.9294, 0.9176, 0.898], [10, 11, 13]).jpeg({ quality: 90 }).toBuffer();
  if (GAMMAS.includes(c.gammaOut)) {
    const refeito = await tom(c.gammaOut);
    if (createHash("sha256").update(refeito).digest("hex") !== sha) falha(k, "o mestre não é o que a receita dá com esses ganhos e esse gammaOut");
    const antes = GAMMAS[GAMMAS.indexOf(c.gammaOut) - 1];
    if (antes !== undefined && luma((await sharp(await tom(antes)).stats()).channels) >= lo)
      falha(k, `gammaOut ${c.gammaOut} não é o menor: ${antes} já cumpre a luma`);
  }

  // 7. sanidade do ADENDO nos pontos do G1
  const san = SANIDADE[k];
  if (san) {
    if (san.gammaOut !== undefined && c.gammaOut !== san.gammaOut) falha(k, `SANIDADE: gammaOut ${c.gammaOut}, adendo pede ${san.gammaOut}`);
    for (const [nome, caixa] of Object.entries(san.caixas)) {
      // stats() mede a ENTRADA do sharp, não o extract: recorta para um buffer antes.
      const recorte = await sharp(buf).extract(caixa).png().toBuffer();
      const [r, g, b] = (await sharp(recorte).stats()).channels.map((q) => q.mean);
      const med = `(${r.toFixed(1)}, ${g.toFixed(1)}, ${b.toFixed(1)})`;
      for (const [cn, v] of [["R", r], ["G", g], ["B", b]]) {
        const [lo2, hi2] = san.faixa[cn];
        if (v < lo2 || v > hi2) falha(k, `SANIDADE ${nome}: ${cn}=${v.toFixed(1)} fora de ${lo2}–${hi2} ${med}`);
      }
      if (san.difs) {
        if (r - g > san.difs.RG) falha(k, `SANIDADE ${nome}: R−G ${(r - g).toFixed(1)} > ${san.difs.RG} ${med}`);
        if (g - b > san.difs.GB) falha(k, `SANIDADE ${nome}: G−B ${(g - b).toFixed(1)} > ${san.difs.GB} ${med}`);
        if (r - b > san.difs.RB) falha(k, `SANIDADE ${nome}: R−B ${(r - b).toFixed(1)} > ${san.difs.RB} ${med}`);
      }
      console.log(`        sanidade ${k} ${nome} ${med}`);
    }
  }

  // 8. aviso de hero
  if (AVISO_HERO.includes(k) && !/não usar como hero/.test(c.aviso ?? "")) falha(k, `sem o aviso "não usar como hero" em CREDITOS.json`);

  console.log(`  ${falhas.some((f) => f.startsWith(k + ":")) ? "FALHA" : "ok   "} ${k.padEnd(16)} ${meta.width}x${meta.height} gR=${c.gR} gB=${c.gB} gammaOut=${c.gammaOut} luma ${lo.toFixed(1)}→${lt.toFixed(1)}`);
}

for (const c of creditos) {
  const k = `${c.id}-${c.lugar}`;
  if (c.erro) { falha(k, `mestre não gerado: ${c.erro}`); continue; }
  try {
    await conferir(c, k);
  } catch (e) {
    falha(k, `não deu para conferir: ${e.message}`);
  }
}

if (falhas.length) {
  console.error(`\nFALHOU (${falhas.length}):\n  ${falhas.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nPASSOU: ${creditos.length} mestres conferidos em ${DIR}`);
