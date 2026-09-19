// Links de contato da oficina, DERIVADOS de src/data/oficina.ts.
// Nenhum número, endereço ou nome escrito aqui: trocar o dado em
// oficina.ts troca todos os links (tel:, wa.me, mapa, Como chegar, Waze).
import oficina from "@/data/oficina";

/** "(DD) NNNNN-NNNN" → "55DDNNNNNNNNN" (E.164 sem "+", DDI 55). */
function e164(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  return digitos.startsWith("55") && digitos.length > 11 ? digitos : `55${digitos}`;
}

/** Endereço completo numa linha, para links de mapa e textos alternativos. */
export const enderecoEmLinha = (() => {
  const { logradouro, bairro, cidade, uf, cep } = oficina.endereco;
  return `${logradouro}, ${bairro}, ${cidade} - ${uf}, ${cep}`;
})();

/** Monta o link do WhatsApp com uma mensagem pronta já preenchida. */
export function whatsapp(texto: string): string {
  return `https://wa.me/${e164(oficina.whatsapp)}?text=${encodeURIComponent(texto)}`;
}

/** Link de ligação direta (tel:). */
export const tel = `tel:+${e164(oficina.telefone)}`;

/** Link do Google Maps com o endereço da oficina, pronto para "como chegar". */
export const comoChegar = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  enderecoEmLinha,
)}`;

/** Link do Waze com o endereço da oficina. */
export const waze = `https://waze.com/ul?q=${encodeURIComponent(enderecoEmLinha)}&navigate=yes`;

/** src do mapa incorporado (iframe) com o endereço da oficina. */
export const mapaIncorporado = `https://www.google.com/maps?q=${encodeURIComponent(
  enderecoEmLinha,
)}&output=embed`;

/** Mensagens prontas para o WhatsApp, de acordo com o contexto do clique. */
export const mensagens = {
  /** Mensagem genérica, sem contexto específico de serviço ou sintoma. */
  geral(): string {
    return `Olá! Vim pelo site da ${oficina.nome} e gostaria de mais informações.`;
  },
  /** Mensagem partindo do interesse em um serviço específico. */
  servico(nomeServico: string): string {
    return `Olá! Vim pelo site da ${oficina.nome} e gostaria de saber mais sobre: ${nomeServico}.`;
  },
  /** Mensagem partindo de um sintoma relatado, com o serviço provável se houver. */
  sintoma(textoSintoma: string, nomeServico?: string): string {
    return (
      `Olá! Vim pelo site da ${oficina.nome}. Meu carro está com o seguinte problema: ${textoSintoma}.` +
      (nomeServico ? ` Acho que é algo de ${nomeServico}.` : "") +
      " Podem me ajudar?"
    );
  },
};

/** Atalho: link do WhatsApp já com a mensagem geral pronta. */
export function whatsappGeral(): string {
  return whatsapp(mensagens.geral());
}

/** Atalho: link do WhatsApp com mensagem sobre um serviço específico. */
export function whatsappServico(nomeServico: string): string {
  return whatsapp(mensagens.servico(nomeServico));
}

/** Atalho: link do WhatsApp com mensagem sobre um sintoma relatado. */
export function whatsappSintoma(textoSintoma: string, nomeServico?: string): string {
  return whatsapp(mensagens.sintoma(textoSintoma, nomeServico));
}
