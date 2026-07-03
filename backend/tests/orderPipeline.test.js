import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({
  db:      { query: vi.fn() },
  pgPool:  {},
  mysqlDb: {},
}))

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn(), verify: vi.fn() },
}))

vi.mock('../src/genai/orchestrations/index.js', () => ({
  runOrderPipeline:  vi.fn(),
  processChatStream: vi.fn(),
  clearSession:      vi.fn(),
}))

vi.mock('../src/utils/index.js', () => ({
  classifyClaudeError:  vi.fn().mockReturnValue(null),
  ROLE_USER:            2,
  ROLE_ASSISTANT:       3,
  writeSseError:        vi.fn(),
  calculateInvoiceTotals: vi.fn().mockReturnValue({ subtotal: 10, taxAmount: 1.3, taxableAmount: 10, total: 11.3, taxRate: 0.13, discountAmount: 0 }),
  // pipelineError utils
  createPipelineError: vi.fn(),
}))

vi.mock('../src/services/index.js', () => ({
  findOrCreateUser: vi.fn(),
  createOrder:          vi.fn(),
  createOrderItem:      vi.fn(),
  createInvoice:        vi.fn(),
  createPayment:        vi.fn(),
  updateTableStatus:    vi.fn(),
  // outros usados por middlewares/controllers carregados pelo app
  getAllOrders:          vi.fn(),
  getPendingOrders:      vi.fn(),
  getOrderById:          vi.fn(),
  getUserById:       vi.fn(),
  getTableById:          vi.fn(),
  getItemById:           vi.fn(),
  getIngredientById:     vi.fn(),
  getStockById:          vi.fn(),
  getOrderItemById:      vi.fn(),
  getInvoiceById:        vi.fn(),
  getPaymentById:        vi.fn(),
  getReservationById:    vi.fn(),
  getNotificationById:   vi.fn(),
  createConversation:    vi.fn(),
  createChatHistory:     vi.fn(),
}))

import app from '../src/app.js'
import * as orchestrations from '../src/genai/orchestrations/index.js'
import * as services from '../src/services/index.js'

// Resultado válido de pipeline para reutilizar nos testes de sucesso
const validPipelineResult = {
  validated: {
    service_type:         'Table',
    table_id:             2,
    items:                [{ item_id: 1, quantity: 2, price: 10 }],
    allergy_restrictions: null,
  },
  sequenced: {
    kitchen_sequence: [{ step: 1, item: 'Hamburguer' }],
    stock_status:     'ok',
    stock_alerts:     [],
    items:            [],
  },
  financials: {
    subtotal:       20,
    taxAmount:      2.6,
    taxableAmount:  20,
    total:          22.6,
    taxRate:        0.13,
    profitMargin:   5,
    discountAmount: 0,
  },
  final: { success: true },
}

beforeEach(() => vi.clearAllMocks())

// ─── Validação de campos obrigatórios ─────────────────────────────────────────

describe('POST /orders/pipeline — validação', () => {
  it('devolve 400 se customer_name estiver em falta', async () => {
    const res = await request(app)
      .post('/orders/pipeline')
      .send({ message: 'Quero uma pizza' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toMatch(/customer_name/)
  })

  it('devolve 400 se customer_name for string vazia', async () => {
    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: '   ', message: 'Quero uma pizza' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/customer_name/)
  })

  it('devolve 400 se message estiver em falta', async () => {
    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João' })
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toMatch(/message/)
  })

  it('devolve 400 se message for string vazia', async () => {
    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: '' })
    expect(res.status).toBe(400)
  })
})

// ─── Fluxo completo com sucesso ───────────────────────────────────────────────

describe('POST /orders/pipeline — sucesso', () => {
  it('cria pedido de mesa e devolve 201 com todas as entidades', async () => {
    orchestrations.runOrderPipeline.mockResolvedValue(validPipelineResult)
    services.findOrCreateUser.mockResolvedValue({ id: 5, name: 'João Teste', phone: null, created_at: new Date(Date.now() - 10000) })
    services.createOrder.mockResolvedValue({ id: 10, service_type: 'Table', user_id: 5 })
    services.createOrderItem.mockResolvedValue({})
    services.createInvoice.mockResolvedValue({ id: 20, total_amount: 22.6 })
    services.createPayment.mockResolvedValue({ id: 30, payment_status: 'Pending' })
    services.updateTableStatus.mockResolvedValue(1)

    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: 'Quero uma pizza e um sumo', payment_method: 'MB Way' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body).toHaveProperty('order_id', 10)
    expect(res.body).toHaveProperty('user_id', 5)
    expect(res.body).toHaveProperty('invoice')
    expect(res.body).toHaveProperty('payment')
    expect(res.body).toHaveProperty('financials')
  })

  it('marca a mesa como Occupied quando service_type é Table', async () => {
    orchestrations.runOrderPipeline.mockResolvedValue(validPipelineResult)
    services.findOrCreateUser.mockResolvedValue({ id: 5, name: 'João', phone: null, created_at: new Date() })
    services.createOrder.mockResolvedValue({ id: 11 })
    services.createOrderItem.mockResolvedValue({})
    services.createInvoice.mockResolvedValue({ id: 21 })
    services.createPayment.mockResolvedValue({ id: 31 })
    services.updateTableStatus.mockResolvedValue(1)

    await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: 'Mesa para dois' })

    expect(services.updateTableStatus).toHaveBeenCalledWith(2, 'Occupied')
  })

  it('normaliza payment_method "Card" para "Credit Card"', async () => {
    orchestrations.runOrderPipeline.mockResolvedValue(validPipelineResult)
    services.findOrCreateUser.mockResolvedValue({ id: 5, name: 'Maria', phone: null, created_at: new Date() })
    services.createOrder.mockResolvedValue({ id: 12 })
    services.createOrderItem.mockResolvedValue({})
    services.createInvoice.mockResolvedValue({ id: 22 })
    services.createPayment.mockResolvedValue({ id: 32 })
    services.updateTableStatus.mockResolvedValue(1)

    await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'Maria', message: 'Quero um sumo', payment_method: 'Card' })

    expect(services.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ payment_method: 'Credit Card' }),
    )
  })

  it('cria pedido Takeaway sem atribuir mesa', async () => {
    const takeawayResult = {
      ...validPipelineResult,
      validated: { ...validPipelineResult.validated, service_type: 'Takeaway', table_id: null },
    }
    orchestrations.runOrderPipeline.mockResolvedValue(takeawayResult)
    services.findOrCreateUser.mockResolvedValue({ id: 6, name: 'Ana', phone: null, created_at: new Date() })
    services.createOrder.mockResolvedValue({ id: 13 })
    services.createOrderItem.mockResolvedValue({})
    services.createInvoice.mockResolvedValue({ id: 23 })
    services.createPayment.mockResolvedValue({ id: 33 })

    await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'Ana', message: 'Para levar: hamburguer' })

    expect(services.updateTableStatus).not.toHaveBeenCalled()
    expect(services.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ service_type: 'Takeaway', table_id: null }),
    )
  })
})

// ─── Erros do pipeline ────────────────────────────────────────────────────────

describe('POST /orders/pipeline — erros do pipeline', () => {
  it('devolve 400 se o pipeline reportar itens indisponíveis (stock)', async () => {
    orchestrations.runOrderPipeline.mockResolvedValue({
      validated: { service_type: 'Table', table_id: 2, items: [{ item_id: 1, quantity: 5 }] },
      sequenced: {
        stock_status: 'out_of_stock',
        stock_alerts: ['Item 1 esgotado'],
        items:        [{ item_id: 1, unavailable: true }],
        kitchen_sequence: [],
      },
      financials: { total: 0 },
      final:      { success: true },
    })

    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: 'Quero 5 pizzas' })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.stage).toBe('stock_validation')
  })

  it('devolve 500 se o resultado do Gerente for inválido', async () => {
    orchestrations.runOrderPipeline.mockResolvedValue({
      validated: { service_type: 'Table', table_id: 2, items: [{ item_id: 1, quantity: 1 }] },
      sequenced: { stock_status: 'ok', stock_alerts: [], items: [], kitchen_sequence: [] },
      financials: { total: 10 },
      final: { success: false },  // Gerente rejeitou
    })

    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: 'Quero uma pizza' })

    expect(res.status).toBe(500)
    expect(res.body.stage).toBe('manager_validation')
  })

  it('devolve 400 se o pipeline não tiver itens válidos', async () => {
    orchestrations.runOrderPipeline.mockResolvedValue({
      validated: { service_type: 'Table', table_id: 2, items: [], allergy_restrictions: null },
      sequenced: { stock_status: 'ok', stock_alerts: [], items: [], kitchen_sequence: [] },
      financials: { total: 0 },
      final: { success: true },
    })

    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: 'Quero qualquer coisa' })

    expect(res.status).toBe(400)
    expect(res.body.stage).toBe('pipeline_validation')
  })

  it('devolve 400 se um item não tiver item_id válido', async () => {
    orchestrations.runOrderPipeline.mockResolvedValue({
      validated: { service_type: 'Table', table_id: 2, items: [{ item_id: null, quantity: 1 }] },
      sequenced: { stock_status: 'ok', stock_alerts: [], items: [], kitchen_sequence: [] },
      financials: { total: 10 },
      final: { success: true },
    })

    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: 'Quero algo' })

    expect(res.status).toBe(400)
    expect(res.body.stage).toBe('pipeline_validation')
  })

  it('devolve 400 se o pedido for de mesa mas sem table_id atribuído', async () => {
    orchestrations.runOrderPipeline.mockResolvedValue({
      validated: { service_type: 'Table', table_id: null, items: [{ item_id: 1, quantity: 1 }] },
      sequenced: { stock_status: 'ok', stock_alerts: [], items: [], kitchen_sequence: [] },
      financials: { total: 10 },
      final: { success: true },
    })

    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: 'Mesa para jantar' })

    expect(res.status).toBe(400)
    expect(res.body.stage).toBe('table_assignment')
  })

  it('devolve 500 se o runOrderPipeline lançar erro genérico', async () => {
    orchestrations.runOrderPipeline.mockRejectedValue(new Error('AI indisponível'))

    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: 'Quero uma pizza' })

    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toMatch(/AI indisponível/)
  })

  it('devolve 409 se o erro for de stage maitre_retry', async () => {
    const err = new Error('retry failed')
    err.stage = 'maitre_retry'
    orchestrations.runOrderPipeline.mockRejectedValue(err)

    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: 'Quero pizza' })

    expect(res.status).toBe(409)
    expect(res.body.stage).toBe('stock_retry_failed')
  })

  it('devolve 502 se o erro for de stage agent_validation', async () => {
    const err = new Error('schema inválido')
    err.stage = 'agent_validation'
    orchestrations.runOrderPipeline.mockRejectedValue(err)

    const res = await request(app)
      .post('/orders/pipeline')
      .send({ customer_name: 'João', message: 'Quero pizza' })

    expect(res.status).toBe(502)
    expect(res.body.stage).toBe('agent_validation')
  })
})
