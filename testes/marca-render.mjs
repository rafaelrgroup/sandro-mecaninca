#!/usr/bin/env node
// Prova do componente src/components/ui/Marca.astro RENDERIZADO pelo Astro
// (não do gerador de public/, que é o que testes/marca-geometria.mjs cobre).
//
// Monta uma cópia descartável do projeto, põe nela uma página de prova com
// <Marca tamanho="xs|sm|lg"> e duas "sm" lado a lado, roda `astro build` na
// cópia e lê o HTML/CSS gerados. Nunca builda na árvore do projeto.
//
// Confere (marca recriada do letreiro, P4 MC3):
//   (1) cada <svg> de xs/sm/lg tem SÓ a classe de altura do tamanho
//       (xs h-lg, sm h-xl, lg h-2xl), que mede 32/48/72 px no CSS gerado
//       (.h-* → --spacing-* em rem × 16); role="img" e aria-label = nome
//       da oficina; desenha a marca recriada (data-parte="sandro" e o
//       mostrador). Descritor = data-parte="mecanica" (não há <text>):
//       abaixo de 40 px nenhuma versão o leva; a proporção do viewBox é
//       a da versão (7,3:1 completa, 3,96:1 sem descritor). O sm tem a
//       completa e a sem descritor, e só uma aparece por largura (o par
//       "block X:hidden" / "hidden X:block" com o mesmo X).
//   (2) todas as marcas da página de prova, e as da página real
//       (cabeçalho + rodapé), têm ids distintos entre si, e todo
//       url(#…) / href="#…" dentro de um <svg> aponta para um id do
//       PRÓPRIO <svg>.
//
// Uso: node testes/marca-render.mjs [--projeto DIR] [--manter]
//   DIR = raiz do projeto a copiar (padrão: a deste arquivo). --manter não
//   apaga a cópia. Sai 0 se tudo confere, 1 se algo diverge, 2 se o build
//   falhou. Node 22+.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--projeto");
const PROJETO = i > 0 ? resolve(process.argv[i + 1]) : RAIZ;
const MANTER = process.argv.includes("--manter");

const PX_POR_REM = 16;
const LIMIAR_DESCRITOR_PX = 40; // decisão P1a item 1: <40px sem descritor
const NOME = "Sandro Mecânica";
// Proporção largura:altura das duas versões (MC1: 7,3:1 e 3,96:1).
const PROPORCAO = { completa: 7.3, sem: 3.96 };
const TOLERANCIA_PROPORCAO = 0.05;
// versoes = quantas versões o tamanho renderiza; completa = se uma delas
// leva o descritor (sm: a completa aparece onde cabe; xs e lg: nunca).
const ESPERADO = {
  xs: { classe: "h-lg", px: 32, versoes: 1, completa: false },
  sm: { classe: "h-xl", px: 48, versoes: 2, completa: true },
  lg: { classe: "h-2xl", px: 72, versoes: 1, completa: false },
};

// ------------------------------------------------------ cópia + build
const copia = mkdtempSync(join(tmpdir(), "prova-marca-"));
const FORA = new Set(["node_modules", "dist", ".astro", ".git"]);
for (const nome of readdirSync(PROJETO)) {
  if (!FORA.has(nome)) cpSync(join(PROJETO, nome), join(copia, nome), { recursive: true });
}
// node_modules entrada a entrada: o cache do vite (.vite) nasce na cópia,
// não no node_modules do projeto.
mkdirSync(join(copia, "node_modules"));
for (const nome of readdirSync(join(PROJETO, "node_modules"))) {
  if (nome !== ".vite" && nome !== ".astro") symlinkSync(join(PROJETO, "node_modules", nome), join(copia, "node_modules", nome));
}
writeFileSync(
  join(copia, "src/pages/prova-marca.astro"),
  `---
import "@/styles/global.css";
import Marca from "@/components/ui/Marca.astro";
---
<html lang="pt-BR"><body>
<div data-prova="xs"><Marca tamanho="xs" /></div>
<div data-prova="sm"><Marca tamanho="sm" /></div>
<div data-prova="lg"><Marca tamanho="lg" tom="escuro" /></div>
<div data-prova="sm-2"><Marca tamanho="sm" /></div>
</body></html>
`,
);
const build = spawnSync(process.execPath, [join(copia, "node_modules/astro/bin/astro.mjs"), "build"], {
  cwd: copia,
  encoding: "utf-8",
});
if (build.status !== 0) {
  console.error(`NÃO MONTOU A PROVA: astro build saiu ${build.status} em ${copia}\n${build.stderr.slice(-2000)}`);
  process.exit(2);
}
const dist = join(copia, "dist");
const htmlProva = readFileSync(join(dist, "prova-marca/index.html"), "utf-8");
const htmlSite = readFileSync(join(dist, "index.html"), "utf-8");
const css = readdirSync(join(dist, "_astro"))
  .filter((n) => n.endsWith(".css"))
  .map((n) => readFileSync(join(dist, "_astro", n), "utf-8"))
  .join("\n");
if (!MANTER) rmSync(copia, { recursive: true, force: true });

// ---------------------------------------------------------- leitura
const falhas = [];
const ok = [];
const confere = (cond, msg) => (cond ? ok.push(msg) : falhas.push(msg));
const attr = (tag, nome) => tag.match(new RegExp(`\\s${nome}="([^"]*)"`))?.[1];

/** svgs da marca dentro de <div data-prova="…">. */
function marcasDaProva(rotulo) {
  const m = htmlProva.match(new RegExp(`<div data-prova="${rotulo}"[^>]*>([\\s\\S]*?)</div>`));
  return m ? [...m[1].matchAll(/<svg[\s\S]*?<\/svg>/g)].map((x) => x[0]) : [];
}
const abertura = (svg) => svg.match(/^<svg[^>]*>/)[0];
const ids = (svg) => [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const refs = (svg) => [
  ...[...svg.matchAll(/url\(\s*['"]?#([^)'"\s]+)['"]?\s*\)/g)].map((m) => m[1]),
  ...[...svg.matchAll(/\s(?:xlink:)?href="#([^"]+)"/g)].map((m) => m[1]),
];
const temParte = (svg, parte) => svg.includes(`data-parte="${parte}"`);
const PARTES_MARCA = ["sandro", "mostrador-anel", "mostrador-ponteiro", "mostrador-cubo"];

/** Altura em px de .h-<token> no CSS gerado (via --spacing-<token> em rem). */
function alturaPx(classe) {
  const token = classe.replace(/^h-/, "");
  const regra = css.match(new RegExp(`\\.${classe}\\{height:([^;}]+)`))?.[1];
  if (!regra) return null;
  const valor = regra.match(/^var\(--spacing-([\w-]+)\)$/)
    ? css.match(new RegExp(`--spacing-${token}:\\s*([\\d.]+)rem`))?.[1]
    : regra.match(/^([\d.]+)rem$/)?.[1];
  return valor ? Number(valor) * PX_POR_REM : null;
}

// ------------------------------------------------ (1) tamanho × descritor
for (const [tam, esp] of Object.entries(ESPERADO)) {
  const svgs = marcasDaProva(tam);
  confere(svgs.length === esp.versoes, `${tam}: ${esp.versoes} <svg> inline (achei ${svgs.length})`);
  const px = alturaPx(esp.classe);
  confere(px === esp.px, `${tam}: .${esp.classe} mede ${esp.px}px no CSS gerado (achei ${px})`);
  const visiveis = [];
  svgs.forEach((svg, k) => {
    const rot = `${tam}[${k + 1}]`;
    const tag = abertura(svg);
    const classes = (attr(tag, "class") ?? "").split(/\s+/).filter(Boolean);
    const alturas = classes.filter((c) => /^h-/.test(c));
    confere(alturas.length === 1 && alturas[0] === esp.classe, `${rot}: classe de altura ${esp.classe} (achei ${alturas.join(",") || "nenhuma"})`);
    confere(attr(tag, "role") === "img", `${rot}: role="img"`);
    confere(attr(tag, "aria-label") === NOME, `${rot}: aria-label "${NOME}" (achei ${JSON.stringify(attr(tag, "aria-label"))})`);
    for (const p of PARTES_MARCA) confere(temParte(svg, p), `${rot}: desenha data-parte="${p}" (marca recriada)`);
    const comDescritor = temParte(svg, "mecanica");
    if (px !== null) {
      confere(px >= LIMIAR_DESCRITOR_PX || !comDescritor, `${rot}: regra <${LIMIAR_DESCRITOR_PX}px sem descritor (${px}px, descritor ${comDescritor ? "presente" : "ausente"})`);
    }
    const vb = (attr(tag, "viewBox") ?? "").split(/[\s,]+/).map(Number);
    const razao = vb.length === 4 && vb[3] > 0 ? vb[2] / vb[3] : NaN;
    const alvo = comDescritor ? PROPORCAO.completa : PROPORCAO.sem;
    confere(Math.abs(razao - alvo) <= TOLERANCIA_PROPORCAO * alvo, `${rot}: viewBox ${comDescritor ? "completa" : "sem descritor"} na proporção ${alvo}:1 (achei ${razao.toFixed(2)})`);
    visiveis.push({ comDescritor, classes });
  });
  confere(visiveis.some((v) => v.comDescritor) === esp.completa, `${tam}: versão com descritor ${esp.completa ? "presente" : "ausente"}`);
  if (esp.versoes === 2 && visiveis.length === 2) {
    // Uma aparece abaixo do ponto X e a outra a partir dele, nunca as duas.
    const quebra = (cs, re) => cs.map((c) => c.match(re)?.[1]).find(Boolean);
    const [sem, com] = [visiveis.find((v) => !v.comDescritor), visiveis.find((v) => v.comDescritor)];
    const x = sem && quebra(sem.classes, /^(\w+):hidden$/);
    confere(!!sem && !!com, `${tam}: uma versão sem e uma com descritor`);
    confere(!!x && sem.classes.includes("block") && com?.classes.includes("hidden") && com.classes.includes(`${x}:block`),
      `${tam}: par excludente "block ${x}:hidden" / "hidden ${x}:block" (achei ${JSON.stringify(sem?.classes)} / ${JSON.stringify(com?.classes)})`);
  }
}

// ------------------------------------------------ (2) ids e url(#)
function confereIds(svgs, rotulo) {
  const todos = svgs.flatMap(ids);
  const repetidos = [...new Set(todos.filter((id, k) => todos.indexOf(id) !== k))];
  confere(svgs.length >= 2, `${rotulo}: ao menos duas marcas (achei ${svgs.length})`);
  confere(repetidos.length === 0, `${rotulo}: ids distintos entre marcas (repetidos: ${repetidos.join(",") || "nenhum"})`);
  svgs.forEach((svg, k) => {
    const proprios = new Set(ids(svg));
    const soltas = refs(svg).filter((r) => !proprios.has(r));
    confere(soltas.length === 0, `${rotulo} marca ${k + 1}: todo url(#)/href="#" aponta para id do próprio svg (soltas: ${soltas.join(",") || "nenhuma"})`);
  });
}
const provas = ["xs", "sm", "lg", "sm-2"].flatMap(marcasDaProva);
confereIds(provas, "prova-marca");
const doSite = [...htmlSite.matchAll(/<svg[^>]*aria-label="Sandro Mecânica"[^>]*>[\s\S]*?<\/svg>/g)].map((m) => m[0]);
confereIds(doSite, "index.html (cabeçalho+rodapé)");
// O cabeçalho (sm, 2 versões) e o rodapé (lg, 1) usam a marca recriada.
confere(doSite.length === 3 && doSite.every((svg) => temParte(svg, "sandro")), `index.html: 3 svgs da marca recriada (cabeçalho 2 + rodapé 1; achei ${doSite.length})`);

// ---------------------------------------------------------- resultado
console.log(`projeto: ${PROJETO}${MANTER ? `\ncópia:   ${copia}` : ""}`);
console.log(`${ok.length} conferências ok, ${falhas.length} falhas`);
for (const f of falhas) console.log(`  FALHOU: ${f}`);
process.exit(falhas.length ? 1 : 0);
