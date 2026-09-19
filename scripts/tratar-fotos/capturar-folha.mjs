#!/usr/bin/env node
// Captura folha-de-contato/folha.html em folha.png, sem dependência:
// servidor http do Node em porta livre (raiz = obra, para ../fotos-tratadas
// resolver), Chrome real headless com --remote-debugging-port=0 e perfil
// próprio (outra fatia abre Chrome ao mesmo tempo), CDP pelo WebSocket do Node 22.
// Uso: node scripts/tratar-fotos/capturar-folha.mjs

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";

const OBRA = new URL("../../../", import.meta.url).pathname;
const CHROME = "/opt/google/chrome/chrome";
const TIPOS = { ".html": "text/html; charset=utf-8", ".jpg": "image/jpeg", ".png": "image/png" };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const servidor = createServer((req, res) => {
  const caminho = normalize(join(OBRA, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!caminho.startsWith(OBRA) || !existsSync(caminho)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TIPOS[extname(caminho)] ?? "application/octet-stream" }).end(readFileSync(caminho));
});
await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
const url = `http://127.0.0.1:${servidor.address().port}/folha-de-contato/folha.html`;

const perfil = mkdtempSync(join(tmpdir(), "folha-chrome-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${perfil}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });

let fim = () => {};
try {
  let porta;
  for (let i = 0; i < 100 && !porta; i++) {
    await dormir(100);
    try { porta = readFileSync(join(perfil, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch {}
  }
  if (!porta) throw new Error("Chrome não abriu a porta de depuração");
  const aba = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(aba.webSocketDebuggerUrl);
  await new Promise((ok, erro) => { ws.onopen = ok; ws.onerror = erro; });
  fim = () => ws.close();
  let id = 0;
  const pend = new Map();
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p[1](new Error(JSON.stringify(m.error))) : p[0](m.result); } };
  const cdp = (method, params = {}) => new Promise((ok, erro) => { pend.set(++id, [ok, erro]); ws.send(JSON.stringify({ id, method, params })); });

  await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 2008, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url });
  // espera todas as imagens decodificarem
  for (let i = 0; i < 100; i++) {
    await dormir(200);
    const r = await cdp("Runtime.evaluate", { expression: "document.readyState==='complete' && [...document.images].every(i=>i.complete && i.naturalWidth>0)", returnByValue: true });
    if (r.result.value) break;
  }
  const { result } = await cdp("Runtime.evaluate", { expression: "[document.documentElement.scrollWidth, document.documentElement.scrollHeight, [...document.images].filter(i=>!i.naturalWidth).length]", returnByValue: true });
  const [w, h, quebradas] = result.value;
  if (quebradas) throw new Error(`${quebradas} imagem(ns) não carregaram`);
  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await dormir(500);
  const shot = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  writeFileSync(join(OBRA, "folha-de-contato/folha.png"), Buffer.from(shot.data, "base64"));
  console.log(`folha.png ${w}x${h}`);
} finally {
  fim();
  chrome.kill("SIGKILL");
  servidor.close();
  await dormir(300);
  rmSync(perfil, { recursive: true, force: true });
}
