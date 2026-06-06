import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllInvoices: vi.fn(), getInvoiceById: vi.fn(), getInvoiceByOrderId: vi.fn(),
  invoiceExistsForOrder: vi.fn(), createInvoice: vi.fn(), updateInvoice: vi.fn(), deleteInvoice: vi.fn(),
  getOrderById: vi.fn(), getCustomerById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getIngredientById: vi.fn(), getStockById: vi.fn(),
  getOrderItemById: vi.fn(), getPaymentById: vi.fn(), getReservationById: vi.fn(),
  getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /invoices', () => {
  it('devolve lista de faturas', async () => {
    services.getAllInvoices.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const res = await request(app).get('/invoices')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('GET /invoices/order/:orderId', () => {
  it('devolve 404 se não existir fatura para o pedido', async () => {
    services.getInvoiceByOrderId.mockResolvedValue(null)
    expect((await request(app).get('/invoices/order/999')).status).toBe(404)
  })
  it('devolve a fatura do pedido', async () => {
    services.getInvoiceByOrderId.mockResolvedValue({ id: 5, order_id: 10 })
    const res = await request(app).get('/invoices/order/10')
    expect(res.status).toBe(200)
    expect(res.body.order_id).toBe(10)
  })
})

describe('POST /invoices', () => {
  it('devolve 400 se campos obrigatórios estiverem em falta', async () => {
    const res = await request(app).post('/invoices').send({ order_id: 1 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })
  it('devolve 404 se o pedido não existir', async () => {
    services.getOrderById.mockResolvedValue(null)
    const res = await request(app).post('/invoices').send({
      order_id: 99, subtotal_amount: 20, tax_amount: 2.6, total_amount: 22.6, profit_margin: 5,
    })
    expect(res.status).toBe(404)
  })
  it('devolve 409 se já existir fatura para o pedido', async () => {
    services.getOrderById.mockResolvedValue({ id: 1 })
    services.invoiceExistsForOrder.mockResolvedValue(true)
    const res = await request(app).post('/invoices').send({
      order_id: 1, subtotal_amount: 20, tax_amount: 2.6, total_amount: 22.6, profit_margin: 5,
    })
    expect(res.status).toBe(409)
  })
  it('cria fatura e devolve 201', async () => {
    services.getOrderById.mockResolvedValue({ id: 1 })
    services.invoiceExistsForOrder.mockResolvedValue(false)
    services.createInvoice.mockResolvedValue({ id: 7, total_amount: 22.6 })
    const res = await request(app).post('/invoices').send({
      order_id: 1, subtotal_amount: 20, tax_amount: 2.6, total_amount: 22.6, profit_margin: 5,
    })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 7)
  })
})

describe('GET /invoices/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getInvoiceById.mockResolvedValue(null)
    expect((await request(app).get('/invoices/999')).status).toBe(404)
  })
  it('devolve a fatura', async () => {
    services.getInvoiceById.mockResolvedValue({ id: 5, total_amount: 22.6 })
    const res = await request(app).get('/invoices/5')
    expect(res.status).toBe(200)
    expect(res.body.total_amount).toBe(22.6)
  })
})

describe('PUT /invoices/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getInvoiceById.mockResolvedValue(null)
    expect((await request(app).put('/invoices/999').send({})).status).toBe(404)
  })
  it('actualiza com sucesso', async () => {
    services.getInvoiceById.mockResolvedValue({ id: 5 })
    services.updateInvoice.mockResolvedValue(1)
    const res = await request(app).put('/invoices/5').send({ total_amount: 25 })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizada/)
  })
})

describe('DELETE /invoices/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getInvoiceById.mockResolvedValue(null)
    expect((await request(app).delete('/invoices/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.getInvoiceById.mockResolvedValue({ id: 5 })
    services.deleteInvoice.mockResolvedValue(1)
    const res = await request(app).delete('/invoices/5')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminada/)
  })
})
