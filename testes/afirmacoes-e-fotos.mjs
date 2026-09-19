#!/usr/bin/env node
// Prova de três comportamentos de src/data (fonte única de afirmações e
// manifesto de fotos):
//
//   1. AFIRMAÇÕES NA PÁGINA — troca o `texto` de afirmacoes.
//      orcamentoEntaoServico, orcamentoVoceDecide, orcamentoVemAntes,
//      diagnosticoQuandoNaoObvio e orcamentoAprovado por sentinelas, refaz o
//      build e exige que cada sentinela esteja em dist/index.html e que o
//      trecho próprio do texto antigo (o que passos/FAQ não repetem) tenha
//      sumido. Antes, um build sem mutação prova que esses trechos aparecem
//      (senão "sumiu" seria verde por construção).
//   2. FONTES — todo item de `afirmacoes` tem fonte em
//      {cliente, receita, cdc-art-40, google} e há ao menos uma "receita". Lido em
//      tempo de execução: o build do Astro não roda o typecheck, então o
//      `satisfies` do TypeScript sozinho não barra uma fonte inválida.
//   3. FOTOS SEM LICENÇA — para CADA entrada de src/data/fotos.ts, com
//      `licenca: ""` e depois com `conferidaEm: ""`, o build tem que sair
//      ≠ 0 com a mensagem de foto() para aquele slot (sair ≠ 0 por outro
//      motivo não conta).
//
// Concorrência: outro agente pode rodar builds nesta mesma árvore. Por isso
// NADA é mutado no projeto: a prova roda numa cópia em tmpdir (src, public,
// configs; node_modules com um symlink por pacote, sem .astro/.vite, para o
// cache também ser privado) e a cópia é apagada ao fim. Dentro da cópia,
// oficina.ts/fotos.ts são restaurados byte a byte após cada mutação, mesmo
// em falha; e no projeto real o teste confere que os dois arquivos não
// mudaram durante a execução.
//
// Uso: node testes/afirmacoes-e-fotos.mjs [raiz-do-projeto]
//   Sai 0 se passou, 1 se algum comportamento falhou, 2 se não conseguiu
//   montar a prova (arquivo/campo ausente, build de referência quebrado,
//   restauração falhou). Só Node 22+: nenhuma dependência.

import { spawn } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
const REL_OFICINA = "src/data/oficina.ts";
const REL_FOTOS = "src/data/fotos.ts";

// Afirmação → trecho que só ela põe na página (passos e FAQ repetem o resto:
// "Você recebe o orçamento e decide", "antes de qualquer serviço ser
// executado", "O serviço só começa com a sua aprovação").
const AFIRMACOES = {
  orcamentoEntaoServico: "só então o serviço começa",
  orcamentoVoceDecide: "Antes de qualquer serviço, você recebe",
  orcamentoVemAntes: "O orçamento vem antes",
  diagnosticoQuandoNaoObvio: "é avaliado antes de qualquer serviço",
  orcamentoAprovado: "conhece e aprova o orçamento",
};
// Uma palavra ASCII por campo: igual cru, em HTML e em JSON.
const sentinela = (chave) => `SentinelaAfirm${chave[0].toUpperCase()}${chave.slice(1)}Zk4`;
const FONTES = new Set(["cliente", "receita", "cdc-art-40", "google"]); // "google": P4, decisão do dono (4); conteúdo provado em testes/prova-social.mjs

class ErroDeMontagem extends Error {}

// ------------------------------------------------------------- sandbox

let SANDBOX = null;

function montarSandbox() {
  // Guardado já: se a cópia falhar no meio, o finally ainda apaga.
  const dir = (SANDBOX = mkdtempSync(join(tmpdir(), "afirmacoes-e-fotos-")));
  for (const e of readdirSync(RAIZ)) {
    if (e === "node_modules" || e === "dist" || e === ".git") continue;
    cpSync(join(RAIZ, e), join(dir, e), { recursive: true });
  }
  mkdirSync(join(dir, "node_modules"));
  let pacotes;
  try {
    pacotes = readdirSync(join(RAIZ, "node_modules"));
  } catch {
    throw new ErroDeMontagem(`${join(RAIZ, "node_modules")} ausente: rode npm install antes`);
  }
  for (const e of pacotes) {
    if (e === ".astro" || e === ".vite") continue; // caches: ficam privados da cópia
    symlinkSync(join(RAIZ, "node_modules", e), join(dir, "node_modules", e));
  }
  return dir;
}

const apagarSandbox = () => {
  if (SANDBOX) rmSync(SANDBOX, { recursive: true, force: true });
  SANDBOX = null;
};

// --------------------------------------------------------------- build

let filho = null;

/** Roda `npm run build` na cópia. Devolve { codigo, saida }; não lança por código ≠ 0. */
function build() {
  rmSync(join(SANDBOX, "dist"), { recursive: true, force: true });
  return new Promise((ok, erro) => {
    const saida = [];
    const p = spawn("npm", ["run", "build"], { cwd: SANDBOX, stdio: ["ignore", "pipe", "pipe"], detached: true });
    filho = p;
    p.stdout.on("data", (d) => saida.push(d));
    p.stderr.on("data", (d) => saida.push(d));
    p.on("error", erro);
    p.on("close", (codigo) => {
      filho = null;
      ok({ codigo, saida: Buffer.concat(saida).toString("utf8") });
    });
  });
}

const cauda = (s, n = 20) => s.split("\n").slice(-n).join("\n");

async function buildQuePassa(rotulo) {
  const r = await build();
  if (r.codigo !== 0) throw new ErroDeMontagem(`build ${rotulo} saiu ${r.codigo}:\n${cauda(r.saida)}`);
  try {
    return readFileSync(join(SANDBOX, "dist/index.html"), "utf8");
  } catch {
    throw new ErroDeMontagem(`build ${rotulo} não gerou dist/index.html`);
  }
}

// ------------------------------------------- mutação com restauração

/** Aplica `mutar` ao arquivo da cópia, roda `corpo` e restaura byte a byte, mesmo em falha. */
async function comMutacao(rel, mutar, corpo) {
  const caminho = join(SANDBOX, rel);
  const original = readFileSync(caminho);
  try {
    writeFileSync(caminho, mutar(original.toString("utf8")));
    return await corpo();
  } finally {
    writeFileSync(caminho, original);
    if (!readFileSync(caminho).equals(original)) throw new ErroDeMontagem(`restauração de ${rel} na cópia falhou`);
  }
}

// ------------------------------------------------------------ parte 1

/** Texto da página comparável: sem tags, entidades comuns decodificadas, espaços colapsados. */
function normalizar(html) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;| /gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}
const naPagina = (html, agulha) => html.includes(agulha) || normalizar(html).includes(agulha);

/** Troca `texto: "..."` de cada chave de AFIRMACOES dentro de `export const afirmacoes`. */
function mutarAfirmacoes(fonte) {
  const inicio = fonte.indexOf("export const afirmacoes");
  if (inicio < 0) throw new ErroDeMontagem("`export const afirmacoes` não encontrado em oficina.ts");
  let antes = fonte.slice(0, inicio);
  let bloco = fonte.slice(inicio);
  for (const [chave, trecho] of Object.entries(AFIRMACOES)) {
    const re = new RegExp(`(\\b${chave}\\s*:\\s*\\{\\s*texto\\s*:\\s*)"([^"]*)"`);
    const m = bloco.match(re);
    if (!m) throw new ErroDeMontagem(`afirmacoes.${chave}: \`texto: "..."\` (aspas duplas) não encontrado`);
    // Se o texto mudou, o trecho vigiado perde o sentido: avisar, não passar calado.
    if (!m[2].includes(trecho))
      throw new ErroDeMontagem(`afirmacoes.${chave}.texto (${JSON.stringify(m[2])}) não contém mais o trecho vigiado ${JSON.stringify(trecho)}; atualize AFIRMACOES`);
    bloco = bloco.replace(re, `$1"${sentinela(chave)}"`);
  }
  return antes + bloco;
}

async function parte1() {
  const falhas = [];
  // Referência: sem mutação, os trechos estão lá e as sentinelas não.
  const ref = await buildQuePassa("de referência");
  for (const [chave, trecho] of Object.entries(AFIRMACOES)) {
    if (!naPagina(ref, trecho))
      throw new ErroDeMontagem(`referência: ${JSON.stringify(trecho)} (afirmacoes.${chave}) não está em dist/index.html sem mutação; a prova não distinguiria nada`);
    if (ref.includes(sentinela(chave))) throw new ErroDeMontagem(`referência já contém ${sentinela(chave)}`);
  }

  await comMutacao(REL_OFICINA, mutarAfirmacoes, async () => {
    const html = await buildQuePassa("com sentinelas");
    for (const [chave, trecho] of Object.entries(AFIRMACOES)) {
      if (!html.includes(sentinela(chave))) falhas.push(`afirmacoes.${chave}: sentinela ausente de dist/index.html`);
      if (naPagina(html, trecho))
        falhas.push(`afirmacoes.${chave}: texto antigo ${JSON.stringify(trecho)} continua em dist/index.html (escrito à mão fora de oficina.ts?)`);
    }
  });
  return falhas;
}

// ------------------------------------------------------------ parte 2

/** Carrega `afirmacoes` do oficina.ts da cópia num Node filho com strip-types. */
function lerAfirmacoes() {
  const url = pathToFileURL(join(SANDBOX, REL_OFICINA)).href;
  const codigo = `const m = await import(${JSON.stringify(url)}); process.stdout.write(JSON.stringify(m.afirmacoes));`;
  return new Promise((ok, erro) => {
    const out = [];
    const err = [];
    const p = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", codigo], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    p.stdout.on("data", (d) => out.push(d));
    p.stderr.on("data", (d) => err.push(d));
    p.on("error", erro);
    p.on("close", (c) => {
      if (c !== 0) return erro(new ErroDeMontagem(`não carreguei ${REL_OFICINA} (exit ${c}):\n${cauda(Buffer.concat(err).toString())}`));
      try {
        ok(JSON.parse(Buffer.concat(out).toString()));
      } catch (e) {
        erro(new ErroDeMontagem(`afirmacoes não serializou: ${e.message}`));
      }
    });
  });
}

async function parte2() {
  const falhas = [];
  const afirmacoes = await lerAfirmacoes();
  if (afirmacoes == null || typeof afirmacoes !== "object") return ["`afirmacoes` não é exportado como objeto por oficina.ts"];
  const itens = Object.entries(afirmacoes);
  if (itens.length === 0) falhas.push("`afirmacoes` está vazio");
  for (const [chave, a] of itens) {
    if (!FONTES.has(a?.fonte)) falhas.push(`afirmacoes.${chave}: fonte ${JSON.stringify(a?.fonte)} fora de {${[...FONTES].join(", ")}}`);
  }
  if (!itens.some(([, a]) => a?.fonte === "receita")) falhas.push('nenhuma afirmação com fonte "receita"');
  return falhas;
}

// ------------------------------------------------------------ parte 3

/** Slots das entradas de `export const fotos`, na ordem do arquivo. */
function slotsDasFotos(fonte) {
  const inicio = fonte.indexOf("export const fotos");
  const fim = inicio < 0 ? -1 : fonte.indexOf("];", inicio);
  if (inicio < 0 || fim < 0) throw new ErroDeMontagem("`export const fotos = [ ... ];` não encontrado em fotos.ts");
  const slots = [...fonte.slice(inicio, fim).matchAll(/\bslot\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  if (slots.length === 0) throw new ErroDeMontagem("nenhuma entrada com `slot` em fotos.ts");
  return slots;
}

/** Zera `campo` só na entrada do `slot` (do `slot:` dela até o próximo `slot:` ou `];`). */
function zerarCampo(fonte, slot, campo) {
  const inicio = fonte.indexOf("export const fotos");
  const fimLista = fonte.indexOf("];", inicio);
  const ini = fonte.indexOf(`slot: "${slot}"`, inicio);
  if (ini < 0 || ini > fimLista) throw new ErroDeMontagem(`entrada slot "${slot}" não encontrada`);
  const prox = fonte.indexOf("slot:", ini + 1);
  const fim = prox >= 0 && prox < fimLista ? prox : fimLista;
  const re = new RegExp(`(\\b${campo}\\s*:\\s*)"[^"]*"`);
  const trecho = fonte.slice(ini, fim);
  if (!re.test(trecho)) throw new ErroDeMontagem(`entrada slot "${slot}": \`${campo}: "..."\` não encontrado`);
  return fonte.slice(0, ini) + trecho.replace(re, '$1""') + fonte.slice(fim);
}

async function parte3() {
  const falhas = [];
  const slots = slotsDasFotos(readFileSync(join(SANDBOX, REL_FOTOS), "utf8"));
  for (const slot of slots) {
    for (const campo of ["licenca", "conferidaEm"]) {
      await comMutacao(REL_FOTOS, (f) => zerarCampo(f, slot, campo), async () => {
        const r = await build();
        const motivo = `slot "${slot}" sem licença literal ou sem data de conferência`;
        if (r.codigo === 0) falhas.push(`fotos ${slot}.${campo} = "": build passou (exit 0)`);
        else if (!r.saida.includes(motivo))
          falhas.push(`fotos ${slot}.${campo} = "": build saiu ${r.codigo}, mas não pela licença (sem "${motivo}"):\n${cauda(r.saida, 8)}`);
        else console.log(`  ok: ${slot}.${campo} = "" → build saiu ${r.codigo} (${motivo})`);
      });
    }
  }
  return falhas;
}

// ---------------------------------------------------------------- main

for (const sinal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sinal, () => {
    if (filho) {
      try {
        process.kill(-filho.pid, "SIGKILL");
      } catch {}
    }
    apagarSandbox();
    console.error(`\ninterrompido por ${sinal}; cópia apagada (o projeto não foi mutado).`);
    process.exit(130);
  });
}

let originais;
try {
  originais = [REL_OFICINA, REL_FOTOS].map((rel) => [rel, readFileSync(join(RAIZ, rel))]);
} catch (e) {
  console.error(`MONTAGEM: ${e.message}`);
  process.exit(2);
}

let codigo = 0;
try {
  const [maior, menor] = process.versions.node.split(".").map(Number);
  if (maior < 22 || (maior === 22 && menor < 6))
    throw new ErroDeMontagem(`Node ${process.versions.node}: precisa de 22.6+ (strip-types; o projeto pede 22.12)`);
  montarSandbox();
  console.log(`cópia do projeto em ${SANDBOX}`);
  for (const [nome, parte] of [
    ["1 afirmações na página", parte1],
    ["2 fontes das afirmações", parte2],
    ["3 build barra foto sem licença/data", parte3],
  ]) {
    console.log(`parte ${nome}...`);
    const falhas = await parte();
    if (falhas.length) {
      codigo = 1;
      console.log(`FALHOU parte ${nome} (${falhas.length}):`);
      for (const f of falhas) console.log(`  - ${f}`);
    } else console.log(`PASSOU parte ${nome}.`);
  }
} catch (e) {
  codigo = 2;
  console.error(`MONTAGEM: ${e instanceof ErroDeMontagem ? e.message : e.stack}`);
} finally {
  apagarSandbox();
  for (const [rel, bytes] of originais) {
    let igual = false;
    try {
      igual = readFileSync(join(RAIZ, rel)).equals(bytes);
    } catch {}
    if (!igual) {
      // Este teste não escreve no projeto; se mudou, foi outra mão durante a execução.
      console.error(`AVISO: ${rel} do projeto mudou durante a execução (não por este teste); o resultado vale para a versão lida no início.`);
    }
  }
}
process.exit(codigo);
