import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import oficina from "./src/data/oficina.ts";
import { urlBase } from "./src/lib/jsonld.ts";

// https://astro.build/config
export default defineConfig({
  output: "static",
  // Só com domínio confirmado em src/data/oficina.ts (fonte única).
  site: urlBase(oficina) ?? undefined,
  vite: {
    plugins: [tailwindcss()],
  },
  // sitemap só gera com `site` definido (domínio em oficina.ts).
  integrations: [icon(), sitemap()],
  // DESENHO-APROVADO §3: dev sem a barra de ferramentas do Astro.
  devToolbar: { enabled: false },
});
