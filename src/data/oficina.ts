// Dados da oficina — FONTE ÚNICA. Fonte: informações confirmadas com o
// cliente (salvo onde um comentário VERIFICAR diz o contrário).
// Nenhum componente, layout, meta ou link repete endereço, telefone,
// WhatsApp, nome ou cidade: todos leem daqui (links derivados em
// src/lib/links.ts; fotos em src/data/fotos.ts).
// Campos opcionais vazios ("" ou []) não devem ser renderizados pelos
// componentes que os consomem — trate string vazia/só espaço e array
// vazio como "não informado".
// scripts/gerar-marca lê `nome` e `cidade` do bloco `export const
// oficina` por regex: mantenha os dois como string literal ali.

export interface Servico {
  slug: string;
  nome: string;
  resumo: string;
}

/**
 * Grupo do índice de serviços. `slotGuia` é o slot de src/data/fotos.ts
 * cuja foto guia o grupo (a <768 só a do primeiro grupo aparece).
 * `servicos` são slugs de `servicos`, na ordem de exibição.
 */
export interface GrupoServico {
  titulo: string;
  slotGuia: "servico-1" | "servico-2" | "servico-3";
  servicos: string[];
}

export interface Sintoma {
  texto: string;
  servicoSlug: string;
}

export interface PerguntaFaq {
  pergunta: string;
  resposta: string;
}

export interface Passo {
  titulo: string;
  texto: string;
}

/**
 * De onde vem uma afirmação de negócio. União fechada: afirmação sem
 * fonte não entra na lista e, portanto, não aparece na página.
 * - "cliente": confirmada com o cliente (cabeçalho deste arquivo);
 * - "receita": cadastro na Receita Federal (CNPJ, abertura, CNAE);
 * - "cdc-art-40": obrigação legal (CDC, art. 40 — orçamento prévio);
 * - "google": perfil da oficina no Google (perfil-google/ficha/ficha.json),
 *   texto byte a byte como o Google exibe; só em [data-prova-social].
 */
export type FonteAfirmacao = "cliente" | "receita" | "cdc-art-40" | "google";

export interface Afirmacao {
  texto: string;
  fonte: FonteAfirmacao;
  /** Data (ISO AAAA-MM-DD) em que a fonte foi conferida; mesmo nome de fotos.ts. */
  conferidaEm?: string;
}

export interface Oficina {
  nome: string;
  desdeAno: number;
  cnpj: string;
  endereco: {
    logradouro: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  telefone: string;
  whatsapp: string;
  /** Horário de atendimento. Vazio até confirmação do cliente. */
  horario: string;
  /** Link de avaliações/perfil no Google. Vazio até confirmação do cliente. */
  linkGoogle: string;
  /** Domínio próprio do site. Vazio até confirmação do cliente. */
  dominio: string;
  /** Coordenadas geográficas, se um dia forem confirmadas. */
  geo: { lat: number; lng: number } | null;
  servicos: Servico[];
  /** Grupos do índice de serviços; todo serviço está em um grupo ou na faixa. */
  gruposServico: GrupoServico[];
  /** Slug do serviço que sai dos grupos e vira a faixa "Peças e acessórios". */
  faixaPecas: string;
  sintomas: Sintoma[];
  faq: PerguntaFaq[];
  passos: Passo[];
}

export const servicos: Servico[] = [
  {
    slug: "troca-de-oleo-e-filtros",
    nome: "Troca de óleo e filtros",
    resumo: "Troca de óleo do motor e dos filtros de óleo, ar e combustível.",
  },
  {
    slug: "freios",
    nome: "Freios",
    resumo: "Revisão, pastilhas, discos, fluido e sangria do sistema de freios.",
  },
  {
    slug: "suspensao-e-direcao",
    nome: "Suspensão e direção",
    resumo: "Amortecedores, molas, buchas, terminais e alinhamento da direção.",
  },
  {
    slug: "embreagem",
    nome: "Embreagem",
    resumo: "Diagnóstico e troca do kit de embreagem e componentes relacionados.",
  },
  {
    slug: "correia-dentada",
    nome: "Correia dentada",
    resumo: "Troca preventiva da correia dentada e tensionadores.",
  },
  {
    slug: "arrefecimento",
    nome: "Arrefecimento",
    resumo: "Radiador, mangueiras, bomba d'água e sistema de arrefecimento do motor.",
  },
  {
    slug: "revisao-preventiva",
    nome: "Revisão preventiva",
    resumo: "Checagem geral do veículo para evitar problemas antes que apareçam.",
  },
  {
    slug: "diagnostico-de-ruidos-e-falhas",
    nome: "Diagnóstico de ruídos e falhas",
    resumo: "Identificação de barulhos, luzes de painel e falhas de funcionamento.",
  },
  {
    slug: "pecas-e-acessorios",
    nome: "Peças e acessórios",
    resumo: "Venda e instalação de peças e acessórios para o seu veículo.",
  },
];

// Índice de serviços (DESENHO-APROVADO §4): 3 grupos, cada um guiado por
// uma foto (freios servico-1, revisão servico-2, óleo servico-3), mais a
// faixa "Peças e acessórios". A ordem dos grupos e das linhas é a da tela.
export const gruposServico: GrupoServico[] = [
  {
    titulo: "Freios, suspensão e embreagem",
    slotGuia: "servico-1",
    servicos: ["freios", "suspensao-e-direcao", "embreagem"],
  },
  {
    titulo: "Revisão e diagnóstico",
    slotGuia: "servico-2",
    servicos: ["revisao-preventiva", "diagnostico-de-ruidos-e-falhas"],
  },
  {
    titulo: "Óleo e motor",
    slotGuia: "servico-3",
    servicos: ["troca-de-oleo-e-filtros", "correia-dentada", "arrefecimento"],
  },
];

export const faixaPecas = "pecas-e-acessorios";

// Todo serviço cai em exatamente um grupo ou na faixa, e todo slug citado
// existe: se não, o build falha aqui em vez de a página sumir com a linha.
{
  const citados = [...gruposServico.flatMap((g) => g.servicos), faixaPecas];
  const slugs = servicos.map((s) => s.slug);
  const fora = slugs.filter((slug) => citados.filter((c) => c === slug).length !== 1);
  const orfaos = citados.filter((c) => !slugs.includes(c));
  if (fora.length || orfaos.length) {
    throw new Error(
      `oficina.ts: serviço fora de grupo/faixa ou repetido [${fora.join(", ")}]; slug inexistente [${orfaos.join(", ")}].`,
    );
  }
}

// Os 8 sintomas mais comuns (painel "Diagnóstico rápido"): um ou dois por
// área de serviço, com texto curto para caber em chip.
export const sintomas: Sintoma[] = [
  { texto: "Barulho ao frear", servicoSlug: "freios" },
  { texto: "Pedal de freio mole ou esponjoso", servicoSlug: "freios" },
  { texto: "Carro esquentando", servicoSlug: "arrefecimento" },
  { texto: "Volante puxando para um lado", servicoSlug: "suspensao-e-direcao" },
  { texto: "Pedal da embreagem duro ou muito alto", servicoSlug: "embreagem" },
  { texto: "Luz do óleo acesa no painel", servicoSlug: "troca-de-oleo-e-filtros" },
  { texto: "Barulho estranho no motor", servicoSlug: "diagnostico-de-ruidos-e-falhas" },
  { texto: "Não sei quando foi a última revisão do carro", servicoSlug: "revisao-preventiva" },
];

/** FAQ. Depende do nome de exibição, por isso é montada a partir dele. */
function perguntasFrequentes(nome: string): PerguntaFaq[] {
  return [
    {
      pergunta: "Preciso agendar horário ou posso levar o carro direto?",
      resposta:
        "O ideal é chamar no WhatsApp antes para combinar o melhor horário, mas também é possível levar o carro direto na oficina.",
    },
    {
      pergunta: "Vocês atendem carros de qualquer marca e modelo?",
      resposta:
        "Sim, a oficina atende veículos de passeio das principais marcas. Em caso de dúvida sobre o seu modelo específico, é só chamar no WhatsApp.",
    },
    {
      pergunta: "Como faço para saber o valor do serviço?",
      resposta:
        "O valor depende do veículo e do problema identificado. Envie uma mensagem contando o sintoma ou o serviço desejado para receber uma avaliação.",
    },
    {
      pergunta: "Vocês emitem nota fiscal?",
      resposta: `Sim, a ${nome} é uma empresa registrada e emite nota fiscal dos serviços realizados.`,
    },
    {
      pergunta: "Posso deixar o carro na oficina e buscar depois?",
      resposta:
        "Sim. Combine o horário de entrega e de retirada pelo WhatsApp ou por telefone para organizarmos o atendimento.",
    },
    {
      pergunta: "Vocês fazem diagnóstico antes de fechar o serviço?",
      resposta:
        "Sim. Sempre que o problema não é óbvio, o carro passa por um diagnóstico antes de qualquer serviço ser executado.",
    },
  ];
}

/** Passos do processo ("Como funciona"), na ordem em que acontecem. */
export const passos: Passo[] = [
  {
    titulo: "Chame no WhatsApp",
    texto: "Conte o sintoma ou o serviço que precisa. Se ajudar, mande foto ou áudio.",
  },
  {
    titulo: "Diagnóstico",
    texto: "O carro é avaliado para encontrar a causa do problema, não só o sintoma.",
  },
  {
    titulo: "Orçamento aprovado",
    texto: "Você recebe o orçamento e decide. O serviço só começa com a sua aprovação.",
  },
  {
    titulo: "Carro pronto",
    texto: "Você retira o carro no horário combinado, com o serviço explicado.",
  },
];

export const oficina: Oficina = {
  // Nome de exibição, com acento (a Receita grava sem diacrítico:
  // "SANDRO MECANICA"). Reverter é esta linha.
  nome: "Sandro Mecânica",
  desdeAno: 2018,
  cnpj: "32.222.519/0001-00",
  // Fonte do endereço: perfil do Google da oficina (perfil-google/ficha/ficha.json,
  // captura perfil-google/ficha/painel-02.png), por decisão do dono em 2026-09-19.
  // VERIFICAR: endereço tirado do perfil do Google; o CNPJ está na R. Pedro Apolo dos Santos, 66. O dono confirma antes de publicar.
  endereco: {
    logradouro: "R. Independência, 98",
    bairro: "São Luiz",
    cidade: "Sapiranga",
    uf: "RS",
    cep: "93806-342",
  },
  telefone: "(51) 98138-5899",
  // VERIFICAR: igual ao telefone por suposição; confirmar com o cliente
  // que esta linha tem WhatsApp.
  whatsapp: "(51) 98138-5899",
  // VERIFICAR: horário de atendimento não informado pelo cliente.
  horario: "",
  // Perfil da oficina no Google (place_id conferido em 2026-09-19,
  // perfil-google/ficha/ficha.json#L3). Sem endereço na URL, de propósito.
  linkGoogle: "https://www.google.com/maps/place/?q=place_id:ChIJYbFoyA8_GZURSSrKItDfN44",
  // VERIFICAR: domínio próprio não confirmado (sem ele não há canonical/og:url/og:image).
  dominio: "",
  // VERIFICAR: coordenadas não confirmadas; não inventar.
  geo: null,
  servicos,
  gruposServico,
  faixaPecas,
  sintomas,
  get faq() {
    return perguntasFrequentes(this.nome);
  },
  passos,
};

/**
 * Afirmações de negócio que a página pode fazer. A página só renderiza
 * afirmação desta lista: componente nenhum escreve afirmação à mão.
 * "Atendimento direto com o dono" NÃO está aqui: não tem fonte
 * (PENDENTE: o humano confirmar se quem atende é o Sandro).
 *
 * Fonte "receita": cadastro público do CNPJ, conferido em 2026-09-19
 * (BrasilAPI, espelho da base da Receita Federal): situação ATIVA, opção
 * pelo MEI e início de atividade em 11/12/2018, CNAE principal 4520-0/01,
 * CNAE secundário 4530-7/03. Os códigos CNAE ficam só neste comentário
 * (a página não exibe número fora da lista fechada). VERIFICAR: o endereço
 * do cadastro na Receita difere de `endereco`, que vem do perfil do Google
 * (decisão do dono em 2026-09-19) e segue valendo.
 */
export const afirmacoes = {
  // cliente
  notaFiscal: { texto: "Empresa registrada, emite nota fiscal", fonte: "cliente" },
  carrosDePasseio: { texto: "Carros de passeio das principais marcas", fonte: "cliente" },
  diagnosticoAntes: { texto: "Diagnóstico antes do serviço", fonte: "cliente" },
  diagnosticoQuandoNaoObvio: {
    texto: "Quando o problema não é óbvio, o carro é avaliado antes de qualquer serviço ser executado.",
    fonte: "cliente",
  },
  // receita
  meiDesde: { texto: "Microempreendedor individual (MEI) desde 11/12/2018", fonte: "receita" },
  cnpjAtivo: { texto: `CNPJ ${oficina.cnpj} ativo na Receita Federal`, fonte: "receita" },
  atividadePrincipal: {
    texto: "Atividade principal registrada: manutenção e reparação mecânica de veículos automotores",
    fonte: "receita",
  },
  atividadeSecundaria: {
    texto: "Atividade secundária registrada: comércio de peças e acessórios novos para veículos",
    fonte: "receita",
  },
  // cdc-art-40
  orcamentoAntes: { texto: "Orçamento antes do serviço", fonte: "cdc-art-40" },
  orcamentoVemAntes: { texto: "O orçamento vem antes de qualquer serviço.", fonte: "cdc-art-40" },
  orcamentoVoceDecide: {
    texto: "Antes de qualquer serviço, você recebe o orçamento e decide.",
    fonte: "cdc-art-40",
  },
  orcamentoEntaoServico: {
    texto: "Você conta o que o carro está fazendo, recebe o orçamento e só então o serviço começa.",
    fonte: "cdc-art-40",
  },
  orcamentoAprovado: {
    texto: "O serviço só começa depois que você conhece e aprova o orçamento.",
    fonte: "cdc-art-40",
  },
  // google: perfil-google/ficha/ficha.json#L12-13 (nota, total) e #L37-41
  // (trechos do resumo), grafia do Google sem correção e sem nome de cliente.
  googleNota: { texto: "4,6", fonte: "google", conferidaEm: "2026-09-19" },
  googleTotal: { texto: "45 avaliações", fonte: "google", conferidaEm: "2026-09-19" },
  googleTrecho1: {
    texto: "Ja trabalho a anos com o Sandro,ótimo profissional e preços justos.",
    fonte: "google",
    conferidaEm: "2026-09-19",
  },
  googleTrecho2: {
    texto: "Ótimo atendimento, rápidos, precisos, honestos e bom preço de Mão de Obra.",
    fonte: "google",
    conferidaEm: "2026-09-19",
  },
  googleTrecho3: {
    texto: "Muito bom o serviço feito no meu carro estão de parabéns.",
    fonte: "google",
    conferidaEm: "2026-09-19",
  },
} as const satisfies Record<string, Afirmacao>;

export default oficina;
