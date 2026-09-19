#!/usr/bin/env node
// Prova de fonte única do endereço (critério de aceite 1, DESENHO-APROVADO.md).
//
// Troca logradouro, bairro e CEP do bloco `export const oficina` de
// src/data/oficina.ts por sentinelas, refaz o build e exige:
//   1. nenhum arquivo de dist/ contém o valor antigo (cru, com &nbsp;/U+00A0,
//      URL-encoded com %20 ou +, sem acento, em qualquer caixa);
//   2. dist/index.html mostra as sentinelas no JSON-LD (streetAddress,
//      postalCode), no <address> do rodapé, na seção #localizacao, no src do
//      iframe do mapa, no link "Como chegar" (google.com/maps/search) e no
//      link do Waze (waze.com/ul).
// SEMPRE restaura o oficina.ts original (bytes idênticos) e refaz o build.
//
// Uso: node testes/mutacao-endereco.mjs [raiz-do-projeto]
//   raiz padrão: a pasta acima deste script. Sai 0 se passou, 1 se falhou,
//   2 se não conseguiu nem montar a prova (arquivo ausente, build quebrado,
//   restauração falhou).
// Só Node: nenhuma dependência.

import { spawn } from "node:child_process";
import { copyFileSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
const OFICINA_TS = join(RAIZ, "src/data/oficina.ts");
const DIST = join(RAIZ, "dist");
const INDEX = join(DIST, "index.html");

// Sentinelas: uma palavra só, ASCII, sem espaço — ficam idênticas cruas, em
// HTML e em encodeURIComponent, então achar a sentinela não depende de
// adivinhar a codificação de cada saída.
const SENTINELA = {
  logradouro: "SentinelaLogradouroQx7",
  bairro: "SentinelaBairroQx7",
  cep: "SentinelaCepQx7",
};

class ErroDeMontagem extends Error {}

// ---------------------------------------------------------------- mutação

/** Troca os três campos dentro de `endereco: { ... }` do bloco `export const oficina`. */
function mutar(fonte) {
  const inicioBloco = fonte.indexOf("export const oficina");
  if (inicioBloco < 0) throw new ErroDeMontagem("bloco `export const oficina` não encontrado em oficina.ts");
  const inicioEnd = fonte.indexOf("endereco:", inicioBloco);
  const fimEnd = inicioEnd < 0 ? -1 : fonte.indexOf("}", inicioEnd);
  if (inicioEnd < 0 || fimEnd < 0) throw new ErroDeMontagem("`endereco: { ... }` não encontrado no bloco `export const oficina`");

  let trecho = fonte.slice(inicioEnd, fimEnd);
  const antigos = {};
  for (const campo of Object.keys(SENTINELA)) {
    const re = new RegExp(`(\\b${campo}\\s*:\\s*)"([^"]*)"`);
    const m = trecho.match(re);
    if (!m) throw new ErroDeMontagem(`campo ${campo} (string literal com aspas duplas) não encontrado em endereco`);
    antigos[campo] = m[2];
    trecho = trecho.replace(re, `$1"${SENTINELA[campo]}"`);
  }
  return { mutada: fonte.slice(0, inicioEnd) + trecho + fonte.slice(fimEnd), antigos };
}

// --------------------------------------------------- agulhas do valor antigo

const semAcento = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Todas as grafias em que um trecho do endereço pode vazar para o dist. */
function variantes(s) {
  const formas = new Set();
  for (const base of [s, semAcento(s)]) {
    for (const esp of [" ", "\u00a0", "&nbsp;", "&#160;"]) {
      const t = base.replace(/ /g, esp);
      formas.add(t);
      formas.add(encodeURIComponent(t)); // %20 / %C2%A0 / %C3%A3
      formas.add(encodeURIComponent(t).replace(/%20/g, "+")); // URLSearchParams
      // Escape de string JS/JSON num bundle: "S\u00e3o Luiz", "S\xE3o Luiz"
      formas.add(t.replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`));
      formas.add(t.replace(/[\x80-\xff]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`));
    }
  }
  return [...formas].map((f) => f.toLowerCase());
}

/**
 * Trechos do valor antigo que não podem sobrar: o nome da rua (duas
 * primeiras palavras depois do tipo de logradouro, ex. "Pedro Apolo"), o
 * bairro inteiro e o prefixo de 5 dígitos do CEP (pega "93806-534" e
 * "93806534").
 */
function agulhas(antigos) {
  const palavras = antigos.logradouro
    .replace(/,.*$/, "")
    .replace(/^(rua|r\.|avenida|av\.|travessa|tv\.|estrada|rodovia|alameda)\s+/i, "")
    .split(/\s+/);
  // Começo e fim do nome da rua: "Pedro Apolo" e "Apolo dos Santos" ("dos
  // Santos" sozinho seria comum demais para ser agulha).
  const inicio = palavras.slice(0, 2).join(" ");
  const fim = palavras.length > 2 ? palavras.slice(-3).join(" ") : inicio;
  const cep5 = antigos.cep.replace(/\D/g, "").slice(0, 5);
  const lista = [...variantes(inicio), ...variantes(fim), ...variantes(antigos.bairro)];
  if (cep5.length === 5) lista.push(cep5);
  return [...new Set(lista)];
}

function* arquivos(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* arquivos(p);
    else if (e.isFile()) yield p;
  }
}

// -------------------------------------------------------------- index.html

const desescapar = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

function decodificarUrl(u) {
  try {
    return decodeURIComponent(desescapar(u).replace(/\+/g, " "));
  } catch {
    return desescapar(u);
  }
}

/** Elemento que abre em `abertura` até o fechamento correspondente (sem aninhamento da mesma tag). */
function recorte(html, abertura, tag) {
  const i = html.search(abertura);
  if (i < 0) return null;
  const f = html.indexOf(`</${tag}>`, i);
  return f < 0 ? null : html.slice(i, f);
}

/** Texto que a pessoa lê: sem tags, atributos (title, href, aria-*) nem <script>/<style>. */
const textoVisivel = (h) =>
  h == null
    ? null
    : desescapar(h.replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ").replace(/<[^>]*>/g, " ")).replace(/&nbsp;|&#160;|\u00a0/g, " ");

function sondasDoIndex(html) {
  const falhas = [];
  const todas = Object.values(SENTINELA);
  const faltam = (texto, quais = todas) => quais.filter((s) => !texto.includes(s));
  const exigir = (nome, texto, quais = todas) => {
    if (texto == null) return falhas.push(`${nome}: não encontrado em dist/index.html`);
    const f = faltam(texto, quais);
    if (f.length) falhas.push(`${nome}: sem a sentinela ${f.join(", ")}`);
  };

  // JSON-LD
  const blocos = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  if (blocos.length === 0) falhas.push("JSON-LD: nenhum <script type=\"application/ld+json\">");
  else {
    const enderecos = [];
    for (const [, corpo] of blocos) {
      try {
        const d = JSON.parse(corpo);
        for (const n of [d, ...(Array.isArray(d["@graph"]) ? d["@graph"] : [])]) if (n?.address) enderecos.push(n.address);
      } catch (e) {
        falhas.push(`JSON-LD: não é JSON válido (${e.message})`);
      }
    }
    if (enderecos.length === 0) falhas.push("JSON-LD: sem address");
    for (const a of enderecos) {
      if (a.streetAddress !== SENTINELA.logradouro)
        falhas.push(`JSON-LD: streetAddress é ${JSON.stringify(a.streetAddress)}, esperado a sentinela`);
      if (a.postalCode !== SENTINELA.cep)
        falhas.push(`JSON-LD: postalCode é ${JSON.stringify(a.postalCode)}, esperado a sentinela`);
    }
  }

  // Rodapé: o <address> dentro do <footer>
  const rodape = recorte(html, /<footer\b/, "footer");
  exigir("rodapé <address> (texto)", textoVisivel(rodape == null ? null : recorte(rodape, /<address\b/, "address")));

  // Seção #localizacao: no texto lido, não só nos atributos do mapa e dos links
  const localizacao = recorte(html, /<section\b[^>]*\bid="localizacao"/, "section");
  exigir("seção #localizacao (texto)", textoVisivel(localizacao));

  // Mapa, Como chegar, Waze: o endereço inteiro (as três sentinelas) na URL
  const iframes = [...html.matchAll(/<iframe\b[^>]*\bsrc="([^"]*)"/g)].map((m) => m[1]);
  const mapa = iframes.find((s) => /google\.[^/]+\/maps/.test(s));
  exigir("src do iframe do mapa", mapa == null ? null : decodificarUrl(mapa));

  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1]);
  const comoChegar = hrefs.filter((h) => h.includes("google.com/maps/search"));
  const waze = hrefs.filter((h) => h.includes("waze.com/ul"));
  if (comoChegar.length === 0) falhas.push('link "Como chegar": nenhum href com google.com/maps/search');
  for (const h of comoChegar) exigir('link "Como chegar"', decodificarUrl(h));
  if (waze.length === 0) falhas.push("link do Waze: nenhum href com waze.com/ul");
  for (const h of waze) exigir("link do Waze", decodificarUrl(h));

  return falhas;
}

// ------------------------------------------------------------------- build

let filho = null;

function build(rotulo) {
  rmSync(DIST, { recursive: true, force: true });
  return new Promise((ok, erro) => {
    const saida = [];
    // detached: grupo de processo próprio, para o sinal matar npm e astro juntos.
    const p = spawn("npm", ["run", "build"], { cwd: RAIZ, stdio: ["ignore", "pipe", "pipe"], detached: true });
    filho = p;
    p.stdout.on("data", (d) => saida.push(d));
    p.stderr.on("data", (d) => saida.push(d));
    p.on("error", erro);
    p.on("close", (codigo) => {
      filho = null;
      if (codigo === 0) return ok();
      const cauda = Buffer.concat(saida).toString("utf8").split("\n").slice(-25).join("\n");
      erro(new ErroDeMontagem(`build ${rotulo} saiu ${codigo}:\n${cauda}`));
    });
  });
}

// -------------------------------------------------------------------- main

let original;
try {
  original = readFileSync(OFICINA_TS);
} catch (e) {
  console.error(`MONTAGEM: não li ${OFICINA_TS}: ${e.message}`);
  process.exit(2);
}
if (Object.values(SENTINELA).some((s) => original.includes(s))) {
  const copias = readdirSync(tmpdir())
    .filter((n) => /^oficina\.ts\.mutacao-endereco\.\d+\.bak$/.test(n))
    .map((n) => join(tmpdir(), n));
  console.error(
    `MONTAGEM: ${OFICINA_TS} já contém uma sentinela (execução anterior interrompida?). Restaure antes` +
      (copias.length ? `; cópia(s) do original: ${copias.join(", ")}` : "; nenhuma cópia em " + tmpdir()) +
      ".",
  );
  process.exit(2);
}

// Cópia de segurança fora de src/, para o caso de o processo morrer à força.
const copia = join(tmpdir(), `oficina.ts.mutacao-endereco.${process.pid}.bak`);
copyFileSync(OFICINA_TS, copia);

let restaurado = false;
const restaurar = () => {
  if (restaurado) return;
  try {
    writeFileSync(OFICINA_TS, original);
    restaurado = readFileSync(OFICINA_TS).equals(original);
  } catch (e) {
    console.error(`erro ao restaurar oficina.ts: ${e.message}`);
  }
};
for (const sinal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sinal, () => {
    if (filho) {
      try {
        process.kill(-filho.pid, "SIGKILL");
      } catch {}
    }
    restaurar();
    if (restaurado) {
      rmSync(copia, { force: true });
      console.error(`\ninterrompido por ${sinal}; oficina.ts restaurado (dist/ pode estar com a sentinela: rode npm run build).`);
    } else {
      console.error(`\ninterrompido por ${sinal}; RESTAURAÇÃO FALHOU: oficina.ts difere do original. Cópia em ${copia}`);
    }
    process.exit(130);
  });
}

let codigo = 0;
try {
  const { mutada, antigos } = mutar(original.toString("utf8"));
  writeFileSync(OFICINA_TS, mutada);
  console.log(`mutado: ${Object.entries(antigos).map(([k, v]) => `${k} ${JSON.stringify(v)}`).join(", ")} → sentinelas`);

  await build("com sentinelas");

  const falhas = [];
  const lista = agulhas(antigos);
  for (const arq of arquivos(DIST)) {
    const cru = readFileSync(arq, "utf8").toLowerCase();
    // Também sem tags e com todo espaço em branco (quebra, tab, &nbsp;,
    // &#xa0;, vários espaços) virando um só: pega "São\n   Luiz" e
    // "São <span>Luiz</span>".
    const normal = cru
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|&#160;|&#xa0;|\u00a0/g, " ")
      .replace(/\s+/g, " ");
    const achadas = lista.filter((a) => cru.includes(a) || normal.includes(a));
    if (achadas.length) falhas.push(`valor antigo em dist/${relative(DIST, arq)}: ${achadas.map((a) => JSON.stringify(a)).join(", ")}`);
  }
  let html;
  try {
    html = readFileSync(INDEX, "utf8");
  } catch {
    throw new ErroDeMontagem("build com sentinelas não gerou dist/index.html");
  }
  falhas.push(...sondasDoIndex(html));

  if (falhas.length) {
    codigo = 1;
    console.log(`FALHOU (${falhas.length}):`);
    for (const f of falhas) console.log(`  - ${f}`);
  } else {
    console.log("PASSOU: nenhum valor antigo em dist/; sentinela no JSON-LD, rodapé, #localizacao, mapa, Como chegar e Waze.");
  }
} catch (e) {
  codigo = 2;
  console.error(`MONTAGEM: ${e instanceof ErroDeMontagem ? e.message : e.stack}`);
} finally {
  restaurar();
  if (!restaurado) {
    console.error(`RESTAURAÇÃO FALHOU: oficina.ts difere do original. Cópia em ${copia}`);
    codigo = 2;
  } else {
    rmSync(copia, { force: true });
    console.log("oficina.ts restaurado (bytes idênticos).");
    try {
      await build("de restauração");
      console.log("build de restauração ok.");
    } catch (e) {
      console.error(`MONTAGEM: ${e.message}`);
      codigo = 2;
    }
  }
}
process.exit(codigo);
