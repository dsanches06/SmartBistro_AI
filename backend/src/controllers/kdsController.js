import { ChefAgent } from '../genai/agents/index.js';
import { buildChefMessage } from '../genai/agents/chef/chefMessages.js';
import { ChefResponseSchema } from '../genai/agents/chef/chefSchemas.js';
import { deriveChefStockMetrics } from '../genai/agents/chef/chefHelpers.js';
import { validateAgentOutput, extractJSON } from '../genai/helpers/index.js';
import {
  getOrderById,
  updateOrder,
  getItemsByOrderId,
  getItemById,
  getActiveItems,
} from '../services/index.js';

/**
 * POST /orders/:id/chef-start
 * O Chef AI analisa o pedido Pending, cria a sequência de preparação,
 * verifica stock e move o pedido para "In Preparation".
 */
export async function chefStartOrder(req, res) {
  const orderId = Number(req.params.id);

  if (!Number.isFinite(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, error: 'ID de pedido inválido.' });
  }

  try {
    // 1. Verifica se o pedido existe e está Pending
    const order = await getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, error: `Pedido #${orderId} não encontrado.` });
    }
    if (order.order_status !== 'Pending') {
      return res.status(400).json({
        success:      false,
        error:        `Pedido já em estado "${order.order_status}". Só pedidos Pending podem ser iniciados.`,
        order_status: order.order_status,
      });
    }

    // 2. Recolhe itens do pedido + detalhes do menu activo
    const [orderItems, menuItems] = await Promise.all([
      getItemsByOrderId(orderId),
      getActiveItems(),
    ]);

    const menuMap = new Map(menuItems.map(m => [m.id, m]));

    const itemsWithDetails = await Promise.all(
      orderItems.map(async (oi) => {
        const item = menuMap.get(oi.item_id) ?? await getItemById(oi.item_id);
        return {
          item_id:  oi.item_id,
          name:     item?.name    ?? `Item ${oi.item_id}`,
          quantity: oi.quantity   ?? 1,
          price:    Number(item?.price ?? 0),
        };
      }),
    );

    if (!itemsWithDetails.length) {
      return res.status(400).json({ success: false, error: `Pedido #${orderId} não tem itens.` });
    }

    // 3. Constrói o input para o Chef
    const validated = {
      customer_name: order.customer_name ?? 'Cliente',
      table_id:      order.table_id,
      service_type:  order.service_type ?? 'Table',
      items:         itemsWithDetails,
    };

    // 4. Invoca o Chef AI
    console.log(`[KDS Chef] A processar pedido #${orderId} (${itemsWithDetails.length} itens)...`);
    const chef          = new ChefAgent();
    const sequencedText = await chef.sendMessage(buildChefMessage(validated, menuItems));
    const sequenced     = validateAgentOutput(
      ChefResponseSchema,
      extractJSON(sequencedText, 'Chef'),
      'Chef',
    );

    const { unavailableItems, stockStatus, stockAlerts } = deriveChefStockMetrics(sequenced);
    const kitchenSeq = sequenced.kitchen_sequence ?? [];
    // Clamp: máximo 120s para simulação (Chef tende a retornar tempos reais de cozinha)
    const estimatedSeconds = Math.min(Math.max(Number(sequenced.estimated_seconds ?? 30), 10), 120);

    // 5. Actualiza pedido → In Preparation + sequência de cozinha
    await updateOrder(orderId, {
      order_status:          'In Preparation',
      kitchen_sequence_json: JSON.stringify(kitchenSeq),
    });

    console.log(`[KDS Chef] Pedido #${orderId} → Em Preparação | tempo: ${estimatedSeconds}s | stock: ${stockStatus}`);

    return res.json({
      success:            true,
      order_id:           orderId,
      estimated_seconds:  estimatedSeconds,
      kitchen_sequence:  kitchenSeq,
      sections:          sequenced.sections ?? {},
      stock_status:      stockStatus,
      stock_alerts:      stockAlerts,
      unavailable_items: unavailableItems,
      notes:             sequenced.notes ?? '',
    });

  } catch (err) {
    console.error(`[KDS Chef] Erro no pedido #${orderId}:`, err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
