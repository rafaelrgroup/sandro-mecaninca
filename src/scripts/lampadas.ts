// Teste de lâmpadas do painel de sintomas (DESENHO §6 / M3): quando o
// painel entra na tela, as luzes-espia acendem juntas e apagam em
// escalonamento, UMA vez, como no painel do carro ao dar a partida.
//
// Garantias:
// - Sem JS e com movimento reduzido nada acontece: as luzes ficam no
//   estado de repouso (o CSS só anima sob .lampadas-teste).
// - Painel que já nasce na dobra também testa: o IntersectionObserver
//   entrega o estado inicial no primeiro callback (não se filtra "já
//   visível", que é o que daria zero toques a 1440).
// - O teste espera o reveal do painel (reveal.ts) terminar e as 7 luzes
//   estarem inteiras na tela: tocar com o painel transparente ou com as
//   luzes abaixo do pé seria tocar sem ninguém ver.
// Tempo: --duracao-lenta, --ease-padrao, atraso min(ordem x 60, 300)
// pelos mesmos tokens do escalonamento do reveal (global.css).

const raiz = document.documentElement;

// Resolve quando o reveal do painel não o esconde mais e a animação de
// entrada dele acabou (ou na hora, se o reveal não está ativo).
function aposReveal(painel: HTMLElement): Promise<void> {
  const oculto = () =>
    painel.hasAttribute("data-reveal") &&
    raiz.classList.contains("reveal-ativo") &&
    !painel.classList.contains("revelado");

  const revelado = oculto()
    ? new Promise<void>((resolver) => {
        const mo = new MutationObserver(() => {
          if (!oculto()) {
            mo.disconnect();
            resolver();
          }
        });
        mo.observe(painel, { attributes: true, attributeFilter: ["class"] });
        mo.observe(raiz, { attributes: true, attributeFilter: ["class"] });
      })
    : Promise.resolve();

  return revelado
    .then(() => Promise.allSettled(painel.getAnimations().map((a) => a.finished)))
    .then(() => undefined);
}

function testar(painel: HTMLElement): void {
  const luzes = Array.from(painel.querySelectorAll<HTMLElement>("[data-luz]"));
  if (luzes.length === 0) return;
  luzes.forEach((luz, i) => luz.style.setProperty("--ordem", String(i)));
  painel.classList.add("lampadas-teste");
  const fim = luzes.flatMap((luz) =>
    luz.getAnimations().filter((a) => (a as CSSAnimation).animationName === "lampada-teste"),
  );
  // Terminado o teste, as luzes voltam ao controle só do :has (hover/foco).
  Promise.allSettled(fim.map((a) => a.finished)).then(() => {
    painel.classList.remove("lampadas-teste");
    painel.setAttribute("data-lampadas", "testadas");
  });
}

// Todas as luzes inteiras na tela: só então o teste é visto. Com 1 px do
// painel na tela (parada a 5-8% do pé a 360) as luzes ainda estão abaixo.
function luzesNaTela(painel: HTMLElement): boolean {
  const luzes = Array.from(painel.querySelectorAll<HTMLElement>("[data-luz]"));
  return (
    luzes.length > 0 &&
    luzes.every((luz) => {
      const r = luz.getBoundingClientRect();
      return r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
    })
  );
}

function iniciar(): void {
  if (raiz.classList.contains("movimento-reduzido")) return;
  if (!("IntersectionObserver" in window)) return;
  const painel = document.querySelector<HTMLElement>("[data-painel]");
  if (!painel) return;

  let feito = false;
  let agendado = false;
  function checar(): void {
    agendado = false;
    if (feito || !luzesNaTela(painel!)) return;
    feito = true; // uma vez só
    window.removeEventListener("scroll", agendar);
    window.removeEventListener("resize", agendar);
    testar(painel!);
  }
  function agendar(): void {
    if (agendado || feito) return;
    agendado = true;
    requestAnimationFrame(checar);
  }

  // O painel na tela arma o teste (inclusive quando já nasce na dobra: o
  // primeiro callback traz o estado inicial). Armado, espera o reveal e
  // confere as luzes agora e a cada rolagem, até tocar.
  const observador = new IntersectionObserver(
    (entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return;
      observador.disconnect();
      aposReveal(painel)
        .then(() => {
          window.addEventListener("scroll", agendar, { passive: true });
          window.addEventListener("resize", agendar, { passive: true });
          checar();
        })
        .catch(() => painel.classList.remove("lampadas-teste"));
    },
    { rootMargin: "0px", threshold: 0 },
  );
  observador.observe(painel);
}

try {
  iniciar();
} catch {
  document.querySelector("[data-painel]")?.classList.remove("lampadas-teste");
}
