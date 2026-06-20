import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllOrderItems: vi.fn(), getOrderItemById: vi.fn(), getItemsByOrderId: vi.fn(),
  createOrderItem: vi.fn(), createOrderItems: vi.fn(), updateOrderItem: vi.fn(),
  deleteOrderItem: vi.fn(), deleteItemsByOrderId: vi.fn(),
  getOrderById: vi.fn(), getUserById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getIngredientById: vi.fn(), getStockById: vi.fn(),
  getInvoiceById: vi.fn(), getPaymentById: vi.fn(), getReservationById: vi.fn(),
  getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /order-items', () => {
  it('devolve lista de itens de pedido', async () => {
    services.getAllOrderItems.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const res = await request(app).get('/order-items')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('GET /order-items/order/:orderId', () => {
  it('devolve itens do pedido', async () => {
    services.getItemsByOrderId.mockResolvedValue([{ id: 1, order_id: 5 }])
    const res = await request(app).get('/order-items/order/5')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('GET /order-items/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.getOrderItemById.mockResolvedValue(null)
    expect((await request(app).get('/order-items/999')).status).toBe(404)
  })
  it('devolve o item de pedido', async () => {
    services.getOrderItemById.mockResolvedValue({ id: 3, quantity: 2 })
    const res = await request(app).get('/order-items/3')
    expect(res.status).toBe(200)
    expect(res.body.quantity).toBe(2)
  })
})

describe('POST /order-items', () => {
  it('devolve 400 se order_id ou item_id estiverem em falta', async () => {
    const res = await request(app).post('/order-items').send({ order_id: 1 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })
  it('cria item de pedido e devolve 201', async () => {
    services.createOrderItem.mockResolvedValue({ id: 7, order_id: 1, item_id: 2 })
    const res = await request(app).post('/order-items').send({ order_id: 1, item_id: 2, quantity: 1 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 7)
  })
})

describe('POST /order-items/bulk', () => {
  it('devolve 400 se order_id ou items estiverem em falta', async () => {
    const res = await request(app).post('/order-items/bulk').send({ order_id: 1, items: [] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })
  it('cria itens em bulk e devolve 201', async () => {
    services.createOrderItems.mockResolvedValue([{ id: 8 }, { id: 9 }])
    const res = await request(app).post('/order-items/bulk').send({
      order_id: 1,
      items: [{ item_id: 2, quantity: 1 }, { item_id: 3, quantity: 2 }],
    })
    expect(res.status).toBe(201)
    expect(res.body).toHaveLength(2)
  })
})

describe('PATCH /order-items/:id', () => {
  it('devolve 400 se quantity estiver em falta', async () => {
    const res = await request(app).patch('/order-items/3').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/quantity/)
  })
  it('devolve 404 se não existir', async () => {
    services.updateOrderItem.mockResolvedValue(0)
    const res = await request(app).patch('/order-items/999').send({ quantity: 3 })
    expect(res.status).toBe(404)
  })
  it('actualiza a quantidade com sucesso', async () => {
    services.updateOrderItem.mockResolvedValue(1)
    const res = await request(app).patch('/order-items/3').send({ quantity: 3 })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizada/)
  })
})

describe('DELETE /order-items/order/:orderId', () => {
  it('elimina todos os itens do pedido', async () => {
    services.deleteItemsByOrderId.mockResolvedValue(3)
    const res = await request(app).delete('/order-items/order/5')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/3/)
  })
})

describe('DELETE /order-items/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.deleteOrderItem.mockResolvedValue(0)
    expect((await request(app).delete('/order-items/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.deleteOrderItem.mockResolvedValue(1)
    const res = await request(app).delete('/order-items/3')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminado/)
  })
})
