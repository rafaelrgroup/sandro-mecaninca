// Rasterização pelo NAVEGADOR (Chrome headless dirigido por CDP), sem
// dependência nova: Node 22 (fetch + WebSocket nativos) e o Chrome da
// máquina. O sharp não tem a Inter e troca a fonte do descritor em
// silêncio; por isso tudo o que leva <text> sai daqui.
//
// Concorrência: outra sessão pode ter Chrome aberto. Porta de depuração 0
// (lida de DevToolsActivePort) e perfil próprio em tmpdir, apagado ao fim.
// As páginas são servidas por http em 127.0.0.1:0 (fontes por file:// não
// são confiáveis no Chrome).

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

const CHROME = process.env.CHROME ?? "/opt/google/chrome/chrome";

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".css": "text/css; charset=utf-8",
};

const dorme = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Sobe servidor http (rotas: caminho → string|Buffer|{arquivo}) e Chrome.
 * Devolve { url(rota), capturar(opcoes), fechar() }.
 */
export async function abrirNavegador(rotas) {
  const servidor = createServer((req, res) => {
    const rota = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const alvo = rotas.get(rota);
    if (alvo === undefined) {
      res.writeHead(404).end();
      return;
    }
    const corpo = typeof alvo === "object" && !Buffer.isBuffer(alvo) ? readFileSync(alvo.arquivo) : alvo;
    res.writeHead(200, { "content-type": TIPOS[extname(rota)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(corpo);
  });
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${servidor.address().port}`;

  const perfil = mkdtempSync(join(tmpdir(), "gerar-marca-chrome-"));
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${perfil}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let portaDepuracao = null;
  const encerrar = async () => {
    // Fecha pelo protocolo (desligamento limpo, sem processo filho gravando
    // no perfil depois); SIGTERM só se isso não funcionar.
    const saiu = new Promise((r) => (chrome.exitCode !== null ? r() : chrome.once("exit", r)));
    try {
      const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${portaDepuracao}/json/version`)).json();
      const wsNav = new WebSocket(webSocketDebuggerUrl);
      await new Promise((r, j) => {
        wsNav.onopen = r;
        wsNav.onerror = j;
      });
      wsNav.send(JSON.stringify({ id: 1, method: "Browser.close" }));
    } catch {
      chrome.kill("SIGTERM");
    }
    await Promise.race([saiu, dorme(5000)]);
    if (chrome.exitCode === null) chrome.kill("SIGKILL");
    servidor.close();
    for (let i = 0; i < 20; i++) {
      try {
        rmSync(perfil, { recursive: true, force: true });
        return;
      } catch {
        await dorme(200);
      }
    }
    console.warn(`aviso: perfil temporário do Chrome não foi apagado: ${perfil}`);
  };

  try {
    const arqPorta = join(perfil, "DevToolsActivePort");
    for (let i = 0; i < 200 && !existsSync(arqPorta); i++) await dorme(50);
    if (!existsSync(arqPorta)) throw new Error(`Chrome não abriu a porta de depuração (${CHROME})`);
    const porta = (portaDepuracao = readFileSync(arqPorta, "utf-8").split("\n")[0].trim());

    const alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(alvo.webSocketDebuggerUrl);
    await new Promise((r, j) => {
      ws.onopen = r;
      ws.onerror = j;
    });
    let id = 0;
    const pendentes = new Map();
    const ouvintes = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id && pendentes.has(m.id)) {
        const p = pendentes.get(m.id);
        pendentes.delete(m.id);
        m.error ? p.rej(new Error(`${JSON.stringify(m.error)}`)) : p.res(m.result);
      } else ouvintes.forEach((f) => f(m));
    };
    const enviar = (method, params = {}) =>
      new Promise((res, rej) => {
        const i = ++id;
        pendentes.set(i, { res, rej });
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    const avaliar = async (expressao) => {
      const r = await enviar("Runtime.evaluate", { expression: expressao, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    await enviar("Page.enable");

    return {
      url: (rota) => base + rota,
      avaliar,
      /**
       * Abre `rota` com a janela largura×altura, espera as fontes pedidas
       * (lista de strings CSS `font`, ex.: '600 41px "Inter Variable"') e
       * captura. `seletor` recorta pelo retângulo do elemento.
       */
      async capturar({ rota, largura, altura, escala = 1, fontes = [], seletor = null, transparente = false }) {
        await enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: altura, deviceScaleFactor: escala, mobile: false });
        await enviar("Emulation.setDefaultBackgroundColorOverride", transparente ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
        const carregou = new Promise((r) => {
          const f = (m) => {
            if (m.method === "Page.loadEventFired") {
              ouvintes.splice(ouvintes.indexOf(f), 1);
              r();
            }
          };
          ouvintes.push(f);
        });
        const nav = await enviar("Page.navigate", { url: base + rota });
        if (nav.errorText) throw new Error(`navegação falhou (${rota}): ${nav.errorText}`);
        await Promise.race([
          carregou,
          dorme(30000).then(() => {
            throw new Error(`página não carregou em 30 s: ${rota}`);
          }),
        ]);
        for (const fonte of fontes) {
          const faces = await avaliar(`document.fonts.load(${JSON.stringify(fonte)}, "ÂMECANIC").then(l => l.length)`);
          if (!faces) throw new Error(`fonte não carregou no navegador: ${fonte} (${rota})`);
        }
        await avaliar("document.fonts.ready.then(() => document.fonts.status)");
        let clip = { x: 0, y: 0, width: largura, height: altura, scale: 1 };
        if (seletor) {
          const r = await avaliar(
            `(() => { const el = document.querySelector(${JSON.stringify(seletor)}); if (!el) throw new Error("seletor não encontrado: " + ${JSON.stringify(seletor)}); const b = el.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; })()`,
          );
          clip = { ...r, scale: 1 };
        } else {
          const h = await avaliar("document.documentElement.scrollHeight");
          clip.height = Math.max(altura, h);
        }
        const { data } = await enviar("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: true });
        return Buffer.from(data, "base64");
      },
      fechar: async () => {
        ws.close();
        await encerrar();
      },
    };
  } catch (erro) {
    await encerrar();
    throw erro;
  }
}

/** Lê as cores do @theme de global.css (fonte única dos valores). */
export function lerCores(caminhoGlobalCss) {
  const css = readFileSync(caminhoGlobalCss, "utf-8");
  const cores = {};
  for (const [, nome, valor] of css.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) cores[nome] = valor;
  for (const nome of ["grafite-950", "off-white", "ambar-500", "ambar-400"]) {
    if (!cores[nome]) throw new Error(`token --color-${nome} ausente em ${caminhoGlobalCss}`);
  }
  return cores;
}
