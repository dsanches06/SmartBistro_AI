import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

const mockSendMessage = vi.hoisted(() => vi.fn().mockResolvedValue(JSON.stringify({
  kitchen_sequence: [{ step: 1, item: 'Pizza', estimated_seconds: 30 }],
  estimated_seconds: 30,
  sections: { grill: ['Pizza'] },
  notes: 'Tudo pronto.',
})))

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))

vi.mock('../src/genai/agents/index.js', () => ({
  ChefAgent: vi.fn(function () {
    this.sendMessage = mockSendMessage
  }),
}))
vi.mock('../src/genai/agents/chef/chefMessages.js', () => ({
  buildChefMessage: vi.fn(() => 'chef prompt'),
}))
vi.mock('../src/genai/agents/chef/chefSchemas.js', () => ({
  ChefResponseSchema: {},
}))
vi.mock('../src/genai/agents/chef/chefHelpers.js', () => ({
  deriveChefStockMetrics: vi.fn(() => ({
    unavailableItems: [], stockStatus: 'ok', stockAlerts: [],
  })),
}))
vi.mock('../src/genai/helpers/index.js', () => ({
  validateAgentOutput: vi.fn((_schema, data) => data),
  extractJSON: vi.fn((text) => JSON.parse(text)),
}))

vi.mock('../src/services/index.js', () => ({
  getOrderById: vi.fn(), updateOrder: vi.fn(), getItemsByOrderId: vi.fn(),
  getItemById: vi.fn(), getActiveItems: vi.fn(),
  getUserById: vi.fn(), getTableById: vi.fn(),
  getItemByName: vi.fn(), getIngredientById: vi.fn(), getStockById: vi.fn(),
  getOrderItemById: vi.fn(), getInvoiceById: vi.fn(), getPaymentById: vi.fn(),
  getReservationById: vi.fn(), getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

const PENDING_ORDER = { id: 1, order_status: 'Pending', customer_name: 'Ana', table_id: 2, service_type: 'Table' }

describe('POST /orders/:id/chef-start', () => {
  it('devolve 404 se o pedido não existir', async () => {
    services.getOrderById.mockResolvedValue(null)
    expect((await request(app).post('/orders/999/chef-start')).status).toBe(404)
  })

  it('devolve 400 se o pedido não estiver Pending', async () => {
    services.getOrderById.mockResolvedValue({ id: 1, order_status: 'In Preparation' })
    const res = await request(app).post('/orders/1/chef-start')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Pending/)
  })

  it('avança pedido sem itens mas com kitchen_sequence_json (modo carrinho)', async () => {
    services.getOrderById.mockResolvedValue({
      ...PENDING_ORDER,
      kitchen_sequence_json: JSON.stringify([{ step: 1, item: 'Sopa' }]),
    })
    services.getItemsByOrderId.mockResolvedValue([])
    services.getActiveItems.mockResolvedValue([])
    services.updateOrder.mockResolvedValue(1)

    const res = await request(app).post('/orders/1/chef-start')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(services.updateOrder).toHaveBeenCalledWith(1, { order_status: 'In Preparation' })
    expect(res.body.notes).toMatch(/cardápio digital/)
  })

  it('devolve 400 se o pedido não tiver itens nem kitchen_sequence_json', async () => {
    services.getOrderById.mockResolvedValue({ ...PENDING_ORDER, kitchen_sequence_json: null })
    services.getItemsByOrderId.mockResolvedValue([])
    services.getActiveItems.mockResolvedValue([])

    const res = await request(app).post('/orders/1/chef-start')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/não tem itens/)
  })

  it('invoca o Chef AI e devolve 200 com a sequência de cozinha', async () => {
    services.getOrderById.mockResolvedValue(PENDING_ORDER)
    services.getItemsByOrderId.mockResolvedValue([{ item_id: 5, quantity: 2 }])
    services.getActiveItems.mockResolvedValue([{ id: 5, name: 'Pizza', price: '9.50' }])
    services.updateOrder.mockResolvedValue(1)

    const res = await request(app).post('/orders/1/chef-start')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.kitchen_sequence).toHaveLength(1)
    expect(res.body.stock_status).toBe('ok')
    expect(services.updateOrder).toHaveBeenCalledWith(1, expect.objectContaining({
      order_status: 'In Preparation',
    }))
  })

  it('se o Chef AI estiver indisponível, avança em modo reserva sem IA', async () => {
    mockSendMessage.mockRejectedValueOnce(new Error('AI unavailable'))

    services.getOrderById.mockResolvedValue(PENDING_ORDER)
    services.getItemsByOrderId.mockResolvedValue([{ item_id: 5, quantity: 1 }])
    services.getActiveItems.mockResolvedValue([{ id: 5, name: 'Pizza', price: '9.50' }])
    services.updateOrder.mockResolvedValue(1)

    const res = await request(app).post('/orders/1/chef-start')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.fallback).toBe(true)
    expect(res.body.kitchen_sequence).toEqual(['Pizza'])
    expect(services.updateOrder).toHaveBeenCalledWith(1, expect.objectContaining({
      order_status: 'In Preparation',
    }))
  })
})
