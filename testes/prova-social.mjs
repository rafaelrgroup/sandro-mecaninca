#!/usr/bin/env node
// Prova da PROVA SOCIAL do Google (P4, fatia PS1; decisão do dono (4) em
// FATIAS-P4.md; ERRATA E1 em DESENHO-APROVADO.md#L78-80, #L92-95, #L110-111
// e PLANO-TESTES.md#L10-11). Escrito ANTES do componente: hoje sai 1.
//
// CONTRATO que PS2 (oficina.ts) e PS3 (ui/ProvaSocial.astro + Sobre) seguem:
//   - src/data/oficina.ts: `FonteAfirmacao` ganha "google"; `interface
//     Afirmacao` ganha `conferidaEm?: string` (data ISO AAAA-MM-DD, o mesmo
//     nome de fotos.ts). Em `afirmacoes` entram EXATAMENTE três itens com
//     `fonte: "google"`, cada um com `conferidaEm: "2026-09-19"` e `texto`
//     em aspas duplas, igual byte a byte a perfil-google/ficha/ficha.json:
//       os três trechos  (#L37-41, grafia do Google: "Ja trabalho a anos
//                         com o Sandro,ótimo profissional e preços justos.")
//     Nota ("4,6") e total ("45 avaliações") ficam FORA da lista e da
//     página inteira, por decisão do dono (2026-09-19).
//     A chave de cada item é livre. Nenhum outro item repete esses textos.
//   - oficina.linkGoogle = LINK_GOOGLE (abaixo): place_id, sem
//     google.com/maps/search e sem endereço (testes/mutacao-endereco.mjs
//     #L192-195 trata todo href com maps/search como "Como chegar" e
//     #L286-299 varre o dist atrás do endereço antigo).
//   - Na página, UM elemento `[data-prova-social]` que só existe quando há
//     item "google" na lista E linkGoogle preenchido. Dentro dele: os três
//     textos lidos da lista (nada à mão), a data de conferência VISÍVEL
//     (19/09/2026, 19.09.2026, 19 de setembro de 2026 ou 2026-09-19) e a
//     atribuição como LINK DE TEXTO (não Botao) para linkGoogle, com
//     "Google" no texto. Além disso, só palavras de ROTULOS (abaixo).
//   - O único Botao para linkGoogle é o "Ver no Google" de
//     Localizacao.astro#L80-86. JSON-LD: sameAs = [linkGoogle], sem review,
//     aggregateRating nem rating em nível nenhum (jsonld.ts#L57-59 já faz).
//
// O que se prova (numa cópia; o projeto não é mutado):
//   a LITERAL: itens "google" = os 5 textos de ficha.json, com a data;
//     contrato de tipos e de linkGoogle; nenhum trecho sob outra fonte.
//   b SENTINELA: trocar os 5 textos na lista troca o dist (sentinelas dentro
//     do componente e só nele; textos antigos fora da página); nenhum
//     arquivo de src além de oficina.ts escreve os trechos; lista sem os
//     itens "google" → sem componente; linkGoogle "" → sem componente.
//   c SEÇÃO FECHADA: no componente, tirados os textos da lista e a data,
//     sobram só ROTULOS e há "Google"; autores e trechos das avaliações de
//     ficha.json#L52-74 fora do dist inteiro; proibidos do desenho fora do
//     dist inteiro; nada de estrela (★, "estrela", ícone *star*).
//   d 4,6 e 45 em lugar NENHUM; "avaliações" e a data SÓ no componente.
//   e JSON-LD: sem review/aggregateRating/rating e sameAs = [linkGoogle].
//   f UM Botao para o Google, dentro de #localizacao; no componente, link
//     de texto para o MESMO linkGoogle; nenhum outro link para ele.
//   g data de conferência visível no componente.
//   h [data-hodometro] 1 vez, fora do componente (scripts/hodometro.ts
//     pega o primeiro do documento).
//
// Uso: node testes/prova-social.mjs [raiz-do-projeto] [--ficha caminho]
//   ficha padrão: <raiz>/../perfil-google/ficha/ficha.json, depois a do
//   lado deste arquivo (../../perfil-google/...).
//   Sai 0 se passou, 1 se algum comportamento falhou, 2 se não conseguiu
//   montar a prova (Node, cópia, ficha divergente, build de referência
//   quebrado, restauração). Só Node 22.6+: nenhuma dependência.

import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ------------------------------------------------------------ contrato

const LINK_GOOGLE = "https://www.google.com/maps/place/?q=place_id:ChIJYbFoyA8_GZURSSrKItDfN44";
const DATA_CONFERENCIA = "2026-09-19";
// Nota e total FORA da página por decisão do dono (2026-09-19): só os
// trechos positivos entram em afirmacoes e no componente. As constantes
// ficam para as provas de ausência (parte d).
const NOTA = "4,6";
const TOTAL = "45 avaliações";
const TRECHOS = [
  "Ja trabalho a anos com o Sandro,ótimo profissional e preços justos.",
  "Ótimo atendimento, rápidos, precisos, honestos e bom preço de Mão de Obra.",
  "Muito bom o serviço feito no meu carro estão de parabéns.",
];
const TEXTOS_GOOGLE = [...TRECHOS];
// Formas visíveis aceitas da data (g) e procuradas fora do componente (d).
const DATA_VISIVEL = /\b19\/09\/2026\b|\b19\.09\.2026\b|\b19 de setembro de 2026\b|\b2026-09-19\b/i;
const DATA_QUALQUER = /19\/09\/2026|19\.09\.2026|19 de setembro de 2026|2026-09-19|setembro de 2026/i;
// Palavras que podem sobrar no componente além dos textos da lista e da
// data. Mudar esta lista é decisão de quem planeja, não de quem implementa.
const ROTULOS = new Set(
  (
    "google maps no na do da de em e o a os as com pelo pela segundo nota média avaliações avaliação " +
    "trechos trecho resumo das dos conferido conferida conferidos conferidas conferência " +
    "ver veja abrir perfil fonte sobre oficina sandro mecânica"
  ).split(" "),
);
// Trechos parafraseados que não podem existir em src fora de oficina.ts.
const FRAGMENTOS = ["trabalho a anos", "trabalho há anos", "rápidos, precisos", "estão de parabéns", "preço de mão de obra", TOTAL];
// Proibidos do desenho em TODO o dist (DESENHO#L76, #L78-80, #L92-95).
const PROIBIDOS = [
  [/[★☆⭐✩✪✫✬✭✮✯✰]/u, "caractere de estrela"],
  [/(?<![\p{L}])estrelas?(?![\p{L}])/iu, "estrela"],
  [/(?<![\p{L}])depoimentos?(?![\p{L}])/iu, "depoimento"],
  [/clientes atendidos/i, "clientes atendidos"],
  [/aggregaterating/i, "aggregateRating"],
  [/ratingvalue/i, "ratingValue"],
  [/(?<![\p{L}])reviews?(?![\p{L}])/iu, "review"],
];
const CHAVES_RATING = /^(review|reviews|aggregaterating|rating|ratingvalue|reviewcount|ratingcount|bestrating|worstrating)$/i;
const TIPOS_RATING = /^(review|aggregaterating|rating)$/i;

// ------------------------------------------------------------- argumentos

const args = process.argv.slice(2);
const iFicha = args.indexOf("--ficha");
const fichaArg = iFicha >= 0 ? args.splice(iFicha, 2)[1] : null;
const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(args[0] ?? join(AQUI, ".."));
const REL_OFICINA = "src/data/oficina.ts";
const REL_BOTAO = "src/components/ui/Botao.astro";

class ErroDeMontagem extends Error {}

// ------------------------------------------------------------- sandbox

let SANDBOX = null;

function montarSandbox() {
  const dir = (SANDBOX = mkdtempSync(join(tmpdir(), "prova-social-")));
  for (const e of readdirSync(RAIZ)) {
    if (e === "node_modules" || e === "dist" || e === ".git" || e === ".astro") continue;
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
    if (e === ".astro" || e === ".vite") continue;
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
const lerIndex = () => readFileSync(join(SANDBOX, "dist/index.html"), "utf8");

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

// ---------------------------------------------------------------- HTML

const VAZIOS = new Set("area base br col embed hr img input link meta source track wbr".split(" "));

function decodificar(s) {
  return s
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** HTML sem comentários, <style> e <script> que não seja JSON-LD. */
function semCodigo(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b(?![^>]*application\/ld\+json)[\s\S]*?<\/script>/gi, "");
}

/** Texto visível: sem tags nem código, entidades decodificadas, espaços colapsados. */
const textoDe = (html) =>
  decodificar(semCodigo(html).replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

/** Texto + atributos que o usuário ou um robô leem (alt, title, aria-label, content) + JSON-LD. */
function lidoDe(html) {
  const limpo = semCodigo(html);
  const attrs = [...limpo.matchAll(/\s(?:alt|title|aria-label|content|placeholder)="([^"]*)"/gi)].map((m) => decodificar(m[1]));
  const ld = [...limpo.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  return [textoDe(html), ...attrs, ...ld].join("   ");
}

/** [inicio, fim) de cada elemento cuja tag de abertura casa `reAbertura`. */
function elementos(html, reAbertura) {
  const achados = [];
  const re = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1>|<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  const pilha = [];
  let m;
  while ((m = re.exec(html))) {
    if (m[1] || m[0].startsWith("<!--")) continue;
    const [bruto, , fecha, nome, resto] = m;
    const tag = nome.toLowerCase();
    if (fecha) {
      for (let i = pilha.length - 1; i >= 0; i--) {
        if (pilha[i].tag === tag) {
          const [e] = pilha.splice(i);
          if (e.alvo) achados.push([e.ini, m.index + bruto.length]);
          break;
        }
      }
    } else if (VAZIOS.has(tag) || resto.trim().endsWith("/")) {
      if (reAbertura.test(bruto)) achados.push([m.index, m.index + bruto.length]);
    } else pilha.push({ tag, ini: m.index, alvo: reAbertura.test(bruto) });
  }
  return achados.sort((x, y) => x[0] - y[0]);
}

const RE_PS = /^<[^>]*\sdata-prova-social(?=[\s=>/])/;
const RE_LOCALIZACAO = /^<[^>]*\sid="localizacao"/;

function recortes(html) {
  const ps = elementos(html, RE_PS);
  const bloco = ps.length ? html.slice(ps[0][0], ps[0][1]) : null;
  const fora = ps.length ? html.slice(0, ps[0][0]) + html.slice(ps[0][1]) : html;
  return { ps, bloco, fora };
}

/** Âncoras: { href, classes, texto, ini }. */
const ancoras = (html) =>
  [...html.matchAll(/<a\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/a>/gi)].map((m) => ({
    href: decodificar((m[1].match(/\shref="([^"]*)"/) ?? [])[1] ?? ""),
    classes: new Set(((m[1].match(/\sclass="([^"]*)"/) ?? [])[1] ?? "").split(/\s+/).filter(Boolean)),
    texto: textoDe(m[2]),
    ini: m.index,
  }));

const dentro = (pos, faixas) => faixas.some(([a, b]) => pos >= a && pos < b);

// -------------------------------------------------------------- leitura

function acharFicha() {
  const candidatos = fichaArg ? [resolve(fichaArg)] : [join(RAIZ, "../perfil-google/ficha/ficha.json"), join(AQUI, "../../perfil-google/ficha/ficha.json")];
  const achado = candidatos.find((c) => existsSync(c));
  if (!achado) throw new ErroDeMontagem(`ficha.json não encontrada em ${candidatos.join(", ")} (use --ficha)`);
  const ficha = JSON.parse(readFileSync(achado, "utf8"));
  // Nota e total da ficha só conferem as constantes (provas de ausência);
  // na lista e no componente entram apenas os trechos.
  if (ficha.nota !== NOTA || ficha.total_avaliacoes !== TOTAL)
    throw new ErroDeMontagem(`ficha.json (${achado}): nota/total (${ficha.nota}, ${ficha.total_avaliacoes}) divergem das constantes deste teste`);
  const daFicha = [...(ficha.trechos_resumo_avaliacoes ?? [])];
  if (JSON.stringify(daFicha) !== JSON.stringify(TEXTOS_GOOGLE))
    throw new ErroDeMontagem(`ficha.json (${achado}) diverge das constantes deste teste: ${JSON.stringify(daFicha)}`);
  if (!String(ficha.capturado_em).startsWith(DATA_CONFERENCIA))
    throw new ErroDeMontagem(`ficha.json capturado_em ${ficha.capturado_em} não é ${DATA_CONFERENCIA}`);
  const avaliacoes = ficha.avaliacoes_exibidas_no_painel ?? [];
  if (avaliacoes.length === 0) throw new ErroDeMontagem("ficha.json sem avaliacoes_exibidas_no_painel");
  return { caminho: achado, avaliacoes };
}

/** Importa oficina.ts da cópia num Node filho com strip-types. */
function lerDados() {
  const url = pathToFileURL(join(SANDBOX, REL_OFICINA)).href;
  const codigo = `const m = await import(${JSON.stringify(url)}); process.stdout.write(JSON.stringify({ afirmacoes: m.afirmacoes, linkGoogle: m.oficina?.linkGoogle, endereco: m.oficina?.endereco }));`;
  return new Promise((ok, erro) => {
    const out = [];
    const err = [];
    const p = spawn(process.execPath, ["--experimental-strip-types", "--no-warnings", "--input-type=module", "-e", codigo], { stdio: ["ignore", "pipe", "pipe"] });
    p.stdout.on("data", (d) => out.push(d));
    p.stderr.on("data", (d) => err.push(d));
    p.on("error", erro);
    p.on("close", (c) => {
      if (c !== 0) return erro(new ErroDeMontagem(`não carreguei ${REL_OFICINA} (exit ${c}):\n${cauda(Buffer.concat(err).toString())}`));
      try {
        ok(JSON.parse(Buffer.concat(out).toString()));
      } catch (e) {
        erro(new ErroDeMontagem(`oficina.ts não serializou: ${e.message}`));
      }
    });
  });
}

/** Classes-base do Botao (a assinatura de um Botao no HTML). */
function classesDoBotao() {
  const fonte = readFileSync(join(SANDBOX, REL_BOTAO), "utf8");
  const m = fonte.match(/const classesBase\s*=\s*"([^"]+)"/);
  if (!m) throw new ErroDeMontagem(`${REL_BOTAO}: \`const classesBase = "..."\` não encontrado`);
  return m[1].split(/\s+/).filter(Boolean);
}

function* arquivosDe(dir) {
  for (const e of readdirSync(dir)) {
    const c = join(dir, e);
    if (statSync(c).isDirectory()) yield* arquivosDe(c);
    else yield c;
  }
}
const TEXTUAIS = new Set([".html", ".js", ".mjs", ".css", ".svg", ".json", ".xml", ".txt", ".webmanifest"]);

// ------------------------------------------------------------- parte a

async function parteA(dados) {
  const falhas = [];
  const fonte = readFileSync(join(SANDBOX, REL_OFICINA), "utf8");
  const uniao = fonte.match(/export type FonteAfirmacao\s*=([^;]*);/);
  if (!uniao || !/"google"/.test(uniao[1])) falhas.push('contrato: `FonteAfirmacao` não inclui "google"');
  const iface = fonte.match(/export interface Afirmacao\s*\{([^}]*)\}/);
  if (!iface || !/\bconferidaEm\??\s*:\s*string/.test(iface[1])) falhas.push("contrato: `interface Afirmacao` sem `conferidaEm?: string`");

  const itens = Object.entries(dados.afirmacoes ?? {});
  const google = itens.filter(([, a]) => a?.fonte === "google");
  const textos = google.map(([, a]) => a.texto);
  const faltam = TEXTOS_GOOGLE.filter((t) => !textos.includes(t));
  const sobram = google.filter(([, a]) => !TEXTOS_GOOGLE.includes(a.texto));
  if (google.length !== TEXTOS_GOOGLE.length)
    falhas.push(`literal: ${google.length} itens com fonte "google" em afirmacoes; o contrato pede ${TEXTOS_GOOGLE.length} (só os 3 trechos; nota e total fora, decisão do dono)`);
  for (const t of faltam) falhas.push(`literal: falta item "google" com texto byte a byte ${JSON.stringify(t)} (ficha.json)`);
  for (const [k, a] of sobram) falhas.push(`literal: afirmacoes.${k} (fonte "google") não está na ficha: ${JSON.stringify(a.texto)}`);
  for (const t of new Set(textos)) if (textos.filter((x) => x === t).length > 1) falhas.push(`literal: texto repetido em itens "google": ${JSON.stringify(t)}`);
  for (const [k, a] of google)
    if (a.conferidaEm !== DATA_CONFERENCIA) falhas.push(`literal: afirmacoes.${k}.conferidaEm = ${JSON.stringify(a.conferidaEm)}; esperado "${DATA_CONFERENCIA}"`);
  for (const [k, a] of itens) {
    if (a?.fonte === "google") continue;
    const t = String(a?.texto ?? "").toLowerCase();
    const achou = [...TEXTOS_GOOGLE, ...FRAGMENTOS].find((f) => t.includes(f.toLowerCase()));
    if (achou) falhas.push(`literal: afirmacoes.${k} (fonte ${JSON.stringify(a?.fonte)}) repete o Google (${JSON.stringify(achou)})`);
  }

  const link = dados.linkGoogle;
  if (link !== LINK_GOOGLE) falhas.push(`linkGoogle = ${JSON.stringify(link)}; o contrato pede ${JSON.stringify(LINK_GOOGLE)}`);
  if (typeof link === "string" && link) {
    if (link.includes("maps/search")) falhas.push("linkGoogle usa google.com/maps/search (mutacao-endereco o trataria como Como chegar)");
    const e = dados.endereco ?? {};
    const pedacos = [e.logradouro, e.cep, e.bairro, e.cidade].filter(Boolean);
    const cru = decodeURIComponent(link.replace(/\+/g, " ")).toLowerCase();
    for (const p of pedacos) if (cru.includes(String(p).toLowerCase())) falhas.push(`linkGoogle traz endereço (${JSON.stringify(p)})`);
  }
  return falhas;
}

// ---------------------------------------------- partes c-h (referência)

function parteReferencia(html, dist, ficha, tokensBotao) {
  const falhas = [];
  const { ps, bloco, fora } = recortes(html);

  // --- existência do componente
  if (ps.length === 0) falhas.push("componente: nenhum [data-prova-social] em dist/index.html");
  if (ps.length > 1) falhas.push(`componente: ${ps.length} elementos [data-prova-social]; o contrato pede 1`);
  const textoPs = bloco ? textoDe(bloco) : "";
  if (bloco) for (const t of TEXTOS_GOOGLE) if (!textoPs.includes(t)) falhas.push(`componente: texto da lista ausente de [data-prova-social]: ${JSON.stringify(t)}`);

  // --- c seção fechada
  if (bloco) {
    let resto = textoPs;
    for (const t of [...TEXTOS_GOOGLE].sort((x, y) => y.length - x.length)) resto = resto.split(t).join(" ");
    resto = resto.replace(new RegExp(DATA_VISIVEL.source, "gi"), " ");
    const palavras = resto.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
    const estranhas = [...new Set(palavras.filter((p) => !ROTULOS.has(p)))];
    if (estranhas.length) falhas.push(`seção fechada: no componente sobram palavras fora dos textos da lista e dos rótulos: ${JSON.stringify(estranhas)}`);
    if (!palavras.includes("google")) falhas.push('seção fechada: "Google" não aparece no componente (atribuição)');
    if (/(?<![a-z])star(?!t)/i.test(bloco)) falhas.push("seção fechada: ícone/classe de estrela (*star*) dentro do componente");
  }
  const vigiados = [];
  for (const a of ficha.avaliacoes) {
    vigiados.push([a.autor, `autor ${JSON.stringify(a.autor)}`]);
    for (const parte of String(a.autor).split(/\s+/)) if (parte.length >= 4) vigiados.push([parte, `parte do autor ${JSON.stringify(parte)}`]);
    vigiados.push([String(a.texto).slice(0, 40), `trecho da avaliação de ${a.autor}`]);
  }
  vigiados.push(["Local Guide", "perfil de autor"]);
  for (const arq of dist) {
    if (!TEXTUAIS.has(extname(arq))) continue;
    const cru = readFileSync(arq, "utf8");
    const legivel = extname(arq) === ".html" ? textoDe(cru) + " " + decodificar(cru) : cru;
    const rel = relative(join(SANDBOX, "dist"), arq);
    for (const [agulha, rotulo] of vigiados)
      if (new RegExp(`(?<![\\p{L}])${agulha.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "iu").test(legivel))
        falhas.push(`seção fechada: ${rotulo} em dist/${rel}`);
    for (const [re, rotulo] of PROIBIDOS) if (re.test(legivel)) falhas.push(`proibido do desenho em dist/${rel}: ${rotulo}`);
  }

  // --- d nota e total em lugar NENHUM (decisão do dono, 2026-09-19);
  //     "avaliações" e a data só no componente
  const lidoTudo = lidoDe(html);
  if (/(?<!\d)4,6(?!\d)/.test(lidoTudo)) falhas.push('nota "4,6" aparece na página (fora por decisão do dono)');
  if (/(?<![\d.,])45(?![\d])/.test(lidoTudo)) falhas.push('total "45" aparece na página (fora por decisão do dono)');
  const lidoFora = lidoDe(fora);
  if (/(?<![\p{L}])avaliações(?![\p{L}])/iu.test(lidoFora)) falhas.push('fora do componente: "avaliações" aparece');
  if (DATA_QUALQUER.test(lidoFora)) falhas.push("fora do componente: a data de conferência aparece");

  // --- e JSON-LD
  const lds = [...html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  if (lds.length === 0) falhas.push("JSON-LD: nenhum <script type=application/ld+json>");
  for (const [i, bruto] of lds.entries()) {
    let dado;
    try {
      dado = JSON.parse(bruto);
    } catch (e) {
      falhas.push(`JSON-LD ${i}: não é JSON (${e.message})`);
      continue;
    }
    const visitar = (v, caminho) => {
      if (Array.isArray(v)) return v.forEach((x, j) => visitar(x, `${caminho}[${j}]`));
      if (v && typeof v === "object")
        for (const [k, x] of Object.entries(v)) {
          if (CHAVES_RATING.test(k)) falhas.push(`JSON-LD: chave ${k} em ${caminho}`);
          if (k === "@type" && [x].flat().some((t) => TIPOS_RATING.test(String(t)))) falhas.push(`JSON-LD: @type ${JSON.stringify(x)} em ${caminho}`);
          visitar(x, `${caminho}.${k}`);
        }
    };
    visitar(dado, "$");
    if (i === 0 && JSON.stringify(dado?.sameAs) !== JSON.stringify([LINK_GOOGLE]))
      falhas.push(`JSON-LD: sameAs = ${JSON.stringify(dado?.sameAs)}; esperado [${JSON.stringify(LINK_GOOGLE)}]`);
  }

  // --- f um Botao do Google, link de texto no componente
  const loc = elementos(html, RE_LOCALIZACAO);
  const faixaPs = ps.slice(0, 1);
  const ehBotao = (a) => tokensBotao.every((t) => a.classes.has(t));
  const paraGoogle = ancoras(html).filter((a) => a.href === LINK_GOOGLE || /google\.[^/]+\/maps\/place|place_id/.test(a.href));
  for (const a of paraGoogle) if (a.href !== LINK_GOOGLE) falhas.push(`links: âncora para o perfil com href diferente de linkGoogle: ${JSON.stringify(a.href)}`);
  const botoes = paraGoogle.filter(ehBotao);
  if (botoes.length !== 1) falhas.push(`links: ${botoes.length} Botao(ões) para o Google; o contrato pede 1 (Localizacao "Ver no Google")`);
  for (const b of botoes) if (!dentro(b.ini, loc)) falhas.push("links: Botao para o Google fora de #localizacao");
  const noPs = paraGoogle.filter((a) => dentro(a.ini, faixaPs));
  if (bloco && noPs.length === 0) falhas.push("links: nenhum link para linkGoogle dentro de [data-prova-social] (atribuição)");
  for (const a of noPs) {
    if (ehBotao(a)) falhas.push("links: a atribuição do componente é um Botao; o contrato pede link de texto");
    if (!/google/i.test(a.texto)) falhas.push(`links: a atribuição do componente não diz "Google" (texto ${JSON.stringify(a.texto)})`);
  }
  const avulsos = paraGoogle.filter((a) => !ehBotao(a) && !dentro(a.ini, faixaPs));
  if (avulsos.length) falhas.push(`links: ${avulsos.length} link(s) para linkGoogle fora do componente e do Botao de #localizacao`);

  // --- g data visível no componente
  if (bloco && !DATA_VISIVEL.test(textoPs)) falhas.push(`data: nenhuma forma visível de ${DATA_CONFERENCIA} no texto de [data-prova-social]`);
  if (bloco && /\shidden(?=[\s=>])|\bsr-only\b|aria-hidden="true"/.test(bloco.slice(0, bloco.indexOf(">") + 1)))
    falhas.push("data: o componente está escondido (hidden/sr-only/aria-hidden)");

  // --- h hodômetro
  const hodometros = elementos(semCodigo(html), /^<[^>]*\sdata-hodometro(?=[\s=>/])/);
  if (hodometros.length !== 1) falhas.push(`hodômetro: [data-hodometro] aparece ${hodometros.length} vez(es); esperado 1`);
  if (bloco && /\sdata-hodometro(?=[\s=>/])/.test(bloco)) falhas.push("hodômetro: [data-hodometro] dentro do componente");

  return falhas;
}

// ------------------------------------------------------------- parte b

const sentinela = (i) => `SentinelaProvaSocial${i}Qx7`;

/** Troca, no bloco `afirmacoes`, o literal "texto" de cada item google. */
function mutarTextos(fonte) {
  const ini = fonte.indexOf("export const afirmacoes");
  if (ini < 0) throw new ErroDeMontagem("`export const afirmacoes` não encontrado em oficina.ts");
  let bloco = fonte.slice(ini);
  const ausentes = [];
  TEXTOS_GOOGLE.forEach((t, i) => {
    const re = new RegExp(`(\\btexto\\s*:\\s*)"${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`);
    if (!re.test(bloco)) ausentes.push(t);
    else bloco = bloco.replace(re, `$1"${sentinela(i)}"`);
  });
  return { mutada: fonte.slice(0, ini) + bloco, ausentes };
}

/** Remove de `afirmacoes` cada item cujo texto é um dos TEXTOS_GOOGLE (chave: { ... },). */
function tirarItensGoogle(fonte) {
  const ini = fonte.indexOf("export const afirmacoes");
  let bloco = fonte.slice(ini);
  let tirados = 0;
  for (const t of TEXTOS_GOOGLE) {
    const pos = bloco.indexOf(`"${t}"`);
    if (pos < 0) continue;
    let abre = pos;
    for (let prof = 0; abre >= 0; abre--) {
      if (bloco[abre] === "}") prof++;
      else if (bloco[abre] === "{") {
        if (prof === 0) break;
        prof--;
      }
    }
    let fecha = pos;
    for (let prof = 0; fecha < bloco.length; fecha++) {
      if (bloco[fecha] === "{") prof++;
      else if (bloco[fecha] === "}") {
        if (prof === 0) break;
        prof--;
      }
    }
    const chave = bloco.slice(0, abre).match(/[\w$"']+\s*:\s*$/);
    if (abre < 0 || fecha >= bloco.length || !chave) throw new ErroDeMontagem(`não achei o item de ${JSON.stringify(t)} para tirar`);
    let fim = fecha + 1;
    if (bloco[fim] === ",") fim++;
    bloco = bloco.slice(0, abre - chave[0].length) + bloco.slice(fim);
    tirados++;
  }
  return { mutada: fonte.slice(0, ini) + bloco, tirados };
}

async function parteB(refTemComponente) {
  const falhas = [];

  // b1 nada escrito à mão em src fora de oficina.ts
  for (const arq of arquivosDe(join(SANDBOX, "src"))) {
    if (relative(SANDBOX, arq) === REL_OFICINA || ![".astro", ".ts", ".tsx", ".js", ".mjs", ".md", ".mdx"].includes(extname(arq))) continue;
    const t = readFileSync(arq, "utf8").toLowerCase();
    for (const f of [...TRECHOS, ...FRAGMENTOS]) if (t.includes(f.toLowerCase())) falhas.push(`à mão: ${relative(SANDBOX, arq)} escreve ${JSON.stringify(f)}`);
  }

  // b2 trocar os textos na lista troca o dist
  const fonte = readFileSync(join(SANDBOX, REL_OFICINA), "utf8");
  const { ausentes } = mutarTextos(fonte);
  if (ausentes.length) {
    falhas.push(`sentinela: ${ausentes.length} de ${TEXTOS_GOOGLE.length} textos não estão em afirmacoes como \`texto: "..."\`; nada a trocar: ${JSON.stringify(ausentes)}`);
  } else {
    await comMutacao(REL_OFICINA, (f) => mutarTextos(f).mutada, async () => {
      const r = await build();
      if (r.codigo !== 0) return falhas.push(`sentinela: build com os textos trocados saiu ${r.codigo}:\n${cauda(r.saida, 8)}`);
      const html = lerIndex();
      const { bloco, fora } = recortes(html);
      const textoPs = bloco ? textoDe(bloco) : "";
      TEXTOS_GOOGLE.forEach((t, i) => {
        if (!textoPs.includes(sentinela(i))) falhas.push(`sentinela: ${sentinela(i)} (no lugar de ${JSON.stringify(t)}) ausente de [data-prova-social]`);
        if (fora.includes(sentinela(i))) falhas.push(`sentinela: ${sentinela(i)} aparece fora do componente (meta, JSON-LD ou outra seção)`);
        if (textoDe(html).includes(t)) falhas.push(`sentinela: ${JSON.stringify(t)} continua na página com a lista trocada (escrito à mão?)`);
      });
      const lido = lidoDe(html);
      if (/(?<!\d)4,6(?!\d)/.test(lido)) falhas.push('sentinela: "4,6" continua na página com a nota trocada');
      if (/(?<![\d.,])45(?![\d])/.test(lido)) falhas.push('sentinela: "45" continua na página com o total trocado');
    });
  }

  // b3 lista sem os itens google → nada renderiza
  // b4 linkGoogle "" → nada renderiza
  if (!refTemComponente) {
    falhas.push("vazio: a referência não tem [data-prova-social]; 'lista vazia não renderiza' seria verde por construção");
    return falhas;
  }
  const { tirados } = tirarItensGoogle(fonte);
  if (tirados === 0) falhas.push("vazio: nenhum item google para tirar da lista");
  else
    await comMutacao(REL_OFICINA, (f) => tirarItensGoogle(f).mutada, async () => {
      const r = await build();
      if (r.codigo !== 0) return falhas.push(`vazio: build com a lista sem itens google saiu ${r.codigo} (o componente tem de sumir, não quebrar):\n${cauda(r.saida, 8)}`);
      const html = lerIndex();
      if (recortes(html).ps.length) falhas.push("vazio: [data-prova-social] renderiza com a lista sem itens google");
      for (const t of TEXTOS_GOOGLE) if (textoDe(html).includes(t)) falhas.push(`vazio: ${JSON.stringify(t)} na página com a lista sem itens google`);
    });
  if (!/\blinkGoogle\s*:\s*"[^"]*"/.test(fonte)) falhas.push('vazio: `linkGoogle: "..."` não encontrado em oficina.ts');
  else
    await comMutacao(REL_OFICINA, (f) => f.replace(/(\blinkGoogle\s*:\s*)"[^"]*"/, '$1""'), async () => {
      const r = await build();
      if (r.codigo !== 0) return falhas.push(`vazio: build com linkGoogle "" saiu ${r.codigo}:\n${cauda(r.saida, 8)}`);
      if (recortes(lerIndex()).ps.length) falhas.push('vazio: [data-prova-social] renderiza com linkGoogle ""');
    });
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

let codigo = 0;
let original = null;
try {
  const [maior, menor] = process.versions.node.split(".").map(Number);
  if (maior < 22 || (maior === 22 && menor < 6)) throw new ErroDeMontagem(`Node ${process.versions.node}: precisa de 22.6+`);
  original = readFileSync(join(RAIZ, REL_OFICINA));
  const ficha = acharFicha();
  console.log(`ficha: ${ficha.caminho}`);
  montarSandbox();
  console.log(`cópia do projeto em ${SANDBOX}`);
  const tokensBotao = classesDoBotao();
  const dados = await lerDados();

  const relatar = (nome, falhas) => {
    if (falhas.length) {
      codigo = 1;
      console.log(`FALHOU parte ${nome} (${falhas.length}):`);
      for (const f of falhas) console.log(`  - ${f}`);
    } else console.log(`PASSOU parte ${nome}.`);
  };

  console.log("parte a literal...");
  relatar("a literal", await parteA(dados));

  console.log("parte c-h página de referência...");
  const r = await build();
  if (r.codigo !== 0) throw new ErroDeMontagem(`build de referência saiu ${r.codigo}:\n${cauda(r.saida)}`);
  const html = lerIndex();
  const dist = [...arquivosDe(join(SANDBOX, "dist"))];
  relatar("c-h página de referência", parteReferencia(html, dist, ficha, tokensBotao));

  console.log("parte b sentinela e vazio...");
  relatar("b sentinela e vazio", await parteB(recortes(html).ps.length > 0));
} catch (e) {
  codigo = 2;
  console.error(`MONTAGEM: ${e instanceof ErroDeMontagem ? e.message : e.stack}`);
} finally {
  apagarSandbox();
  if (original) {
    let igual = false;
    try {
      igual = readFileSync(join(RAIZ, REL_OFICINA)).equals(original);
    } catch {}
    if (!igual) console.error(`AVISO: ${REL_OFICINA} do projeto mudou durante a execução (não por este teste); o resultado vale para a versão lida no início.`);
  }
}
process.exit(codigo);
