/**
 * POST /orders/pipeline
 *
 * Recebe o pedido em linguagem natural, executa o pipeline de 3 agentes
 * (Maître → Chefe → Gerente) e persiste os resultados na BD MySQL.
 *
 * O Maître interpreta a mensagem, selecciona a mesa (Dine-In) e mapeia
 * os itens ao menu activo — o cliente NÃO escolhe mesa nem envia item_ids.
 *
 * Corpo esperado:
 * {
 *   customer_id:    number,  // obrigatório
 *   message:        string,  // obrigatório — pedido em linguagem natural
 *                            // ex: "eu e a minha esposa queremos jantar, esparguete e hamburguer"
 *   payment_method: string,  // "MB Way" | "Cash" | "Card" (default: "Pending")
 *   tax_rate:       number,  // 0.13 (default) | 0.23 | 0.06
 *   discount:       number,  // 0.10 = 10% (default: 0)
 *   discount_type:  "percent" | "fixed"
 * }
 */

import { runOrderPipeline } from '../genai/orchestrations/index.js';
import {
  createOrder,
  createOrderItem,
  createInvoice,
  createPayment,
  updateTableStatus,
} from '../services/index.js';

export async function processOrderPipeline(req, res) {
  const orderData = req.body;

  // ── Validação dos campos obrigatórios ────────────────────────────────────────
  if (!orderData.customer_id) {
    return res.status(400).json({ success: false, error: 'customer_id é obrigatório.' });
  }
  if (!orderData.message || !String(orderData.message).trim()) {
    return res.status(400).json({ success: false, error: 'message é obrigatório — descreva o seu pedido em linguagem natural.' });
  }

  try {
    const msgPreview = String(orderData.message).substring(0, 80);
    console.log(`[Pipeline] A iniciar para customer_id=${orderData.customer_id} — "${msgPreview}"`);

    // ── Pipeline dos 3 agentes: Maître → Chefe → Gerente ─────────────────────
    const { validated, sequenced, financials } = await runOrderPipeline(orderData);

    console.log(`[Pipeline] Agentes concluídos — total calculado: €${financials.total}`);

    // ── Extrair e normalizar campos do pipeline ───────────────────────────────
    const customerId = Number(validated.customer_id ?? orderData.customer_id);
    const tableId    = validated.table_id ?? null;   // atribuído pelo Maître, nunca pelo cliente
    const kitchenSeq = sequenced.kitchen_sequence ?? sequenced.kitchenSequence ?? [];
    const items      = validated.items ?? orderData.items;

    // Normaliza service_type para os valores exactos do ENUM MySQL ('Dine-In' | 'Takeaway')
    const rawService = String(validated.service_type ?? '');
    const serviceType = /take.?away|para.?levar|para\s?fora|to.?go/i.test(rawService)
      ? 'Takeaway'
      : 'Dine-In';

    // ── 1. Criar pedido ───────────────────────────────────────────────────────
    const order = await createOrder({
      customer_id:           customerId,
      table_id:              tableId ? Number(tableId) : null,
      service_type:          serviceType,
      allergy_restrictions:  validated.allergy_restrictions ?? orderData.allergy_restrictions ?? null,
      kitchen_sequence_json: kitchenSeq,
      order_status:          'Pending in Kitchen',
    });

    // ── 2. Criar itens do pedido (em paralelo) ────────────────────────────────
    await Promise.all(
      items.map((item) =>
        createOrderItem({
          order_id: order.id,
          item_id:  Number(item.item_id),
          quantity: Number(item.quantity ?? 1),
        }),
      ),
    );

    // ── 3. Criar fatura com totais calculados em JS (nunca pelo modelo) ───────
    const invoice = await createInvoice({
      order_id:        order.id,
      subtotal_amount: financials.subtotal,
      tax_amount:      financials.taxAmount,
      total_amount:    financials.total,
      profit_margin:   financials.profitMargin ?? 0,
    });

    // ── 4. Criar registo de pagamento (pendente) ──────────────────────────────
    const payment = await createPayment({
      invoice_id:     invoice.id,
      customer_id:    customerId,
      amount:         financials.total,
      payment_method: orderData.payment_method ?? 'Pending',
      payment_status: 'Pending',
    });

    // ── 5. Marcar mesa como Occupied (apenas Dine-In) ─────────────────────────
    if (tableId && serviceType === 'Dine-In') {
      await updateTableStatus(Number(tableId), 'Occupied');
    }

    console.log(`[Pipeline] Concluído — order_id=${order.id}, invoice_id=${invoice.id}, payment_id=${payment.id}`);

    // ── Resposta ──────────────────────────────────────────────────────────────
    res.status(201).json({
      success:  true,
      order_id: order.id,
      order,
      invoice,
      payment,
      financials: {
        subtotal:      financials.subtotal,
        discount:      financials.discountAmount ?? 0,
        taxableAmount: financials.taxableAmount,
        taxRate:       financials.taxRate,
        taxAmount:     financials.taxAmount,
        total:         financials.total,
        profitMargin:  financials.profitMargin ?? 0,
      },
      pipeline: {
        validated,
        sequenced,
      },
    });

  } catch (err) {
    console.error('[Pipeline] Erro:', err.message);
    res.status(500).json({
      success: false,
      error:   err.message,
      stage:   err.stage ?? 'unknown',
    });
  }
}
