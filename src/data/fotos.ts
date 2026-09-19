// Manifesto das fotos — FONTE ÚNICA (DESENHO-APROVADO §3). Toda foto
// exibida sai daqui: componentes pedem a foto pelo slot (`foto(slot)`),
// o rodapé gera os créditos desta lista e CREDITOS.md só aponta para cá.
// Trocar por foto real = pôr o original em src/assets/fotos/, editar a
// entrada (origem "real", autor, licença) e rodar o tratamento.
// hero, servico-1, servico-2 e sobre: fotos reais do perfil Google da
// oficina (P4, FT3); servico-3: provisório de banco (T3-d, *-g1.jpg).
// O CTA final não tem foto (bloco âmbar, P2 F15): o slot cta saiu.
// Licenças lidas em 2026-09-19 na página de cada foto (o acesso direto
// devolvia 401/403 ao curl; lidas pelo leitor r.jina.ai, com o autor
// da página conferido contra `autor`). Unsplash mostra a linha "Free to
// use under the Unsplash License"; nenhuma é Unsplash+. Pexels mostra o
// rótulo "License" com o valor "Free" (link para pexels.com/license).
import type { ImageMetadata } from "astro";

export type SlotFoto = "hero" | "servico-1" | "servico-2" | "servico-3" | "sobre";

export interface EntradaFoto {
  slot: SlotFoto;
  /** Nome do arquivo em src/assets/fotos/. */
  arquivo: string;
  /** Dimensões do arquivo em disco, em px (conferidas no build). */
  largura: number;
  altura: number;
  /** Texto alternativo. "" = decorativa (o componente usa aria-hidden). */
  alt: string;
  origem: "banco" | "real";
  /** Nome do banco para o crédito, ou null quando a foto é da oficina. */
  banco: "Unsplash" | "Pexels" | null;
  autor: string;
  /** Página da foto no banco, ou o link da conta que a subiu (foto real). */
  url: string;
  /** Linha literal de licença lida na página da foto, ou a linha de procedência (foto real). */
  licenca: string;
  /** Data (AAAA-MM-DD) em que a licença foi conferida na página; "" = não conferida. */
  conferidaEm: string;
  /** Tratamento aplicado ao original (recorte etc.); "" = nenhum. */
  observacao: string;
}

// Procedência das fotos reais (P4, FT3): fotos 01-09 do perfil Google da
// oficina, subidas pela conta "Sandro mecânica" (perfil-google/inventario.json)
// e aprovadas em FOTOS-TRIAGEM-PERFIL.md. Ser a conta do dono é DEDUÇÃO pelo
// nome: o dono confirma antes de publicar. Sem banco: no lugar da licença vai
// a linha de procedência (C6 de FOTOS-TRIAGEM-PERFIL.md), literal em cada
// entrada; `url` é o link da conta; `conferidaEm` é a data da ordem do dono.

export const fotos: EntradaFoto[] = [
  // Slots hero, servico-1..3 e sobre: mestres de scripts/tratar-fotos
  // (receita DECISOES-P1a item 9 + ADENDO G1-FOTOS). P4/FT3: hero,
  // servico-1, servico-2 e sobre passam às fotos reais P08, P03, P06 e P05.
  {
    slot: "hero",
    arquivo: "P08-hero.jpg",
    largura: 1920,
    altura: 1280,
    alt: "Fachada da oficina à noite, com o letreiro Mecânica Sandro aceso e, pelas vitrines, o salão com um carro no elevador",
    origem: "real",
    banco: null,
    autor: "Sandro mecânica",
    url: "https://maps.google.com/maps/contrib/113782236122428659434",
    licenca:
      "foto do próprio cliente, conta 'Sandro mecânica' do perfil Google (https://maps.google.com/maps/contrib/113782236122428659434), uso mandado pelo dono em 2026-09-19",
    conferidaEm: "2026-09-19",
    observacao:
      "Foto 08 do perfil (4128×3096). Recortada para tirar os telefones do letreiro, o carro da frente com a placa e as duas pessoas do interior; janela 740,350 2400×1600; tratamento único (gR 0.9956, gB 0.9937, gammaOut 1.15).",
  },
  {
    slot: "servico-1",
    arquivo: "P03-servico.jpg",
    largura: 1440,
    altura: 960,
    alt: "Peças desmontadas no chão da oficina: câmbio aberto, platô e disco de embreagem, uma roda e o agregado da suspensão com a bandeja",
    origem: "real",
    banco: null,
    autor: "Sandro mecânica",
    url: "https://maps.google.com/maps/contrib/113782236122428659434",
    licenca:
      "foto do próprio cliente, conta 'Sandro mecânica' do perfil Google (https://maps.google.com/maps/contrib/113782236122428659434), uso mandado pelo dono em 2026-09-19",
    conferidaEm: "2026-09-19",
    observacao:
      "Foto 03 do perfil (3024×4032). Recortada para tirar a marca do elevador, uma placa e caixas com logotipo; janela 1000,2450 2022×1348; tratamento único (gR 1.0055, gB 1.0402, gammaOut 1.15).",
  },
  {
    slot: "servico-2",
    arquivo: "P06-servico.jpg",
    largura: 1440,
    altura: 960,
    alt: "Carro vermelho erguido no elevador de duas colunas da oficina",
    origem: "real",
    banco: null,
    autor: "Sandro mecânica",
    url: "https://maps.google.com/maps/contrib/113782236122428659434",
    licenca:
      "foto do próprio cliente, conta 'Sandro mecânica' do perfil Google (https://maps.google.com/maps/contrib/113782236122428659434), uso mandado pelo dono em 2026-09-19",
    conferidaEm: "2026-09-19",
    observacao:
      "Foto 06 do perfil (3096×4128). Recortada para tirar a marca do elevador, placa, marcas de carro, tambores e caixas com marca e os telefones; janela 0,280 1446×964, no limite do mestre; tratamento único (gR 0.9, gB 0.94, gammaOut 1.15). Mostra revisão, não diagnóstico (volta possível: T1-b).",
  },
  {
    // SEM FOTO REAL: nenhuma das 9 fotos da conta da oficina mostra motor,
    // cofre aberto ou troca de óleo; o óleo só aparece em tambores com marca
    // legível, que o critério 4 tira (FOTOS-TRIAGEM-PERFIL.md, slot 4).
    // Fica a foto de banco, com crédito no rodapé (decisão do dono (4)).
    slot: "servico-3",
    arquivo: "T3-d-servico-g1.jpg",
    largura: 1440,
    altura: 960,
    alt: "",
    origem: "banco",
    banco: "Pexels",
    autor: "Artem Podrez",
    url: "https://www.pexels.com/photo/a-mechanic-fixing-a-car-8985707/",
    licenca: "License Free",
    conferidaEm: "2026-09-19",
    observacao:
      "Sem foto real para este slot (ver comentário). Recortada para tirar o rosto e o emblema da grade; janela 0,1954 2068×1379 do original 2068×3676; tratamento único (gR 1.0396, gB 0.94, gammaOut 1.15).",
  },
  {
    slot: "sobre",
    arquivo: "P05-sobre.jpg",
    largura: 1440,
    altura: 1800,
    alt: "Bancada da oficina com o painel de ferramentas na parede, uma morsa, um balde e a furadeira de bancada",
    origem: "real",
    banco: null,
    autor: "Sandro mecânica",
    url: "https://maps.google.com/maps/contrib/113782236122428659434",
    licenca:
      "foto do próprio cliente, conta 'Sandro mecânica' do perfil Google (https://maps.google.com/maps/contrib/113782236122428659434), uso mandado pelo dono em 2026-09-19",
    conferidaEm: "2026-09-19",
    observacao:
      "Foto 05 do perfil (3024×4032). Recortada para tirar tambor, garrafas, caixas e relógio com marca; janela 0,820 1880×2350; tratamento único (gR 1.022, gB 0.9891, gammaOut 1.15).",
  },
];

const arquivos = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/fotos/*.{jpg,jpeg,png,webp,avif}",
  { eager: true },
);

/**
 * Foto de um slot: a entrada do manifesto + a imagem importada.
 * Falha o build se o slot não tem entrada, se o arquivo não existe,
 * se as dimensões declaradas não batem com o arquivo ou se a entrada
 * não tem licença literal e data de conferência.
 */
export function foto(slot: SlotFoto): EntradaFoto & { imagem: ImageMetadata } {
  const entrada = fotos.find((f) => f.slot === slot);
  if (!entrada) throw new Error(`fotos.ts: slot "${slot}" sem entrada no manifesto.`);
  if (!entrada.licenca.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(entrada.conferidaEm)) {
    throw new Error(`fotos.ts: slot "${slot}" sem licença literal ou sem data de conferência.`);
  }
  const imagem = arquivos[`/src/assets/fotos/${entrada.arquivo}`]?.default;
  if (!imagem) throw new Error(`fotos.ts: arquivo "${entrada.arquivo}" (slot "${slot}") não existe.`);
  if (imagem.width !== entrada.largura || imagem.height !== entrada.altura) {
    throw new Error(
      `fotos.ts: "${entrada.arquivo}" mede ${imagem.width}×${imagem.height}, manifesto diz ${entrada.largura}×${entrada.altura}.`,
    );
  }
  return { ...entrada, imagem };
}
