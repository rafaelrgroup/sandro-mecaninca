#!/usr/bin/env node
// Prova, NO DIST, de que cada slot exibe a foto que a triagem manda e com o
// crédito certo (P4, fatia FT2; decisões do dono (2) e (4) de FATIAS-P4.md).
//
//   A. ARQUIVO EXIBIDO = MESTRE. Para cada [data-foto=<slot>] de dist/index.html,
//      todas as URLs (img src/srcset e source srcset) saem de UM arquivo de
//      entrada, que o Astro copia em dist/_astro/<nome>.<hash>.jpg. O sha256
//      dessa cópia tem de ser o de um mestre de fotos-tratadas/CREDITOS.json,
//      e o lugar do mestre tem de ser o do slot.
//   B. SLOT → FOTO DA TRIAGEM. Os slots da linha "APROVADA COM RECORTE" do
//      Resumo de FOTOS-TRIAGEM-PERFIL.md ("P08 → hero, …") exibem o mestre
//      daquela P; os demais slots exibem foto de banco (banco não nulo).
//   C. MESTRE REAL É DO PERFIL DO CLIENTE E NÃO FOI AMPLIADO. Para o mestre de
//      slot real: fonte "perfil-google"; o original fotos-brutas/<id>.jpg tem
//      o sha256 de uma foto de perfil-google/inventario.json subida pela conta
//      da oficina (não a 10), e o mesmo px do inventário (pega miniatura do
//      Google); autor e url = conta e link do contribuidor no inventário; a
//      janela é >= o mestre (sem ampliar).
//   D. SLOT REAL SEM CRÉDITO DE BANCO. O mestre de slot real tem banco null e
//      não carrega autor, url nem licença de banco (pega quem troca só o
//      arquivo e deixa o crédito antigo).
//   E. RODAPÉ = FOTOS DE BANCO EXIBIDAS. Os créditos de "Créditos das fotos"
//      (Rodape.astro) são exatamente {url, autor, banco} dos mestres de banco
//      exibidos: nem mais (crédito Pexels que sobrou de slot que virou real),
//      nem menos.
//   F. FOTO 10 AUSENTE. Nenhum arquivo de dist/ nem de fotos-tratadas/ tem o
//      sha256 da foto 10 do inventário (de usuária: decisão do dono (2)),
//      nenhum texto cita o arquivo, o id Google ou a autora dela, e nenhum
//      mestre de CREDITOS.json sai dela.
//
// Uso: node testes/fotos-exibidas.mjs [dist] [dir-das-tratadas]
//   (padrão: <projeto>/dist e <obra>/fotos-tratadas; <obra> = pai do projeto).
//   Sai 0 se tudo passa, 1 se algo falha, 2 se não conseguiu montar a prova.
//   Só lê: não builda nem escreve. Builde antes (em cópia, FATIAS-P2-P3 regra 4).

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const PROJETO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OBRA = resolve(PROJETO, "..");
const DIST = resolve(process.argv[2] ?? join(PROJETO, "dist"));
const TRATADAS = resolve(process.argv[3] ?? join(OBRA, "fotos-tratadas"));
const BRUTAS = join(OBRA, "fotos-brutas");
const INVENTARIO = join(OBRA, "perfil-google/inventario.json");
const TRIAGEM_PERFIL = join(OBRA, "FOTOS-TRIAGEM-PERFIL.md");

const SLOTS = ["hero", "servico-1", "servico-2", "servico-3", "sobre"];
const TAM = { hero: [1920, 1280], servico: [1440, 960], sobre: [1440, 1800] };
const lugarDo = (slot) => (slot.startsWith("servico") ? "servico" : slot);
// Conta que subiu 01-09 no perfil (FOTOS-TRIAGEM-PERFIL.md, C6). Ser do dono é dedução pelo nome.
const CONTA_DA_OFICINA = "Sandro mecânica";
const FONTE_REAL = "perfil-google";
const DE_BANCO = /pexels|unsplash|license free/i;

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const curto = (s) => String(s).slice(0, 12) + "…";

let html, creditos, inventario, realPorSlot;
try {
  html = readFileSync(join(DIST, "index.html"), "utf8");
  creditos = JSON.parse(readFileSync(join(TRATADAS, "CREDITOS.json"), "utf8")).mestres;
  inventario = JSON.parse(readFileSync(INVENTARIO, "utf8")).fotos;
  const tri = readFileSync(TRIAGEM_PERFIL, "utf8");
  const resumo = tri.slice(tri.indexOf("## Resumo"));
  const linha = resumo.split("\n").find((l) => /^\|\s*APROVADA COM RECORTE\s*\|/.test(l));
  if (!linha) throw new Error(`linha "APROVADA COM RECORTE" ausente do Resumo de ${TRIAGEM_PERFIL}`);
  realPorSlot = Object.fromEntries([...linha.matchAll(/\b(P0[1-9]) → ([a-z0-9-]+)/g)].map((m) => [m[2], m[1]]));
  if (!Object.keys(realPorSlot).length) throw new Error(`nenhum "Pnn → slot" na linha: ${linha}`);
  for (const s of Object.keys(realPorSlot)) if (!SLOTS.includes(s)) throw new Error(`slot desconhecido na triagem: ${s}`);
  if (!inventario.some((f) => f.arquivo === "fotos/10.jpg")) throw new Error("fotos/10.jpg ausente do inventário: a parte F seria verde por construção");
} catch (e) {
  console.error(`MONTAGEM: ${e.message}`);
  process.exit(2);
}

const falhas = [];
const falha = (chave, msg) => falhas.push(`${chave}: ${msg}`);

// ------------------------------------------------------------ A-D por slot

/** URLs de /_astro/ dentro do bloco [data-foto=slot] (até o </picture>). */
function urlsDoSlot(slot) {
  const blocos = [...html.matchAll(new RegExp(`data-foto="${slot}"[^>]*>([\\s\\S]*?)</picture>`, "g"))];
  if (blocos.length !== 1) return { erro: `${blocos.length} blocos data-foto="${slot}" no dist (esperado 1)` };
  const urls = new Set();
  for (const m of blocos[0][1].matchAll(/\b(?:src|srcset)="([^"]+)"/g))
    for (const parte of m[1].split(",")) urls.add(parte.trim().split(/\s+/)[0]);
  return { urls: [...urls] };
}

const ASTRO = join(DIST, "_astro");
const EXT_ORIGINAL = [".jpg", ".jpeg", ".png"];
/** Arquivo de entrada copiado pelo Astro para uma URL: <nome>.<hash>[_<variante>].<ext> → <nome>.<hash>.jpg. */
function originalDe(url) {
  const base = url.replace(/^.*\/_astro\//, "").replace(/\.[a-z]+$/, "");
  for (const stem of [base, base.replace(/_[^_]+$/, "")])
    for (const ext of EXT_ORIGINAL) if (existsSync(join(ASTRO, stem + ext))) return stem + ext;
  return null;
}

const exibidos = {}; // slot -> mestre
// Créditos dos mestres de banco (os T*): um P com banco não entra, para não contaminar os outros P.
const deBanco = creditos.filter((c) => c.banco && !/^P/.test(c.id));
const autoresDeBanco = new Set(deBanco.map((c) => c.autor));
const urlsDeBanco = new Set(deBanco.map((c) => c.url));

for (const slot of SLOTS) {
  const { urls, erro } = urlsDoSlot(slot);
  if (erro) { falha(slot, erro); continue; }
  if (!urls.length || urls.some((u) => !u.includes("/_astro/"))) { falha(slot, `URL fora de /_astro/: ${urls.join(" ")}`); continue; }
  const origens = new Set(urls.map(originalDe));
  if (origens.has(null)) { falha(slot, `sem arquivo de entrada no dist para ${urls.find((u) => !originalDe(u))}`); continue; }
  if (origens.size !== 1) { falha(slot, `mistura arquivos de entrada: ${[...origens].join(", ")}`); continue; }
  const arq = [...origens][0];
  const sha = sha256(readFileSync(join(ASTRO, arq)));

  // A
  const m = creditos.find((c) => c.sha256 === sha);
  if (!m) { falha(slot, `exibe ${arq} (sha ${curto(sha)}), que não é mestre de CREDITOS.json`); continue; }
  const chave = `${m.id}-${m.lugar}`;
  exibidos[slot] = m;
  if (m.lugar !== lugarDo(slot)) falha(slot, `exibe o mestre ${chave}, de lugar "${m.lugar}", slot pede "${lugarDo(slot)}"`);

  // B
  const esperado = realPorSlot[slot];
  if (esperado && m.id !== esperado) {
    falha(slot, `exibe ${chave} (${m.banco ?? "sem banco"}, ${m.autor}); a triagem do perfil manda a foto real ${esperado}`);
    continue;
  }
  if (!esperado) {
    if (!m.banco || /^P/.test(m.id)) falha(slot, `slot sem foto real na triagem exibe ${chave} sem banco`);
    continue;
  }

  // C
  if (m.fonte !== FONTE_REAL) falha(slot, `mestre ${chave} com fonte ${JSON.stringify(m.fonte)}, esperado "${FONTE_REAL}"`);
  const bruta = join(BRUTAS, `${m.id}.jpg`);
  if (!existsSync(bruta)) falha(slot, `original ${bruta} não existe`);
  else {
    const shaOrig = sha256(readFileSync(bruta));
    const inv = inventario.find((f) => f.sha256 === shaOrig);
    if (!inv) falha(slot, `original ${m.id}.jpg (sha ${curto(shaOrig)}) não é foto de perfil-google/inventario.json`);
    else {
      if (inv.arquivo === "fotos/10.jpg" || inv.quem_subiu_exibido !== CONTA_DA_OFICINA)
        falha(slot, `original ${m.id}.jpg é ${inv.arquivo}, subida por "${inv.quem_subiu_exibido}", não pela conta da oficina`);
      if (m.autor !== inv.quem_subiu_exibido) falha(slot, `autor ${JSON.stringify(m.autor)} ≠ quem subiu no perfil "${inv.quem_subiu_exibido}"`);
      if (m.url !== inv.link_contribuidor) falha(slot, `url ${JSON.stringify(m.url)} ≠ link do contribuidor ${inv.link_contribuidor}`);
      const md = await sharp(bruta).metadata();
      const W = md.autoOrient?.width ?? md.width, H = md.autoOrient?.height ?? md.height;
      if (W !== inv.largura || H !== inv.altura) falha(slot, `original ${m.id}.jpg mede ${W}x${H}, inventário ${inv.largura}x${inv.altura}`);
    }
  }
  const [Lw, Lh] = TAM[lugarDo(slot)];
  const j = m.janela ?? {};
  if (!(j.width >= Lw && j.height >= Lh)) falha(slot, `mestre ${chave} ampliado: janela ${j.width}x${j.height} < ${Lw}x${Lh}`);

  // D
  if (m.banco !== null) falha(slot, `mestre ${chave} de foto real com banco ${JSON.stringify(m.banco)}, esperado null`);
  if (autoresDeBanco.has(m.autor)) falha(slot, `mestre ${chave} de foto real com autor de banco "${m.autor}"`);
  if (urlsDeBanco.has(m.url) || DE_BANCO.test(m.url ?? "")) falha(slot, `mestre ${chave} de foto real com url de banco ${m.url}`);
  if (DE_BANCO.test(m.licenca ?? "")) falha(slot, `mestre ${chave} de foto real com licença de banco "${m.licenca}"`);
}

// ------------------------------------------------------------ E rodapé

const decod = (s) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
const det = html.match(/<details[^>]*>(?:(?!<\/details>)[\s\S])*?Créditos das fotos[\s\S]*?<\/details>/);
const noRodape = det
  ? [...det[0].matchAll(/<li>\s*<a href="([^"]+)"[^>]*>([^<]*)<\/a>\s*\(([^)]*)\)\s*<\/li>/g)].map((m) =>
      JSON.stringify({ url: decod(m[1]), autor: decod(m[2]), banco: decod(m[3]) }),
    )
  : [];
if (det && noRodape.length !== (det[0].match(/<li\b/g) ?? []).length) falha("rodapé", "item de crédito fora do formato <a href>autor</a> (banco)");
const devidos = Object.values(exibidos)
  .filter((m) => m.banco)
  .map((m) => JSON.stringify({ url: m.url, autor: m.autor, banco: m.banco }));
const restar = (a, b) => { const r = [...a]; for (const x of b) { const i = r.indexOf(x); if (i >= 0) r.splice(i, 1); } return r; };
for (const x of restar(noRodape, devidos)) falha("rodapé", `crédito que não é de foto de banco exibida: ${x}`);
for (const x of restar(devidos, noRodape)) falha("rodapé", `falta o crédito da foto de banco exibida: ${x}`);

// ------------------------------------------------------------ F foto 10

const dez = inventario.find((f) => f.arquivo === "fotos/10.jpg");
const marcas10 = ["fotos/10.jpg", dez.id_foto_google, dez.url_origem?.match(/gps-cs-s\/([^=]+)/)?.[1], dez.quem_subiu_exibido].filter(Boolean);
function* arquivos(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* arquivos(p);
    else yield p;
  }
}
for (const raiz of [DIST, TRATADAS]) {
  for (const p of arquivos(raiz)) {
    const buf = readFileSync(p);
    if (sha256(buf) === dez.sha256) falha("foto 10", `${p} é a foto 10 (de usuária)`);
    if (/\.(html|json|js|mjs|css|svg|txt|md|xml)$|SHA256SUMS$/.test(p)) {
      const txt = buf.toString("utf8");
      for (const k of marcas10) if (txt.includes(k)) falha("foto 10", `${p} cita "${k}"`);
    }
  }
}
// Mestre real só de P01-P09 (fotos 01-09 da conta da oficina): um "P10-*" em CREDITOS.json sai da
// foto 10 mesmo que o original não esteja em fotos-brutas/ (e aí o sha não o pegaria).
for (const c of creditos) {
  if (/^P/.test(c.id) && !/^P0[1-9]$/.test(c.id)) falha("foto 10", `mestre ${c.id}-${c.lugar} em CREDITOS.json: id real fora de P01…P09`);
  const bruta = join(BRUTAS, `${c.id}.jpg`);
  if (existsSync(bruta) && sha256(readFileSync(bruta)) === dez.sha256) falha("foto 10", `mestre ${c.id}-${c.lugar} sai da foto 10`);
}

// ------------------------------------------------------------ saída

for (const slot of SLOTS) {
  const m = exibidos[slot];
  const st = falhas.some((f) => f.startsWith(slot + ":")) ? "FALHA" : "ok   ";
  console.log(`  ${st} ${slot.padEnd(10)} ${m ? `${m.id}-${m.lugar} (${m.banco ?? m.fonte})` : "—"}  triagem: ${realPorSlot[slot] ?? "banco"}`);
}
console.log(`  rodapé: ${noRodape.length} crédito(s), devidos ${devidos.length}`);
if (falhas.length) {
  console.error(`\nFALHOU (${falhas.length}):\n  ${falhas.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nPASSOU: 5 slots, rodapé e foto 10 conferidos em ${DIST}`);
