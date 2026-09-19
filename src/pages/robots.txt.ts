// robots.txt gerado da fonte única (oficina.dominio): a linha Sitemap
// só existe quando o domínio está confirmado, igual a canonical/og:url.
import type { APIRoute } from "astro";
import oficina from "@/data/oficina";
import { urlBase } from "@/lib/jsonld";

export const GET: APIRoute = () => {
  const base = urlBase(oficina);
  const linhas = ["User-agent: *", "Allow: /"];
  if (base) linhas.push("", `Sitemap: ${base}sitemap-index.xml`);
  return new Response(`${linhas.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
