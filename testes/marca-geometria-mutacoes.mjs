#!/usr/bin/env node
// Prova de que testes/marca-geometria.mjs NÃO é verde por construção:
// muta, um de cada vez, cada número que a decisão fixa e exige que o
// checker saia 1 (nem 0, nem 2).
//
//   Base: sem argumentos, e com cópias intactas de public/ e da decisão,
//   o checker sai 0.
//   Em cópia de public/ (--public): cada número de cada `d` de logo.svg,
//   marca-sem-descritor.svg, logo-mark.svg e favicon.svg; cada x de
//   translate(x 0) das letras; cada número de cada viewBox; o stroke-width
//   do favicon.
//   Em cópia da decisão (--decisao): cada número dos caminhos das letras
//   S A N D R O, cada x da linha "x:", cada número dos dois viewBox, o
//   "traco 18" e cada número dos caminhos do favicon — SÓ dentro do DOMÍNIO
//   (Texto literal inteiro + o DEPOIS do ADENDO G1; ver "DOMÍNIO (F5)"
//   abaixo). O que cai fora sai listado como EXCLUÍDA, com bloco e motivo.
//
// Mutação = número + 1 (sempre muda o valor, mantém a sintaxe).
//
// Uso: node testes/marca-geometria-mutacoes.mjs [--geometria ARQ] [--public DIR] [--decisao ARQ]
//   --geometria: checker a exercitar (padrão testes/marca-geometria.mjs).
//   Sai 0 se a base passou e toda mutação saiu 1; 1 caso contrário.

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..");
const arg = (nome, padrao) => {
  const i = process.argv.indexOf(nome);
  return i > 0 ? resolve(process.argv[i + 1]) : padrao;
};
const GEOMETRIA = arg("--geometria", join(AQUI, "marca-geometria.mjs"));
const PUBLIC = arg("--public", join(RAIZ, "public"));
const DECISAO = arg("--decisao", resolve(RAIZ, "../DECISOES-P1a.md"));

const tmp = mkdtempSync(join(tmpdir(), "mutacao-marca-"));
// O checker lê a PRIMEIRA ocorrência de cada opção: nunca repetir.
const rodar = ({ publico = PUBLIC, decisao = DECISAO } = {}) =>
  spawnSync(process.execPath, [GEOMETRIA, "--decisao", decisao, "--public", publico], { encoding: "utf-8" }).status;

const problemas = [];
let total = 0;

// ------------------------------------------------------------ base
const base = rodar();
if (base !== 0) problemas.push(`base: checker saiu ${base} com public/ e decisão originais (esperado 0)`);
const pubIntacto = join(tmp, "public-intacto");
cpSync(PUBLIC, pubIntacto, { recursive: true });
const decIntacta = join(tmp, "decisao-intacta.md");
cpSync(DECISAO, decIntacta);
const baseCopia = rodar({ publico: pubIntacto, decisao: decIntacta });
if (baseCopia !== 0) problemas.push(`base: checker saiu ${baseCopia} com CÓPIAS intactas (esperado 0)`);

// --------------------------------------------------------- mutador
const NUM = /-?\d+(?:\.\d+)?/g;
const mais1 = (s) => String(Math.round((Number(s) + 1) * 1000) / 1000);

/** Cada número dentro de cada região [ini,fim) de `texto`, como mutação. */
function* mutacoes(texto, regioes) {
  for (const { ini, fim, rotulo } of regioes) {
    for (const m of texto.slice(ini, fim).matchAll(NUM)) {
      const pos = ini + m.index;
      yield {
        pos,
        rotulo: `${rotulo}: ${m[0]}→${mais1(m[0])} (col ${pos})`,
        texto: texto.slice(0, pos) + mais1(m[0]) + texto.slice(pos + m[0].length),
      };
    }
  }
}
/** Regiões = grupo 1 de cada casamento de `re` (flag d obrigatória). */
const regioesDe = (texto, re, rotulo) =>
  [...texto.matchAll(re)].map((m) => ({ ini: m.indices[1][0], fim: m.indices[1][1], rotulo: typeof rotulo === "function" ? rotulo(m) : rotulo }));

const porCategoria = {};
function exigeUm(rotulo, status) {
  total += 1;
  const cat = rotulo.split(":")[0];
  porCategoria[cat] = (porCategoria[cat] ?? 0) + 1;
  if (status !== 1) problemas.push(`${rotulo}: checker saiu ${status} (esperado 1)`);
}

// ------------------------------------------------- mutações em public/
const D = [/\sd="([^"]+)"/dg, "caminho"];
const X = [/<g transform="translate\((-?[\d.]+) 0\)">/dg, "x de letra"];
const VB = [/\sviewBox="([^"]+)"/dg, "viewBox"];
const TRACO_ATR = [/\sstroke-width="([^"]+)"/dg, "traço"];
const ALVOS_PUBLIC = {
  "logo.svg": [D, X, VB],
  "marca-sem-descritor.svg": [D, X, VB],
  "logo-mark.svg": [D, VB],
  "favicon.svg": [D, VB, TRACO_ATR],
};
for (const [arquivo, alvos] of Object.entries(ALVOS_PUBLIC)) {
  const original = readFileSync(join(PUBLIC, arquivo), "utf-8");
  const regioes = alvos.flatMap(([re, nome]) => {
    const achadas = regioesDe(original, re, `public/${arquivo} ${nome}`);
    if (!achadas.length) problemas.push(`public/${arquivo}: nenhum alvo "${nome}" encontrado para mutar`);
    return achadas;
  });
  for (const mut of mutacoes(original, regioes)) {
    const dir = join(tmp, "public-mut");
    rmSync(dir, { recursive: true, force: true });
    cpSync(PUBLIC, dir, { recursive: true });
    writeFileSync(join(dir, arquivo), mut.texto);
    exigeUm(mut.rotulo, rodar({ publico: dir }));
  }
}

// ------------------------------------------------ mutações na decisão
// DOMÍNIO (F5). Só se muta o que vale HOJE para a marca e que o checker lê.
// Os blocos são achados pelo TÍTULO "## ..." e pelos marcadores do próprio
// texto, NUNCA por número de linha:
//   "## Texto literal", cerca ```: inteiro. É a decisão vigente; o G1 já
//      trocou nela as linhas que o ADENDO mudou.
//   "## ADENDO G1 — texto literal", cerca ```: só o que vale DEPOIS. Saem,
//      em cada linha "ANTES ... -> DEPOIS", tudo até "-> DEPOIS" (rótulo e
//      valor substituído no G1 — o mesmo corte que o checker faz), a
//      frase "Razao: ... ." (justificativa calculada do caminho; não fixa
//      medida própria) e a linha "Descartado:" (alternativas recusadas).
//   Todo o resto do arquivo: fora. Hoje isso é a seção "## DESVIOS" ("Os
//      ANTES, literais" dos valores de antes do G1) e as notas; nenhum deles
//      fixa a marca de hoje.
// Toda mutação gerada fora do domínio é LISTADA como EXCLUÍDA, com bloco e
// motivo; nenhuma some em silêncio. Se um título ou cerca não for achado, é
// PROBLEMA (sai 1), nunca domínio vazio.
const decisao = readFileSync(DECISAO, "utf-8");
const ALVOS_DECISAO = [
  [/\b([SANDRO])\(\d+\):\s*([\s\S]*?)(?=\s+[SANDRO]\(\d+\):|\n)/dg, 2, (m) => `decisão caminho ${m[1]}`],
  [/(?:\n|DEPOIS )x: (S-?\d+ A-?\d+ N-?\d+ D-?\d+ R-?\d+ O-?\d+)/dg, 1, "decisão x de letra"],
  [/viewBox (-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+)/dg, 1, "decisão viewBox completa"],
  [/sem descritor (-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+)/dg, 1, "decisão viewBox sem descritor"],
  [/Favicon = [^\n]*?traco (\d+)/dg, 1, "decisão traço do favicon"],
  [/Favicon = [^\n]*?traco \d+, (M[^\n]*?L9 112)/dg, 1, "decisão caminho do favicon"],
];

/** Seção "## titulo" (até o próximo "## ") e o miolo da sua cerca ```. */
function secao(texto, titulo) {
  const h = [...texto.matchAll(/^## (.*)$/gm)];
  const i = h.findIndex((m) => m[1].trim() === titulo || m[1].startsWith(`${titulo} (`)); // "(data)" opcional
  if (i < 0) return null;
  const ini = h[i].index;
  const fim = i + 1 < h.length ? h[i + 1].index : texto.length;
  const abre = texto.indexOf("```", ini);
  const fecha = abre < 0 ? -1 : texto.indexOf("```", texto.indexOf("\n", abre) + 1);
  if (abre < 0 || fecha < 0 || fecha > fim) return null;
  return { titulo, ini, fim, cerca: [texto.indexOf("\n", abre) + 1, fecha] };
}
const T_LITERAL = "Texto literal";
const T_ADENDO = "ADENDO G1 — texto literal";
const literal = secao(decisao, T_LITERAL);
const adendoG1 = secao(decisao, T_ADENDO);
if (!literal) problemas.push(`decisão: seção "## ${T_LITERAL}" com cerca não encontrada`);
if (!adendoG1) problemas.push(`decisão: seção "## ${T_ADENDO}" com cerca não encontrada`);

/** Trechos do ADENDO G1 fora do domínio: [ini, fim, motivo]. */
const foraDoAdendo = [];
if (adendoG1) {
  const [a, b] = adendoG1.cerca;
  for (const lm of decisao.slice(a, b).matchAll(/^.*$/gm)) {
    const base = a + lm.index;
    const l = lm[0];
    if (/^Descartado:/.test(l)) {
      foraDoAdendo.push([base, base + l.length, 'linha "Descartado:": alternativa recusada, não vale']);
      continue;
    }
    // Mesmo corte do checker: do início da linha até "-> DEPOIS".
    const antes = /\bANTES\b[\s\S]*?->\s*DEPOIS\b/.test(l) && l.match(/^[\s\S]*?->\s*DEPOIS\s*/);
    if (antes) foraDoAdendo.push([base, base + antes[0].length, 'trecho "... ANTES ... -> DEPOIS": rótulo e valor substituído no G1']);
    const razao = l.match(/\bRazao:[\s\S]*?(?:\.(?=\s)|$)/);
    if (razao) foraDoAdendo.push([base + razao.index, base + razao.index + razao[0].length, 'frase "Razao:": justificativa calculada do caminho, não fixa medida']);
  }
}
const dentro = (pos, [ini, fim]) => pos >= ini && pos < fim;
/** Onde cai `pos`: { bloco, motivo } — motivo null = dentro do domínio. */
function classifica(pos) {
  if (literal && dentro(pos, literal.cerca)) return { bloco: T_LITERAL, motivo: null };
  if (adendoG1 && dentro(pos, adendoG1.cerca)) {
    const f = foraDoAdendo.find((t) => dentro(pos, t));
    return { bloco: "ADENDO G1", motivo: f ? f[2] : null };
  }
  const h = [...decisao.slice(0, pos).matchAll(/^## (.*)$/gm)].at(-1)?.[1] ?? "(antes do 1º título)";
  const motivo =
    h === "DESVIOS"
      ? 'seção "## DESVIOS": registro histórico ("Os ANTES, literais" do G1 e desvios de construção); o vigente está no Texto literal e no ADENDO G1'
      : literal || adendoG1
        ? "fora dos blocos Texto literal e ADENDO G1: não fixa a marca"
        : "decisão sem blocos reconhecíveis";
  return { bloco: h, motivo };
}

const regioesDecisao = ALVOS_DECISAO.flatMap(([re, grupo, rotulo]) => {
  const achadas = [...decisao.matchAll(re)].map((m) => ({
    ini: m.indices[grupo][0],
    fim: m.indices[grupo][1],
    rotulo: typeof rotulo === "function" ? rotulo(m) : rotulo,
  }));
  // Cobertura mínima do bloco normativo: todo alvo tem de casar no Texto literal.
  if (!achadas.some((r) => literal && dentro(r.ini, literal.cerca)))
    problemas.push(`decisão: alvo ${re} não encontrado no "## ${T_LITERAL}" para mutar`);
  return achadas;
});
const letrasAchadas = new Set(
  regioesDecisao
    .filter((r) => literal && dentro(r.ini, literal.cerca))
    .map((r) => r.rotulo.match(/caminho ([SANDRO])$/)?.[1])
    .filter(Boolean),
);
if (letrasAchadas.size !== 6) problemas.push(`decisão: no Texto literal achei caminhos de ${[...letrasAchadas].join("")} (esperado SANDRO)`);

const linhaDe = (pos) => decisao.slice(0, pos).split("\n").length; // só para o relatório
const excluidas = [];
const porBloco = {};
for (const mut of mutacoes(decisao, regioesDecisao)) {
  const { bloco, motivo } = classifica(mut.pos);
  if (motivo) {
    excluidas.push(`[${bloco}] ${mut.rotulo} L${linhaDe(mut.pos)} — ${motivo}`);
    continue;
  }
  porBloco[bloco] = (porBloco[bloco] ?? 0) + 1;
  const arq = join(tmp, "decisao-mut.md");
  writeFileSync(arq, mut.texto);
  exigeUm(mut.rotulo.replace(/^([^:]*)/, `$1 [${bloco}]`), rodar({ decisao: arq }));
}

rmSync(tmp, { recursive: true, force: true });

// ---------------------------------------------------------- resultado
console.log(`checker: ${GEOMETRIA}\npublic:  ${PUBLIC}\ndecisão: ${DECISAO}`);
console.log(`base ${base}/${baseCopia}; ${total} mutações, ${total - problemas.filter((p) => /esperado 1/.test(p)).length} mortas`);
for (const [cat, n] of Object.entries(porCategoria)) console.log(`  ${String(n).padStart(4)}  ${cat}`);
console.log(`decisão no domínio: ${Object.entries(porBloco).map(([b, n]) => `${b} ${n}`).join(", ")}; excluídas ${excluidas.length}`);
for (const e of excluidas) console.log(`  EXCLUÍDA ${e}`);
for (const p of problemas) console.log(`  PROBLEMA: ${p}`);
process.exit(problemas.length ? 1 : 0);
