#!/usr/bin/env node
// Gera os ativos de marca em public/ a partir de src/lib/marca.js (marca
// recriada do letreiro, P4/MC4) e do nome da oficina em src/data/oficina.ts:
//   logo.svg                 marca completa (MECÂNICA + SANDRO, com painel)
//   marca-sem-descritor.svg  só SANDRO com o mostrador (obrigatória < 40 px)
//   logo-mark.svg            selo 160 (mostrador sobre o painel preto)
//   favicon.svg              o mesmo selo
//   apple-touch-icon.png     selo 180×180 opaco (fundo do painel), pelo navegador
//   og-image.png             1200×630, marca completa, pelo navegador
// favicon-32.png deixou de existir (a decisão manda só favicon.svg) e é
// apagado se sobrar de uma geração antiga.
//
// A marca é só caminho geométrico (L A), sem glifo de fonte; os rasters
// saem do Chrome (ver navegador.js), como antes. A frase do OG continua em
// curvas de Barlow Condensed (opentype.js); ela não é a marca. Telefones
// do letreiro não entram em nenhum arquivo.
//
// Uso: node scripts/gerar-marca/index.js  (ou "npm run marca")

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import opentype from "opentype.js";
import {
  LETREIRO_VIEWBOX_COMPLETA,
  SELO,
  arquivosSvgMarca,
  coresLetreiro,
  letreiroSvgAvulso,
  seloLetreiroSvg,
} from "../../src/lib/marca.js";
import { abrirNavegador, lerCores } from "./navegador.js";

const raizProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dirPublic = path.join(raizProjeto, "public");
mkdirSync(dirPublic, { recursive: true });

// ---------------------------------------------------------------------
// 1. Lê o nome da oficina em src/data/oficina.ts sem executar TypeScript
//    (evita depender de um transpilador só para o script de build da
//    marca): extrai o valor do campo `nome:` por regex simples.
// ---------------------------------------------------------------------
const oficinaTsPath = path.join(raizProjeto, "src/data/oficina.ts");
const oficinaTsFonte = readFileSync(oficinaTsPath, "utf-8");
// Isola o bloco "export const oficina: Oficina = { ... }" antes de
// procurar o campo "nome", porque o arquivo também tem `nome:` nos
// objetos de serviço (ex.: "Troca de óleo e filtros") — pegar o
// primeiro match do arquivo inteiro pegaria o serviço errado.
const matchBlocoOficina = oficinaTsFonte.match(
  /export const oficina: Oficina = \{([\s\S]*?)\n\};/,
);
if (!matchBlocoOficina) {
  throw new Error(`Não encontrei o bloco "export const oficina" em ${oficinaTsPath}`);
}
const matchNome = matchBlocoOficina[1].match(/\bnome:\s*"([^"]+)"/);
if (!matchNome) {
  throw new Error(`Não encontrei o campo "nome" dentro do bloco oficina em ${oficinaTsPath}`);
}
const nomeOficina = matchNome[1]; // nome de exibição
const matchCidade = matchBlocoOficina[1].match(/\bcidade:\s*"([^"]+)"/);
if (!matchCidade) {
  throw new Error(`Não encontrei o campo "cidade" dentro do bloco oficina em ${oficinaTsPath}`);
}
const cidadeOficina = matchCidade[1];

// ---------------------------------------------------------------------
// Cores: lidas do @theme de src/styles/global.css (fonte única).
// ---------------------------------------------------------------------
const cores = lerCores(path.join(raizProjeto, "src/styles/global.css"));
const CORES = {
  grafite950: cores["grafite-950"],
  ambar500: cores["ambar-500"],
  ambar400: cores["ambar-400"],
};
const coresMarca = coresLetreiro(cores);

// ---------------------------------------------------------------------
// 2. Fonte display (Barlow Condensed 800) só para a frase do OG em curvas.
// ---------------------------------------------------------------------
const fontePath = path.join(
  raizProjeto,
  "node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff",
);
const fonteBuffer = readFileSync(fontePath);
const arrayBuffer = fonteBuffer.buffer.slice(
  fonteBuffer.byteOffset,
  fonteBuffer.byteOffset + fonteBuffer.byteLength,
);
const fonte = opentype.parse(arrayBuffer);

/** Gera o `d` do path SVG do texto, já normalizado para começar em x=0/y=0
 * no canto superior esquerdo do seu bounding box, numa altura de fonte
 * alvo dada (em unidades SVG). */
function pathDoTexto(texto, alturaAlvo, letterSpacing = 0) {
  const tamanhoFonte = 500; // unidades arbitrárias grandes, escala depois
  let path = new opentype.Path();
  let x = 0;
  for (const char of texto) {
    if (char === " ") {
      x += tamanhoFonte * 0.32 + letterSpacing;
      continue;
    }
    const glifo = fonte.charToGlyph(char);
    const p = glifo.getPath(x, 0, tamanhoFonte);
    path.commands.push(...p.commands);
    x += glifo.advanceWidth * (tamanhoFonte / fonte.unitsPerEm) + letterSpacing;
  }
  const bbox = path.getBoundingBox();
  const alturaBbox = bbox.y2 - bbox.y1;
  const escala = alturaBbox > 0 ? alturaAlvo / alturaBbox : 1;

  // opentype.js já devolve os pontos no sistema de coordenadas do SVG
  // (Y crescendo para baixo) — só normaliza a origem para (0,0), sem
  // espelhar de novo (espelhar aqui deixaria o texto de cabeça para baixo).
  const comandosTransformados = path.commands.map((c) => {
    const novo = { ...c };
    for (const chave of ["x", "x1", "x2"]) {
      if (chave in c) novo[chave] = (c[chave] - bbox.x1) * escala;
    }
    for (const chave of ["y", "y1", "y2"]) {
      if (chave in c) novo[chave] = (c[chave] - bbox.y1) * escala;
    }
    return novo;
  });
  const pathFinal = new opentype.Path();
  pathFinal.commands = comandosTransformados;
  const larguraFinal = (bbox.x2 - bbox.x1) * escala;
  return { d: pathFinal.toPathData(2), largura: larguraFinal, altura: alturaBbox * escala };
}

// ---------------------------------------------------------------------
// 3. SVG avulsos: os quatro textos vêm prontos de arquivosSvgMarca (fonte
//    única também do teste), com as cores resolvidas dos tokens.
// ---------------------------------------------------------------------
for (const [arquivo, texto] of Object.entries(arquivosSvgMarca({ cores: coresMarca, nome: nomeOficina }))) {
  writeFileSync(path.join(dirPublic, arquivo), texto);
}
rmSync(path.join(dirPublic, "favicon-32.png"), { force: true });

// ---------------------------------------------------------------------
// 4. Rasters, pelo navegador.
// ---------------------------------------------------------------------
async function main() {
  // og-image.png (1200x630): mesma composição de antes — fundo grafite,
  // filete âmbar no topo, marca completa centrada, frase âmbar embaixo.
  const largOg = 1200;
  const altOg = 630;
  const margemHorizontalOg = 120;
  const [, , larguraTotal, alturaTotal] = LETREIRO_VIEWBOX_COMPLETA.split(" ").map(Number);
  const escalaLogoOg = Math.min((largOg - margemHorizontalOg * 2) / larguraTotal, 3.4);
  const larguraLogoOg = larguraTotal * escalaLogoOg;
  const alturaLogoOg = alturaTotal * escalaLogoOg;
  const xLogoOg = (largOg - larguraLogoOg) / 2;
  const yLogoOg = altOg / 2 - alturaLogoOg / 2 - 30;

  // Frase: ocupa a largura útil da composição (a mesma do logo), para ler
  // na prévia de link a 300 px (achado 5 do G1). A largura sai linear na
  // altura-alvo (o espaçamento é em unidades da fonte, antes da escala):
  // mede-se numa altura qualquer e escala-se até a largura útil.
  const larguraTaglineDisponivel = largOg - margemHorizontalOg * 2;
  const tagline = `OFICINA MECÂNICA EM ${cidadeOficina.toLocaleUpperCase("pt-BR")}`;
  const medida = pathDoTexto(tagline, 1, 3);
  const { d: dTaglineFinal, largura: larguraTagline, altura: alturaTagline } = pathDoTexto(tagline, larguraTaglineDisponivel / medida.largura, 3);
  if (yLogoOg + alturaLogoOg + 56 + alturaTagline > altOg) {
    // Frase curta (cidade de nome curto) fica alta demais ao encher a
    // largura: falha em vez de sair cortada; a medida volta ao desenho.
    throw new Error(`og-image: a frase "${tagline}" passa do fundo (${alturaTagline.toFixed(1)} u de altura)`);
  }
  const xTagline = largOg / 2 - larguraTagline / 2;
  const logoOg = letreiroSvgAvulso({
    comDescritor: true,
    cores: coresMarca,
    nome: nomeOficina,
    extra: ` x="${xLogoOg.toFixed(2)}" y="${yLogoOg.toFixed(2)}" width="${larguraLogoOg.toFixed(2)}" height="${alturaLogoOg.toFixed(2)}"`,
  });
  const ogSvgFinal = `<svg xmlns="http://www.w3.org/2000/svg" width="${largOg}" height="${altOg}" viewBox="0 0 ${largOg} ${altOg}">
    <rect width="${largOg}" height="${altOg}" fill="${CORES.grafite950}" />
    <rect x="0" y="0" width="${largOg}" height="10" fill="${CORES.ambar500}" />
    ${logoOg}
    <g transform="translate(${xTagline.toFixed(2)},${(yLogoOg + alturaLogoOg + 56).toFixed(2)})">
      <path d="${dTaglineFinal}" fill="${CORES.ambar400}" />
    </g>
  </svg>`;

  // apple-touch-icon.png (180x180): o SELO (mostrador sobre o painel).
  // OPACO (ADENDO G1 item 1): quadrado inteiro na cor do painel sob o selo,
  // porque a máscara do iOS come o chanfro e transparência ali vira lasca.
  // Só aqui; logo-mark.svg e favicon.svg seguem com chanfro.
  const ladoApple = 180;
  const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ladoApple}" height="${ladoApple}" viewBox="0 0 ${SELO.lado} ${SELO.lado}"><rect width="${SELO.lado}" height="${SELO.lado}" fill="${coresMarca.painel}"/>${seloLetreiroSvg({ cores: coresMarca })}</svg>`;

  const pagina = (corpo) => `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0}svg{display:block}
</style></head><body>${corpo}</body></html>`;

  const rotas = new Map([
    ["/og.html", pagina(ogSvgFinal)],
    ["/apple.html", pagina(appleSvg)],
  ]);
  const nav = await abrirNavegador(rotas);
  try {
    const og = await nav.capturar({
      rota: "/og.html",
      largura: largOg,
      altura: altOg,
    });
    writeFileSync(path.join(dirPublic, "og-image.png"), og);
    const apple = await nav.capturar({ rota: "/apple.html", largura: ladoApple, altura: ladoApple });
    writeFileSync(path.join(dirPublic, "apple-touch-icon.png"), apple);
  } finally {
    await nav.fechar();
  }

  console.log("Marca gerada em public/:");
  console.log("  - logo.svg (marca completa)");
  console.log("  - marca-sem-descritor.svg");
  console.log("  - logo-mark.svg (selo)");
  console.log("  - favicon.svg (selo)");
  console.log("  - apple-touch-icon.png (selo opaco, navegador)");
  console.log("  - og-image.png (marca completa, navegador)");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
