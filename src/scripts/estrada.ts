// Preenche a "estrada" do Como Funciona.
// Abaixo de lg (estrada vertical) acompanha a rolagem. A partir de lg
// (estrada horizontal, DESENHO §5 / M2) se desenha por TEMPO ao entrar na
// tela: --duracao-estrada (global.css), uma vez só.
// Sem JS / com movimento reduzido o CSS mantém --progresso: 1 (cheia).

const raiz = document.documentElement;

// "1600ms" ou "1.6s" (o build minifica) -> ms. Sem token: 0 (cheia na hora).
function duracaoMs(valor: string): number {
  const v = valor.trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return v.endsWith("ms") ? n : n * 1000;
}

function iniciar(): void {
  if (raiz.classList.contains("movimento-reduzido")) return;
  const estrada = document.querySelector<HTMLElement>("[data-estrada]");
  if (!estrada) return;
  const marcos = Array.from(estrada.querySelectorAll<HTMLElement>("[data-marco]"));
  const total = marcos.length || 1;
  const duracao = duracaoMs(getComputedStyle(raiz).getPropertyValue("--duracao-estrada"));

  let agendado = false;
  let porTempo = false;
  let observador: IntersectionObserver | null = null;
  let quadro = 0;
  let desenhada = false; // o desenho por tempo já terminou: não repete

  function aplicar(progresso: number): void {
    estrada!.style.setProperty("--progresso", progresso.toFixed(4));
    marcos.forEach((marco, i) => {
      marco.toggleAttribute("data-ativo", progresso * total > i + 0.02);
    });
  }

  // Mesmo corte do CSS: a estrada vira horizontal (lg:grid-flow-col) em lg.
  function ehHorizontal(): boolean {
    return getComputedStyle(estrada!).gridAutoFlow.startsWith("column");
  }

  function porRolagem(): void {
    const r = estrada!.getBoundingClientRect();
    const alturaTela = window.innerHeight;
    // 0 quando o topo da estrada chega a 85% da tela;
    // 1 quando o fim dela passa de 80% da tela — perto o bastante do pé
    // para o último marco acender enquanto o passo dele ainda se lê.
    const inicio = alturaTela * 0.85;
    const fim = alturaTela * 0.8;
    const percurso = r.height + (inicio - fim);
    aplicar(Math.min(1, Math.max(0, (inicio - r.top) / percurso)));
  }

  function desenhar(): void {
    if (duracao <= 0) {
      desenhada = true;
      aplicar(1);
      return;
    }
    const t0 = performance.now();
    const passo = (agora: number): void => {
      const p = Math.min(1, (agora - t0) / duracao);
      aplicar(p);
      if (p < 1) {
        quadro = requestAnimationFrame(passo);
      } else {
        quadro = 0;
        desenhada = true;
      }
    };
    quadro = requestAnimationFrame(passo);
  }

  function pararTempo(): void {
    observador?.disconnect();
    observador = null;
    if (quadro) cancelAnimationFrame(quadro);
    quadro = 0;
  }

  function ligarTempo(): void {
    if (desenhada) {
      aplicar(1);
      return;
    }
    aplicar(0);
    // rootMargin 0 (padrão), como DECISOES-P1a item 4.
    const obs = new IntersectionObserver((entradas) => {
      // Aviso já enfileirado de um observer desligado (voltou a < lg): ignora.
      if (observador !== obs || !entradas.some((e) => e.isIntersecting)) return;
      obs.disconnect();
      observador = null;
      desenhar();
    });
    observador = obs;
    obs.observe(estrada!);
  }

  function atualizar(): void {
    agendado = false;
    const horizontal = ehHorizontal();
    if (horizontal !== porTempo) {
      porTempo = horizontal;
      if (porTempo) ligarTempo();
      else pararTempo();
    }
    if (!porTempo) porRolagem();
  }

  function agendar(): void {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(atualizar);
  }

  estrada.classList.add("estrada-js");
  atualizar();
  window.addEventListener("scroll", agendar, { passive: true });
  window.addEventListener("resize", agendar, { passive: true });
}

try {
  iniciar();
} catch {
  const estrada = document.querySelector<HTMLElement>("[data-estrada]");
  estrada?.classList.remove("estrada-js");
  estrada?.style.removeProperty("--progresso");
}
