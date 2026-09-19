#!/usr/bin/env node
// Tratamento único das fotos — receita FECHADA do DESIGN_SYSTEM
// (DECISOES-P1a.md, item 9 FOTO + ADENDO G1-FOTOS). Não se ajusta parâmetro aqui.
//
//   A  rotate → extract(janela) → resize(mestre)                     → PNG
//   B  linear([gR,1,gB]) → normalise(1,99)                           → PNG
//        gB primeiro: gB = clamp(0,94·mG/mB; 0,94; 1,12)
//        depois:      gR = clamp(1,04·mG/mR; 0,90; min(1,15; 1,106·gB))
//        (médias por canal medidas na saída de A)
//   C  saturation 0,80 → gamma(1, gammaOut) → linear([.9294,.9176,.8980],[10,11,13]) → JPEG q90
//        gammaOut começa em g0 = clamp(0,6625 + 0,0075·lumaA; 1,00; 1,15), a 0,01,
//        lumaA = luma média da saída de A (o original na mesma janela e tamanho);
//        se a luma média tratada < lumaA, gammaOut = min(1,30; g0 + k·0,05).
//
// A ordem interna de cada passada é a do pipeline do sharp 0.35.4
// (modulate → gammaOut → linear → normalise; src/pipeline.cc L682-816),
// que coincide com a ordem da receita.
//
// Entradas: originais em ../fotos-brutas/<id>.jpg (fora do projeto), regiões
// aprovadas lidas COMO TEXTO de fotos-brutas/recortes.mjs (importar o arquivo
// executa o laço dele e regrava as prévias) e janelas em ./janelas.json.
// Saída: ../fotos-tratadas/<id>-<lugar>.jpg + CREDITOS.json + SHA256SUMS (fora de src/).
// Os provisórios de cada slot são copiados à mão para src/assets/fotos/ e
// registrados em src/data/fotos.ts.
//
// Uso (Node 22): node scripts/tratar-fotos/index.js [dir-saida]

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const AQUI = dirname(fileURLToPath(import.meta.url));
const OBRA = resolve(AQUI, "../../..");
export const DIR_BRUTAS = join(OBRA, "fotos-brutas");
const DIR_SAIDA = resolve(process.argv[2] ?? join(OBRA, "fotos-tratadas"));

export const LUGARES = {
  hero: { largura: 1920, altura: 1280 },
  servico: { largura: 1440, altura: 960 },
  sobre: { largura: 1440, altura: 1800 },
};

export const RECEITA = {
  ganhoR: 1.04,
  ganhoB: 0.94,
  clampB: [0.94, 1.12],
  clampR: [0.9, 1.15],
  tetoCalor: 1.106, // gR ≤ 1,106·gB (= 1,04/0,94)
  normalise: { lower: 1, upper: 99 },
  saturacao: 0.8,
  g0: { base: 0.6625, porLuma: 0.0075, faixa: [1, 1.15] },
  gammaOutPasso: 0.05,
  gammaOutTeto: 1.3,
  linearA: [0.9294, 0.9176, 0.898],
  linearB: [10, 11, 13],
  qualidade: 90,
};

// APROVADAS sem recorte na triagem (FOTOS-TRIAGEM.md, "Resumo"): região = quadro inteiro.
const SEM_RECORTE = ["T1-b", "T4-c", "T4-d"];

// Duas origens de crédito (P4, FT3):
//  - BANCO (T*): autor e página em FOTOS-CANDIDATAS.md / FOTOS-TRIAGEM.md; licença
//    Pexels "Free", conferida pelo RESEARCH em 2026-09-19; download na mesma data.
//  - PERFIL DO CLIENTE (P*): fotos 01-09 de perfil-google/ (inventario.json:
//    `quem_subiu_exibido` e `link_contribuidor`), aprovadas em FOTOS-TRIAGEM-PERFIL.md.
//    Sem banco; no lugar da licença vai a linha de procedência C6 daquele arquivo.
//    A foto 10 (de usuária) não tem origem aqui: decisão do dono (2).
const BANCO = { banco: "Pexels", licenca: "License Free" };
const CONTA_DO_CLIENTE = ["Sandro mecânica", "https://maps.google.com/maps/contrib/113782236122428659434"];
const PERFIL_DO_CLIENTE = {
  banco: null,
  fonte: "perfil-google",
  licenca: `foto do próprio cliente, conta 'Sandro mecânica' do perfil Google (${CONTA_DO_CLIENTE[1]}), uso mandado pelo dono em 2026-09-19`,
};
export const ORIGENS = {
  "P03": [...CONTA_DO_CLIENTE, PERFIL_DO_CLIENTE],
  "P05": [...CONTA_DO_CLIENTE, PERFIL_DO_CLIENTE],
  "P06": [...CONTA_DO_CLIENTE, PERFIL_DO_CLIENTE],
  "P08": [...CONTA_DO_CLIENTE, PERFIL_DO_CLIENTE],
  "T1-a": ["Daniel Andraski", "https://www.pexels.com/photo/mechanic-working-with-car-engine-13065692/"],
  "T1-b": ["Jose Ricardo Barraza Morachis", "https://www.pexels.com/photo/a-person-repairing-car-engine-4116225/"],
  "T2-b": ["Artem Podrez", "https://www.pexels.com/photo/white-car-in-a-garage-for-check-up-8986138/"],
  "T2-c": ["Artem Podrez", "https://www.pexels.com/photo/car-on-a-lifter-inside-a-garage-8985514/"],
  "T3-d": ["Artem Podrez", "https://www.pexels.com/photo/a-mechanic-fixing-a-car-8985707/"],
  "T4-a": ["Gustavo Fring", "https://www.pexels.com/photo/a-person-fixing-a-car-6870300/"],
  "T4-c": ["Agustin Olmedo", "https://www.pexels.com/photo/automotive-brake-maintenance-in-workshop-30470930/"],
  "T4-d": ["Phe Di Mônaco", "https://www.pexels.com/photo/auto-repair-dismantled-car-brake-system-31040178/"],
  "T5-a": ["Jose Ricardo Barraza Morachis", "https://www.pexels.com/photo/person-holding-blue-diagnostic-tool-4116193/"],
  "T5-b": ["Jose Ricardo Barraza Morachis", "https://www.pexels.com/photo/close-up-of-mechanic-with-tablet-4116198/"],
  "T5-c": ["Jose Ricardo Barraza Morachis", "https://www.pexels.com/photo/black-and-silver-car-engine-bay-4116207/"],
  "T6-a": ["Artem Podrez", "https://www.pexels.com/photo/set-of-mechanic-tools-on-top-of-a-cabinet-8985913/"],
  "T7-b": ["Jose Ricardo Barraza Morachis", "https://www.pexels.com/photo/white-car-parked-inside-the-garage-4116201/"],
};
const DATA = "2026-09-19";

/** Regiões aprovadas (frações x,y,w,h), lidas do TEXTO de recortes.mjs, sem executá-lo. */
export function lerRegioes() {
  const fonte = readFileSync(join(DIR_BRUTAS, "recortes.mjs"), "utf8");
  const bloco = fonte.match(/export const recortes = \{([\s\S]*?)\};/);
  if (!bloco) throw new Error("recortes.mjs: objeto `recortes` não encontrado");
  const regioes = {};
  for (const m of bloco[1].matchAll(/"([^"]+)":\s*\[([^\]]+)\]/g)) {
    const v = m[2].split(",").map(Number);
    if (v.length !== 4 || v.some((n) => !Number.isFinite(n))) throw new Error(`recortes.mjs: região de ${m[1]} ilegível`);
    regioes[m[1]] = v;
  }
  for (const id of SEM_RECORTE) regioes[id] ??= [0, 0, 1, 1];
  return regioes;
}

/** Região em px do original rotacionado: left/top arredondados, largura = round((x+w)·W) − left. */
export function regiaoPx([x, y, w, h], W, H) {
  const left = Math.round(x * W);
  const top = Math.round(y * H);
  return { left, top, width: Math.round((x + w) * W) - left, height: Math.round((y + h) * H) - top };
}

export function lerJanelas() {
  return JSON.parse(readFileSync(join(AQUI, "janelas.json"), "utf8")).mestres;
}

/** Luma média (Rec. 709, sobre os valores sRGB) a partir das médias por canal. */
export async function lumaMedia(entrada) {
  const { channels } = await sharp(entrada).stats();
  return 0.2126 * channels[0].mean + 0.7152 * channels[1].mean + 0.0722 * channels[2].mean;
}

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const r2 = (v) => Math.round(v * 100) / 100;

/** Passada A: geometria só. Devolve o PNG e as dimensões do original rotacionado. */
export async function passadaA(id, janela, lugar) {
  const arquivo = join(DIR_BRUTAS, `${id}.jpg`);
  const { largura, altura } = LUGARES[lugar];
  const png = await sharp(arquivo)
    .rotate()
    .extract(janela)
    .resize(largura, altura, { fit: "fill" })
    .png()
    .toBuffer();
  return png;
}

async function tratar({ id, lugar, janela, aviso }, regioes) {
  const { largura, altura } = LUGARES[lugar];
  const arquivo = join(DIR_BRUTAS, `${id}.jpg`);
  // Dimensões depois do rotate (autoOrient devolve as dimensões orientadas).
  const meta = await sharp(arquivo).metadata();
  const W = meta.autoOrient?.width ?? meta.width;
  const H = meta.autoOrient?.height ?? meta.height;

  const regiao = regioes[id];
  if (!regiao) throw new Error(`${id}: sem região aprovada`);
  const r = regiaoPx(regiao, W, H);
  const dentro =
    janela.left >= r.left && janela.top >= r.top &&
    janela.left + janela.width <= r.left + r.width && janela.top + janela.height <= r.top + r.height;
  if (!dentro) throw new Error(`${id}-${lugar}: janela ${JSON.stringify(janela)} fora da região ${JSON.stringify(r)}`);
  if (Math.abs(janela.width / janela.height - largura / altura) * janela.height > 1)
    throw new Error(`${id}-${lugar}: janela não tem a proporção ${largura}:${altura}`);
  if (janela.width < largura || janela.height < altura)
    // Nunca amplie: registra e pula, não gera mestre ampliado.
    return { id, lugar, janela, erro: `janela ${janela.width}x${janela.height} menor que o mestre ${largura}x${altura}: não ampliado` };

  // A
  const pngA = await passadaA(id, janela, lugar);
  const { channels } = await sharp(pngA).stats();
  const [mR, mG, mB] = channels.map((c) => c.mean);
  const lumaOriginal = 0.2126 * mR + 0.7152 * mG + 0.0722 * mB;

  // B: gB primeiro; o teto de gR depende dele (teto de calor).
  const gB = r4(clamp((RECEITA.ganhoB * mG) / mB, RECEITA.clampB));
  const tetoR = Math.min(RECEITA.clampR[1], RECEITA.tetoCalor * gB);
  const gR = r4(clamp((RECEITA.ganhoR * mG) / mR, [RECEITA.clampR[0], tetoR]));
  const pngB = await sharp(pngA).linear([gR, 1, gB], [0, 0, 0]).normalise(RECEITA.normalise).png().toBuffer();

  // C, com a regra da luma
  const g0 = r2(clamp(RECEITA.g0.base + RECEITA.g0.porLuma * lumaOriginal, RECEITA.g0.faixa));
  let jpeg, gammaOut, lumaTratada;
  for (let k = 0; ; k++) {
    gammaOut = Math.min(RECEITA.gammaOutTeto, r2(g0 + k * RECEITA.gammaOutPasso));
    jpeg = await sharp(pngB)
      .modulate({ saturation: RECEITA.saturacao })
      .gamma(1, gammaOut)
      .linear(RECEITA.linearA, RECEITA.linearB)
      .jpeg({ quality: RECEITA.qualidade })
      .toBuffer();
    lumaTratada = await lumaMedia(jpeg);
    if (lumaTratada >= lumaOriginal || gammaOut >= RECEITA.gammaOutTeto) break;
  }

  const nome = `${id}-${lugar}.jpg`;
  writeFileSync(join(DIR_SAIDA, nome), jpeg);
  if (!ORIGENS[id]) throw new Error(`${id}: sem origem em ORIGENS`);
  const [autor, url, credito = BANCO] = ORIGENS[id];
  return {
    id,
    lugar,
    arquivo: nome,
    autor,
    ...credito,
    url,
    data: DATA,
    largura,
    altura,
    janela,
    regiaoAprovada: r,
    gR,
    gB,
    gRnoClamp: gR === RECEITA.clampR[0] || gR === r4(tetoR),
    gBnoClamp: gB === RECEITA.clampB[0] || gB === RECEITA.clampB[1],
    g0,
    gammaOut,
    lumaOriginal: r4(lumaOriginal),
    lumaTratada: r4(lumaTratada),
    lumaConforme: lumaTratada >= lumaOriginal,
    sha256: createHash("sha256").update(jpeg).digest("hex"),
    ...(aviso ? { aviso } : {}),
  };
}

async function main() {
  mkdirSync(DIR_SAIDA, { recursive: true });
  sharp.cache(false);
  const regioes = lerRegioes();
  const registros = [];
  for (const m of lerJanelas()) {
    const reg = await tratar(m, regioes);
    registros.push(reg);
    console.log(
      reg.erro
        ? `${m.id}-${m.lugar}: ${reg.erro}`
        : `${reg.arquivo}  ${reg.largura}x${reg.altura}  gR=${reg.gR} gB=${reg.gB} gammaOut=${reg.gammaOut}  luma ${reg.lumaOriginal} → ${reg.lumaTratada}${reg.lumaConforme ? "" : "  (NÃO CONFORME: teto 1,30)"}`,
    );
  }
  writeFileSync(
    join(DIR_SAIDA, "CREDITOS.json"),
    JSON.stringify({ receita: "DECISOES-P1a.md item 9 FOTO + ADENDO G1-FOTOS", gerador: "sandro-mecanica/scripts/tratar-fotos/index.js", mestres: registros }, null, 2) + "\n",
  );
  // SHA256SUMS no formato de `sha256sum` (ordem de nome), também saída deste script.
  const somas = registros.filter((r) => r.sha256).map((r) => `${r.sha256}  ${r.arquivo}`);
  writeFileSync(join(DIR_SAIDA, "SHA256SUMS"), somas.sort((a, b) => (a.slice(66) < b.slice(66) ? -1 : 1)).join("\n") + "\n");
  const ruins = registros.filter((r) => r.erro || !r.lumaConforme);
  if (ruins.length) {
    console.error(`${ruins.length} mestre(s) fora da regra; ver CREDITOS.json`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
