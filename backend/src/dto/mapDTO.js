// Mapeia o registo de permissões para o formato de resposta da API
export function mapRoleDTOResponse(data) {
  return {
    id: data.id,
    name: data.name,
    flow_order: data.flow_order,
  };
}

// Mapeia o registo de cliente para o formato de resposta da API
export function mapCustomerDTOResponse(data) {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    gender: data.gender,
    role_id: data.role_id,
    active: data.active,
    created_at: data.created_at,
  };
}

// Mapeia a conversa para o formato de resposta da API
export function mapConversationDTOResponse(data) {
  return {
    id: data.id,
    customer_id: data.customer_id,
    title: data.title,
    created_at: data.created_at,
  };
}

// Mapeia a mensagem de histórico de chat para o formato de resposta da API
export function mapChatHistoryDTOResponse(data) {
  return {
    id: data.id,
    conversation_id: data.conversation_id,
    role_id: data.role_id,
    content: data.content,
    sent_at: data.sent_at,
  };
}

// Mapeia a notificação para o formato de resposta da API
export function mapNotificationDTOResponse(data) {
  return {
    id: data.id,
    customer_id: data.customer_id,
    title: data.title,
    message: data.message,
    is_read: data.is_read,
    sent_at: data.sent_at,
  };
}

// Mapeia a mesa para o formato de resposta da API
export function mapTableDTOResponse(data) {
  return {
    id: data.id,
    table_number: data.table_number,
    capacity: data.capacity,
    status: data.status,
  };
}

// Mapeia a itens do menu para o formato de resposta da API
export function mapItemDTOResponse(data) {
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    price: data.price,
    is_active: data.is_active,
  };
}

// Mapeia ingredientes do catalogo para o formato de resposta da API
export function mapIngredientDTOResponse(data) {
  return {
    id: data.id,
    name: data.name,
    measurement_unit: data.measurement_unit,
  };
}

// Mapeia o stock para o formato de resposta da API
export function mapStockDTOResponse(data) {
  return {
    id: data.id,
    ingredient_id: data.ingredient_id,
    available_quantity: data.available_quantity,
    unit_cost: data.unit_cost,
    updated_at: data.updated_at,
  };
}

// Mapeia a ficha técnica para o formato de resposta da API
export function mapRecipeItemDTOResponse(data) {
  return {
    id: data.id,
    item_id: data.item_id,
    ingredient_id: data.ingredient_id,
    required_quantity: data.required_quantity,
  };
}

// Mapeia o pedido para o formato de resposta da API
export function mapOrderDTOResponse(data) {
  return {
    id: data.id,
    customer_id: data.customer_id,
    table_id: data.table_id,
    service_type: data.service_type,
    allergy_restrictions: data.allergy_restrictions,
    kitchen_sequence_json: data.kitchen_sequence_json,
    order_status: data.order_status,
    created_at: data.created_at,
  };
}

// Mapeia os itens do pedido para o formato de resposta da API
export function mapOrderitemDTOResponse(data) {
  return {
    id: data.id,
    order_id: data.order_id,
    item_id: data.item_id,
    quantity: data.quantity,
  };
}

// Mapeia a fatura para o formato de resposta da API
export function mapInvoiceDTOResponse(data) {
  return {
    id: data.id,
    order_id: data.order_id,
    subtotal_amount: data.subtotal_amount,
    tax_amount: data.tax_amount,
    total_amount: data.total_amount,
    profit_margin: data.profit_margin,
    issued_at: data.issued_at,
  };
}

// Mapeia o pagamento para o formato de resposta da API
export function mapPaymentDTOResponse(data) {
  return {
    id: data.id,
    invoice_id: data.invoice_id,
    customer_id: data.customer_id,
    amount: data.amount,
    payment_method: data.payment_method,
    payment_status: data.payment_status,
    processed_at: data.processed_at,
  };
}

// Mapeia o log para o formato de resposta da API
export function mapLogDTOResponse(data) {
  return {
    id: data.id,
    order_id: data.order_id,
    agent_name: data.agent_name,
    status: data.status,
    input_payload: data.input_payload,
    output_payload: data.output_payload,
    created_at: data.created_at,
  };
}
