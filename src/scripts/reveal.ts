// Reveal de entrada com IntersectionObserver.
//
// Garantias:
// - Sem JS: nenhum elemento é escondido (o CSS só esconde sob
//   html.reveal-ativo, classe que só este script coloca).
// - Movimento reduzido: o script não ativa nada.
// - Elementos já na tela no momento da ativação são marcados como
//   revelados antes de a classe entrar, então nada fica oculto na dobra.
// - Qualquer erro no caminho remove a classe: tudo volta a ficar visível.
//
// Escalonamento por LOTE: os elementos revelados juntos (a dobra na
// ativação, ou as entradas de um mesmo callback do observer) recebem
// --ordem = posição no lote, em ordem de documento. O atraso vem dos
// tokens --atraso-escalonamento e --escalonamento-teto no CSS:
// min(ordem x 60, 300).
//
// rootMargin 0 e threshold 0: basta 1 px do elemento na tela para ele
// revelar. Com margem negativa (era -10%), uma parada a 5-8% do pé da
// tela deixava o elemento visível na área, mas oculto.

const raiz = document.documentElement;

function revelarLote(lote: HTMLElement[]): void {
  lote.forEach((el, i) => {
    el.style.setProperty("--ordem", String(i));
    el.classList.add("revelado");
  });
}

function iniciar(): void {
  if (raiz.classList.contains("movimento-reduzido")) return;
  if (!("IntersectionObserver" in window)) return;

  const alvos = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
  if (alvos.length === 0) return;

  const alturaTela = window.innerHeight;
  revelarLote(
    alvos.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < alturaTela && r.bottom > 0;
    }),
  );

  const observador = new IntersectionObserver(
    (entradas) => {
      const lote = entradas
        .filter((entrada) => entrada.isIntersecting)
        .map((entrada) => entrada.target as HTMLElement)
        .sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
        );
      for (const el of lote) observador.unobserve(el);
      revelarLote(lote);
    },
    { rootMargin: "0px", threshold: 0 },
  );

  for (const el of alvos) {
    if (!el.classList.contains("revelado")) observador.observe(el);
  }

  raiz.classList.add("reveal-ativo");
}

try {
  iniciar();
} catch {
  raiz.classList.remove("reveal-ativo");
}
