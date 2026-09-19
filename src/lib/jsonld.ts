// JSON-LD schema.org (AutoRepair) gerado a partir de src/data/oficina.ts.
// Regras: sem review/aggregateRating; url/image só existem quando o
// domínio próprio estiver confirmado em oficina.dominio.
import type { Oficina } from "@/data/oficina";

/** "(DD) NNNNN-NNNN" → "+55-DD-NNNNN-NNNN" */
function telefoneInternacional(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  return `+55-${ddd}-${numero.slice(0, -4)}-${numero.slice(-4)}`;
}

/** Domínio normalizado como URL absoluta com barra final, ou null. */
export function urlBase(oficina: Oficina): string | null {
  const dominio = oficina.dominio.trim();
  if (!dominio) return null;
  const comProtocolo = /^https?:\/\//.test(dominio) ? dominio : `https://${dominio}`;
  return comProtocolo.endsWith("/") ? comProtocolo : `${comProtocolo}/`;
}

export function gerarJsonLd(oficina: Oficina): Record<string, unknown> {
  const base = urlBase(oficina);
  const { endereco } = oficina;

  const dados: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: oficina.nome,
    telephone: telefoneInternacional(oficina.telefone),
    foundingDate: String(oficina.desdeAno),
    address: {
      "@type": "PostalAddress",
      streetAddress: endereco.logradouro,
      addressLocality: endereco.cidade,
      addressRegion: endereco.uf,
      postalCode: endereco.cep,
      addressCountry: "BR",
    },
    areaServed: {
      "@type": "City",
      name: endereco.cidade,
    },
  };

  if (base) {
    dados.url = base;
    dados.image = `${base}og-image.png`;
  }
  if (oficina.geo) {
    dados.geo = {
      "@type": "GeoCoordinates",
      latitude: oficina.geo.lat,
      longitude: oficina.geo.lng,
    };
  }
  if (oficina.linkGoogle.trim()) {
    dados.sameAs = [oficina.linkGoogle.trim()];
  }
  if (oficina.turnosSemana.length > 0) {
    dados.openingHoursSpecification = oficina.turnosSemana.map((turno) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: turno.abre,
      closes: turno.fecha,
    }));
  }

  return dados;
}

/**
 * FAQPage schema.org com as mesmas perguntas da seção Dúvidas
 * (oficina.faq, fonte única). Null quando não há perguntas.
 */
export function gerarFaqJsonLd(oficina: Oficina): Record<string, unknown> | null {
  if (oficina.faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: oficina.faq.map((item) => ({
      "@type": "Question",
      name: item.pergunta,
      acceptedAnswer: { "@type": "Answer", text: item.resposta },
    })),
  };
}
