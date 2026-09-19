// Hodômetro do ano na seção Sobre (DESENHO §6 "2018 em hodômetro" / M6).
// O ano chega pronto no HTML (CabecalhoSecao variante "dado", valor de
// oficina.desdeAno); este script só o LÊ do DOM e o faz rolar UMA vez.
//
// Garantias:
// - Sem JS e com movimento reduzido nada acontece: o ano do HTML fica.
// - O texto do ano continua no DOM o tempo todo (reserva transparente,
//   que guarda a largura e a altura exatas): innerText, leitor de tela e
//   buscador leem o ano, nunca um zero. Os rolos são aria-hidden e os
//   algarismos deles vêm do CSS (::before), fora do innerText.
// - Nada desloca: os rolos ficam em camada absoluta sobre a reserva.
// - No fim o conteúdo volta a ser o texto original do HTML.
// - Qualquer erro devolve o texto original.
// Gatilho: 1 px do ano na tela (rootMargin 0, como o reveal), depois do
// reveal do bloco (mesmo modelo de lampadas.ts). Tempo e curva no CSS:
// --duracao-entrada-hodometro e --ease-saida.

const raiz = document.documentElement;
const VOLTA = 10; // cada rolo dá uma volta inteira antes de parar no algarismo

// Resolve quando o reveal do bloco não o esconde mais e a animação de
// entrada dele acabou (ou na hora, se o reveal não está ativo).
function aposReveal(bloco: HTMLElement): Promise<void> {
  const oculto = () =>
    raiz.classList.contains("reveal-ativo") && !bloco.classList.contains("revelado");

  const revelado = oculto()
    ? new Promise<void>((resolver) => {
        const mo = new MutationObserver(() => {
          if (!oculto()) {
            mo.disconnect();
            resolver();
          }
        });
        mo.observe(bloco, { attributes: true, attributeFilter: ["class"] });
        mo.observe(raiz, { attributes: true, attributeFilter: ["class"] });
      })
    : Promise.resolve();

  return revelado
    .then(() => Promise.allSettled(bloco.getAnimations().map((a) => a.finished)))
    .then(() => undefined);
}

// Monta reserva + rolos parados em zero. Devolve a função que roda.
function montar(alvo: HTMLElement, ano: string): () => Promise<void> {
  const caixa = document.createElement("span");
  caixa.className = "hodometro";
  const reserva = document.createElement("span");
  reserva.className = "hodometro-reserva";
  reserva.textContent = ano;
  const rolos = document.createElement("span");
  rolos.className = "hodometro-rolos";
  rolos.setAttribute("aria-hidden", "true");
  for (const algarismo of ano) {
    const rolo = document.createElement("span");
    rolo.className = "hodometro-rolo";
    const fita = document.createElement("span");
    fita.className = "hodometro-fita";
    fita.style.setProperty("--passos", String(VOLTA + Number(algarismo)));
    rolo.append(fita);
    rolos.append(rolo);
  }
  caixa.append(reserva, rolos);
  alvo.replaceChildren(caixa);

  return () => {
    caixa.classList.add("hodometro-girando");
    const fitas = Array.from(caixa.querySelectorAll<HTMLElement>(".hodometro-fita"));
    const fim = fitas.flatMap((f) =>
      f.getAnimations().filter((a) => (a as CSSAnimation).animationName === "hodometro"),
    );
    return Promise.allSettled(fim.map((a) => a.finished)).then(() => undefined);
  };
}

function iniciar(): void {
  if (raiz.classList.contains("movimento-reduzido")) return;
  if (!("IntersectionObserver" in window)) return;
  const bloco = document.querySelector<HTMLElement>("[data-hodometro]");
  const ano = bloco?.dataset.hodometro?.trim();
  if (!bloco || !ano || !/^\d+$/.test(ano)) return;
  // O ano que o abridor "dado" já escreveu no HTML (lido, não escrito aqui).
  const alvo = Array.from(
    bloco.querySelectorAll<HTMLElement>('[data-abridor="dado"] p'),
  ).find((p) => p.childElementCount === 0 && p.textContent?.trim() === ano);
  if (!alvo) return;

  const original = alvo.textContent ?? ano;
  const restaurar = () => {
    alvo.textContent = original;
    alvo.setAttribute("data-hodometro-estado", "parado");
  };

  try {
    const rodar = montar(alvo, ano);
    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        observador.disconnect(); // uma vez só
        aposReveal(bloco)
          .then(rodar)
          .then(restaurar, restaurar);
      },
      { rootMargin: "0px", threshold: 0 },
    );
    observador.observe(alvo);
  } catch {
    restaurar();
  }
}

iniciar();
