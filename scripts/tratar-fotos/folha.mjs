#!/usr/bin/env node
// Folha de contato para o G1 (DESENHO-APROVADO §3): cada mestre ao lado do
// ORIGINAL na mesma janela e tamanho (passada A, sem tom), a 328 px e a
// 960 px de largura (≥ o maior tamanho em que o lugar aparece numa tela de
// 1440 com DPR 1; o arquivo nativo abre no clique). Lê CREDITOS.json; não
// trata nada. Saída: <obra>/folha-de-contato/folha.html + originais/.
// É página de revisão, fora do site: o cinza neutro de fundo é de propósito
// (não puxa a leitura de cor das fotos) e não é token do sistema.
//
// Uso: node scripts/tratar-fotos/folha.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { passadaA } from "./index.js";
import sharp from "sharp";

const OBRA = new URL("../../../", import.meta.url).pathname;
const TRATADAS = join(OBRA, "fotos-tratadas");
const SAIDA = join(OBRA, "folha-de-contato");
mkdirSync(join(SAIDA, "originais"), { recursive: true });

// Provisório por slot (o que está em src/data/fotos.ts) e reservas.
// G1-FOTOS: servico-1 passa a T4-a (T4-c vira reserva); T2-b e T5-c saem das
// reservas do hero (marca legível) e ficam só como mestres, em FORA_DO_HERO.
const SLOTS = [
  { slot: "hero", tema: "hero", provisorio: "T7-b-hero", reservas: ["T2-c-hero", "T1-b-hero"] },
  { slot: "servico-1", tema: "freios", provisorio: "T4-a-servico", reservas: ["T4-c-servico", "T4-d-servico"] },
  { slot: "servico-2", tema: "revisão", provisorio: "T1-b-servico", reservas: ["T5-a-servico", "T5-b-servico", "T1-a-servico"] },
  { slot: "servico-3", tema: "óleo", provisorio: "T3-d-servico", reservas: [] },
  { slot: "sobre", tema: "sobre (bancada sem pessoa)", provisorio: "T6-a-sobre", reservas: [] },
];
const FORA_DO_HERO = ["T2-b-hero", "T5-c-hero"];

// Riscos residuais da triagem (FOTOS-TRIAGEM.md, "O que ficou sem cobertura", item 5),
// com o lugar no quadro onde olhar. T7-b: achado no enquadramento desta fatia.
const RISCOS = {
  "T2-b": "BRIDGESTONE no flanco do pneu (centro-baixo). Neste enquadramento o pneu é o centro da foto e a palavra se lê a 960 px.",
  "T5-c": "\"VDO\" e código de peça no corpo de borboleta (terço esquerdo, embaixo, junto ao coletor).",
  "T1-b": "\"JMAX\" gravado no reservatório de tampa azul (centro-esquerda, junto à mão).",
  "T5-a": "Texto de interface em espanhol na tela do scanner (\"Unidad de control\"; metade de baixo).",
  "T5-b": "Texto de interface em espanhol na tela do scanner (\"Módulo de control del motor\"; metade de baixo).",
  "T4-c": "REGRA DE USO (ADENDO G1-FOTOS): preto nas bordas esquerda e inferior e no canto do chanfro; nem preto puro dá borda legível contra grafite-950. Não vai em slot que encoste em painel escuro.",
  "T4-d": "Janela refeita no G1-FOTOS: espelho do freio inteiro com mola e eixo; tambor e pano ficam fora (não cabem juntos em 3:2 na foto em retrato).",
  "T6-a": "Achado desta fatia (não é da triagem): algarismo \"4\" pintado no alto da porta de enrolar (canto superior esquerdo), dentro da região aprovada; a folga lateral de 4% não chega a tirá-lo.",
  "T7-b": "G1-FOTOS: o texto à mão do para-brisa (\"139 de la / 200\") ficou FORA da janela nova (começa em x 1170; o texto acaba em x 1150). Conferir que nada dele aparece na borda esquerda.",
};

// Mestre não gerado (ex.: janela exigiria ampliar) fica fora da folha; o script já o acusou.
const creditos = JSON.parse(readFileSync(join(TRATADAS, "CREDITOS.json"), "utf8")).mestres.filter((c) => !c.erro);
const porChave = Object.fromEntries(creditos.map((c) => [`${c.id}-${c.lugar}`, c]));

for (const c of creditos) {
  const png = await passadaA(c.id, c.janela, c.lugar);
  await sharp(png).jpeg({ quality: 90 }).toFile(join(SAIDA, "originais", `${c.id}-${c.lugar}.jpg`));
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function cartao(chave, papel) {
  const c = porChave[chave];
  if (!c) return `<article class="mestre"><header><span class="papel">${papel}</span><h3>${esc(chave)}: MESTRE NÃO GERADO (ver CREDITOS.json)</h3></header></article>`;
  const j = c.janela;
  const risco = RISCOS[c.id];
  const orig = `originais/${chave}.jpg`;
  const trat = `../fotos-tratadas/${chave}.jpg`;
  return `
  <article class="mestre ${papel === "PROVISÓRIO" ? "prov" : ""}" id="${chave}">
    <header>
      <span class="papel">${papel}</span>
      <h3>${esc(c.id)} · ${esc(c.lugar)} · ${c.largura}×${c.altura}</h3>
      <p>gR ${c.gR}${c.gRnoClamp ? " (NO CLAMP)" : ""} · gB ${c.gB}${c.gBnoClamp ? " (NO CLAMP)" : ""} · g0 ${c.g0} · gammaOut ${c.gammaOut} · luma ${c.lumaOriginal} → ${c.lumaTratada}</p>
      <p>janela ${j.left},${j.top} ${j.width}×${j.height} do original · ${esc(c.autor)} · <a href="${esc(c.url)}">página</a></p>
      ${c.aviso ? `<p class="aviso">${esc(c.aviso)}</p>` : ""}
      ${risco ? `<p class="risco">OLHAR AQUI: ${esc(risco)}</p>` : ""}
    </header>
    <div class="par p328">
      <figure><img src="${orig}" width="328" alt=""><figcaption>original, mesma janela · 328</figcaption></figure>
      <figure><img src="${trat}" width="328" alt=""><figcaption>tratada · 328</figcaption></figure>
    </div>
    <div class="par p960">
      <figure><a href="${orig}"><img src="${orig}" width="960" alt=""></a><figcaption>original · 960</figcaption></figure>
      <figure><a href="${trat}"><img src="${trat}" width="960" alt=""></a><figcaption>tratada · 960 (clique: ${c.largura} nativo)</figcaption></figure>
    </div>
  </article>`;
}

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Folha de contato — fotos retratadas (ADENDO G1-FOTOS) — Sandro Mecânica</title>
<style>
  body { margin: 0; padding: 24px; background: #808080; color: #111; font: 15px/1.4 system-ui, sans-serif; width: 1960px; }
  h1 { margin: 0 0 4px; font-size: 26px; } h2 { margin: 32px 0 8px; font-size: 22px; border-top: 3px solid #111; padding-top: 8px; }
  .mestre { background: #9a9a9a; padding: 12px; margin: 0 0 16px; }
  .mestre.prov { outline: 6px solid #111; }
  .mestre header h3 { display: inline; font-size: 18px; margin-left: 8px; } .mestre header p { margin: 2px 0; }
  .papel { background: #111; color: #fff; padding: 2px 8px; font-weight: 700; }
  .risco { background: #fff; padding: 4px 8px; font-weight: 700; display: inline-block; }
  .aviso { background: #111; color: #fff; padding: 4px 8px; font-weight: 700; display: inline-block; }
  .par { display: flex; gap: 16px; margin-top: 8px; } figure { margin: 0; } figcaption { font-size: 13px; }
  img { display: block; height: auto; }
  a { color: inherit; }
</style></head><body>
<h1>Folha de contato — 14 mestres retratados pelo ADENDO G1-FOTOS</h1>
<p>Receita única DECISOES-P1a item 9 + ADENDO G1-FOTOS (clamp gB 0,94–1,12 e gR 0,90–min(1,15; 1,106·gB); g0 pela luma; linear [.9294,.9176,.8980],[10,11,13]) em scripts/tratar-fotos/index.js. Esquerda: original recortado na MESMA janela e tamanho, sem tom. Direita: mestre tratado. Moldura preta = PROVISÓRIO do slot, já em src/data/fotos.ts; o resto é reserva. Janelas em scripts/tratar-fotos/janelas.json (contestáveis). Teste do G1: lado a lado parecem da mesma sessão e o objeto continua reconhecível a 328.</p>
${SLOTS.map((s) => `
<section>
  <h2>${esc(s.slot)} — ${esc(s.tema)}${s.reservas.length ? "" : " — SEM RESERVA"}</h2>
  ${cartao(s.provisorio, "PROVISÓRIO")}
  ${s.reservas.map((r) => cartao(r, "reserva")).join("")}
</section>`).join("")}
<section>
  <h2>Fora das reservas do hero — NÃO USAR COMO HERO (marca legível)</h2>
  ${FORA_DO_HERO.map((r) => cartao(r, "não usar como hero")).join("")}
</section>
</body></html>
`;
writeFileSync(join(SAIDA, "folha.html"), html);
console.log(`folha.html com ${SLOTS.reduce((n, s) => n + 1 + s.reservas.length, FORA_DO_HERO.length)} cartões em ${SAIDA}`);
