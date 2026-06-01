// Helper to synthesize a user-friendly message when the model returns only
// function results and no textual reply. Centralised so other processors can reuse it.
export function synthesizeFallbackMessage(allChunks = [], allResults = []) {
  const text = (Array.isArray(allChunks) ? allChunks.join('') : String(allChunks || ''));
  if (text && text.trim()) return text;

  if (!Array.isArray(allResults) || allResults.length === 0) return '';

  const last = allResults[allResults.length - 1];
  try {
    const name = last.name;
    const raw = last.hasOwnProperty('result') ? last.result : undefined;

    if (name === 'get_table') {
      const t = raw;
      if (!t) return 'Não encontrei nenhuma mesa disponível para esse número de pessoas.';
      return `Encontrei a mesa ${t.table_number} (capacidade ${t.capacity}) — estado: ${t.status}. Deseja que eu a reserve ou a ocupe?`;
    }

    if (name === 'create_reservation') {
      if (raw?.id) return `Reserva criada com sucesso (ID ${raw.id}). Deseja receber confirmação por SMS?`;
      return 'Reserva processada. Não consegui obter o ID da reserva, quer que verifique?';
    }

    if (name === 'cancel_reservation') {
      if (raw?.success) return 'Reserva cancelada com sucesso. Precisa de mais alguma coisa?';
      return 'Tentei cancelar a reserva mas não foi possível — quer que verifique os detalhes?';
    }

    if (name === 'update_table_status') {
      const ok = typeof raw === 'number' ? raw > 0 : raw?.success === true;
      if (ok) return 'Estado da mesa actualizado com sucesso.';
      return 'Não foi possível actualizar o estado da mesa.';
    }

    if (name === 'get_customer') {
      if (!raw) return 'Não encontrei esse cliente na base de dados.';
      return `Identifiquei o cliente: ${raw.name ?? 'Cliente sem nome'} (ID ${raw.id}). Como deseja proceder?`;
    }

    if (name === 'create_order') {
      if (raw?.id) return `Pedido criado com sucesso (ID ${raw.id}). Deseja acrescentar mais itens?`;
      return 'Pedido processado, mas não foi possível obter o ID do pedido.';
    }

    if (name === 'create_order_item') {
      if (raw?.id) return 'Item adicionado ao pedido com sucesso.';
      return 'Não foi possível adicionar o item ao pedido.';
    }

    if (name === 'calculate_invoice_totals') {
      if (raw?.total_amount != null) return `Total calculado: ${raw.total_amount}. Deseja que eu crie a fatura?`;
      return 'Não consegui calcular os totais da fatura.';
    }

    if (name === 'create_invoice') {
      if (raw?.id) return `Fatura criada (ID ${raw.id}). Deseja processar o pagamento?`;
      return 'Fatura criada, mas não foi possível obter o ID.';
    }

    if (name === 'create_payment') {
      if (raw?.id) return 'Pagamento registado com sucesso.';
      return 'Tentativa de pagamento registada, verifique os detalhes.';
    }

    if (name === 'get_item') {
      if (!raw) return 'Não encontrei o item pedido no menu.';
      return `Encontrei o item: ${raw.name} — ${raw.price}€. Deseja adicionar ao pedido?`;
    }

    if (name === 'get_items') {
      if (!Array.isArray(raw) || raw.length === 0) return 'Não encontrei itens correspondentes à pesquisa.';
      const count = raw.length;
      return `Foram encontrados ${count} itens. Posso mostrar os primeiros ou filtrar por categoria.`;
    }

    if (name === 'get_reservation') {
      if (!raw) return 'Não existe nenhuma reserva activa para esse cliente.';
      return `Reserva encontrada (ID ${raw.id}) para ${raw.party_size} pessoas em ${raw.reservation_date}. Deseja cancelar ou alterar?`;
    }

    return 'Operação concluída. Em que mais posso ajudar?';
  } catch (e) {
    return 'Operação concluída. Em que mais posso ajudar?';
  }
}
