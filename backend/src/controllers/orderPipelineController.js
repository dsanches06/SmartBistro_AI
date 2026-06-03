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
 *   customer_name:    string,  // obrigatório — primeiro nome do cliente
 *   customer_surname: string,  // opcional — apelido do cliente
 *   phone:            string,  // opcional — telefone (único por cliente)
 *   message:          string,  // obrigatório — pedido em linguagem natural
 *                              // ex: "eu e a minha esposa queremos jantar, esparguete e hamburguer"
 *   payment_method:   string,  // "MB Way" | "Cash" | "Card" (default: "MB Way")
 *   tax_rate:         number,  // 0.13 (default) | 0.23 | 0.06
 *   discount:         number,  // 0.10 = 10% (default: 0)
 *   discount_type:    "percent" | "fixed"
 * }
 */

import { runOrderPipeline } from '../genai/orchestrations/index.js';
import {
  findOrCreateCustomer,
  createOrder,
  createOrderItem,
  createInvoice,
  createPayment,
  updateTableStatus,
} from '../services/index.js';
import { classifyGroqError } from '../utils/index.js';

export async function processOrderPipeline(req, res) {
  const orderData = req.body;

  // ── Validação dos campos obrigatórios ────────────────────────────────────────
  if (!orderData.customer_name || !String(orderData.customer_name).trim()) {
    return res.status(400).json({ success: false, error: 'customer_name é obrigatório.' });
  }
  if (!orderData.message || !String(orderData.message).trim()) {
    return res.status(400).json({ success: false, error: 'message é obrigatório — descreva o seu pedido em linguagem natural.' });
  }

  try {
    const customerFull = [orderData.customer_name, orderData.customer_surname].filter(Boolean).join(' ');
    const msgPreview = String(orderData.message).substring(0, 80);
    console.log(`[Pipeline] A iniciar para "${customerFull}" — "${msgPreview}"`);

    // ── Pipeline dos 3 agentes: Maître → Chefe → Gerente ─────────────────────
    const { validated, sequenced, financials, final } = await runOrderPipeline(orderData);

    console.log(`[Pipeline] Agentes concluídos — total calculado: €${financials.total}`);

    // ── Extrair e normalizar campos do pipeline ───────────────────────────────
    const customerName    = String(orderData.customer_name ?? '').trim();
    const customerSurname = String(orderData.customer_surname ?? '').trim() || null;
    const customerPhone   = orderData.phone ? String(orderData.phone).trim() : null;
    let tableId           = validated.table_id ?? null;   // atribuído pelo Maître, nunca pelo cliente

    // ── Encontrar ou criar cliente (garante unicidade de nome e telefone) ─────
    const fullName = [customerName, customerSurname].filter(Boolean).join(' ');
    const customer = await findOrCreateCustomer(fullName, customerPhone);
    console.log(`[Pipeline] Cliente: "${customer.name}" (id=${customer.id}, novo=${!customer.created_at || Date.now() - new Date(customer.created_at).getTime() < 5000})`);
    const kitchenSeq = sequenced.kitchen_sequence ?? sequenced.kitchenSequence ?? [];

    const stockStatus = String(sequenced.stock_status ?? sequenced.stockStatus ?? 'ok').toLowerCase();
    const stockAlerts = sequenced.stock_alerts ?? sequenced.stockAlerts ?? [];
    const unavailableItems = Array.isArray(sequenced.items)
      ? sequenced.items.filter((item) => item?.unavailable === true || String(item?.unavailable).toLowerCase() === 'true')
      : [];

    if (unavailableItems.length > 0) {
      const responsePayload = {
        success: false,
        error: 'Stock insuficiente para preparar este pedido. Por favor escolha outro prato ou aguarde reposição.',
        stage: 'stock_validation',
        stock_status: stockStatus,
        stock_alerts: stockAlerts,
        pipeline: {
          validated,
          sequenced,
        },
      };

      responsePayload.unavailable_items = unavailableItems;
      return res.status(400).json(responsePayload);
    }

    if (!final || final.success !== true) {
      return res.status(500).json({
        success: false,
        error: 'Gerente devolveu um resultado inválido ou incompleto.',
        stage: 'manager_validation',
        pipeline: {
          validated,
          sequenced,
          final,
        },
      });
    }

    const pipelineItems = Array.isArray(validated.items)
      ? validated.items
      : Array.isArray(orderData.items)
      ? orderData.items
      : [];

    if (!pipelineItems.length) {
      return res.status(400).json({
        success: false,
        error: 'O pedido não contém itens válidos. O Maître deve mapear os itens do menu antes de criar o pedido.',
        stage: 'pipeline_validation',
        pipeline: {
          validated,
          sequenced,
          final,
        },
      });
    }

    const normalizedItems = pipelineItems.map((item) => ({
      item_id: Number(item.item_id ?? item.id ?? item.itemId),
      quantity: Number(item.quantity ?? item.qty ?? 1),
    }));

    const invalidItem = normalizedItems.find(
      (item) => !Number.isFinite(item.item_id) || item.item_id <= 0,
    );
    if (invalidItem) {
      return res.status(400).json({
        success: false,
        error: 'O pedido contém itens sem item_id válido. Verifique a resposta do pipeline do Maître/Chefe.',
        stage: 'pipeline_validation',
        pipeline: {
          validated,
          sequenced,
          final,
        },
      });
    }

    // Normaliza service_type para os valores exactos do ENUM MySQL ('Table' | 'Takeaway')
    const rawService = String(validated.service_type ?? '');
    const serviceType = /take.?away|para.?levar|para\s?fora|to.?go/i.test(rawService)
      ? 'Takeaway'
      : 'Table';

    if (serviceType === 'Table') {
      const resolvedTableId = Number(tableId ?? NaN);
      if (!Number.isFinite(resolvedTableId) || resolvedTableId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Pedido de serviço de mesa sem mesa atribuída. O Maître deve seleccionar uma mesa disponível.',
          stage: 'table_assignment',
          pipeline: {
            validated,
            sequenced,
            final,
          },
        });
      }
      tableId = resolvedTableId;
    } else {
      tableId = null;
    }

    // ── 1. Criar pedido ───────────────────────────────────────────────────────
    const order = await createOrder({
      customer_id:           customer.id,
      customer_name:         customer.name,
      table_id:              tableId ? Number(tableId) : null,
      service_type:          serviceType,
      allergy_restrictions:  validated.allergy_restrictions ?? orderData.allergy_restrictions ?? null,
      kitchen_sequence_json: kitchenSeq,
      order_status:          'Pending',
    });

    // ── 2. Criar itens do pedido (em paralelo) ────────────────────────────────
    await Promise.all(
      normalizedItems.map((item) =>
        createOrderItem({
          order_id: order.id,
          item_id:  item.item_id,
          quantity: item.quantity,
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
    // Normaliza payment_method para o ENUM MySQL: 'MB Way' | 'Multibanco' | 'Credit Card' | 'Cash'
    const rawPayment  = String(orderData.payment_method ?? '');
    const paymentMethod =
      /mb.?way/i.test(rawPayment)                                    ? 'MB Way' :
      /multibanco|atm/i.test(rawPayment)                             ? 'Multibanco' :
      /credit.?card|card|cartão|visa|mastercard/i.test(rawPayment)   ? 'Credit Card' :
      /cash|dinheiro|numerário/i.test(rawPayment)                    ? 'Cash' :
      'MB Way'; // default — a definir no momento do pagamento

    const payment = await createPayment({
      invoice_id:     invoice.id,
      customer_id:    customer.id,
      amount:         financials.total,
      payment_method: paymentMethod,
      payment_status: 'Pending',
    });

    // ── 5. Marcar mesa como Occupied (apenas Table/Dine-In) ──────────────────
    if (tableId && serviceType === 'Table') {
      await updateTableStatus(Number(tableId), 'Occupied');
    }

    console.log(`[Pipeline] Concluído — order_id=${order.id}, invoice_id=${invoice.id}, payment_id=${payment.id}`);

    // ── Resposta ──────────────────────────────────────────────────────────────
    res.status(201).json({
      success:      true,
      order_id:     order.id,
      customer_id:  customer.id,
      customer:     { id: customer.id, name: customer.name, phone: customer.phone ?? null },
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
        final,
      },
    });

  } catch (err) {
    const msg = String(err?.message ?? 'Erro desconhecido');
    console.error('[Pipeline] Erro:', msg, err);

    // If there's an underlying SDK/error from the AI provider, classify it and return friendly message
    try {
      const aiSource = err?.cause ?? err?.details?.sdkError ?? err;
      const classification = classifyGroqError(aiSource);
      if (classification && classification.type && classification.type !== 'UNKNOWN') {
        switch (classification.type) {
          case 'SERVICE_DOWN':
            return res.status(503).json({ success: false, error: classification.userMessage, stage: 'external_ai', details: err?.details ?? undefined });
          case 'RATE_LIMIT':
            return res.status(429).json({ success: false, error: classification.userMessage, stage: 'external_ai', details: err?.details ?? undefined });
          case 'AUTH_ERROR':
            return res.status(502).json({ success: false, error: classification.userMessage, stage: 'external_ai', details: err?.details ?? undefined });
          case 'NETWORK_ERROR':
            return res.status(502).json({ success: false, error: classification.userMessage, stage: 'external_ai', details: err?.details ?? undefined });
          case 'INVALID_REQUEST':
            return res.status(400).json({ success: false, error: classification.userMessage, stage: 'external_ai', details: err?.details ?? undefined });
          default:
            break;
        }
      }
    } catch (e) {
      // ignore classification errors and continue to structured handling
      console.warn('[Pipeline] classifyGroqError failed', e && e.message);
    }

    // If the pipeline threw a structured error, prefer its properties
    const stage = err?.stage ?? err?.stageName ?? undefined;
    const code = err?.code ?? undefined;
    const details = err?.details ?? undefined;

    // Maître validation: itens inválidos
    if (stage === 'maitre_validation' || code === 'MAITRE_INVALID_ITEMS') {
      return res.status(400).json({
        success: false,
        error: 'Itens inválidos no pedido. Verifique os nomes dos pratos ou o menu activo.',
        stage: 'maitre_validation',
        details,
      });
    }

    // Retry failures from Maître/Chefe after stock feedback
    if (stage === 'maitre_retry' || stage === 'chef_retry' || code === 'MAITRE_RETRY_UNCHANGED' || code === 'CHEF_RETRY_STILL_UNAVAILABLE') {
      return res.status(409).json({
        success: false,
        error: 'Não foi possível ajustar o pedido após alerta de stock. Tente outro pedido ou contacte o serviço.',
        stage: 'stock_retry_failed',
        details,
      });
    }

    // Agent validation / schema errors (zod)
    if (stage === 'agent_validation' || code === 'AGENT_VALIDATION') {
      return res.status(502).json({
        success: false,
        error: 'Resposta inválida de um agente externo (LLM).',
        stage: 'agent_validation',
        details,
      });
    }

    // JSON extraction errors
    if (stage === 'json_extraction' || code === 'JSON_EXTRACT') {
      return res.status(502).json({
        success: false,
        error: 'Não foi possível interpretar a resposta do agente.',
        stage: 'json_extraction',
        details,
      });
    }

    // Stock reported by Chef but handled earlier — fallback
    if (String(msg).toLowerCase().includes('stock') || stage === 'stock_validation') {
      return res.status(400).json({
        success: false,
        error: 'Problema de stock detectado para o pedido.',
        stage: 'stock_validation',
        details,
      });
    }

    // Default: internal server error
    res.status(500).json({
      success: false,
      error: msg,
      stage: stage ?? 'unknown',
      details,
    });
  }
}
