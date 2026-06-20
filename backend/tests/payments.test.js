import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllPayments: vi.fn(), getPaymentById: vi.fn(), getPaymentByInvoiceId: vi.fn(),
  getPaymentsByCustomerId: vi.fn(), createPayment: vi.fn(), updatePayment: vi.fn(),
  processPayment: vi.fn(), failPayment: vi.fn(), deletePayment: vi.fn(),
  getInvoiceById: vi.fn(),
  getOrderById: vi.fn(), getUserById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getIngredientById: vi.fn(), getStockById: vi.fn(),
  getOrderItemById: vi.fn(), getReservationById: vi.fn(), getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /payments', () => {
  it('devolve lista com filtros', async () => {
    services.getAllPayments.mockResolvedValue([{ id: 1 }])
    const res = await request(app).get('/payments?status=Pending&paymentMethod=Cash')
    expect(res.status).toBe(200)
    expect(services.getAllPayments).toHaveBeenCalledWith('Pending', 'Cash')
  })
})

describe('GET /payments/invoice/:invoiceId', () => {
  it('devolve 404 se não houver pagamento para a fatura', async () => {
    services.getPaymentByInvoiceId.mockResolvedValue(null)
    expect((await request(app).get('/payments/invoice/99')).status).toBe(404)
  })
  it('devolve o pagamento da fatura', async () => {
    services.getPaymentByInvoiceId.mockResolvedValue({ id: 3, invoice_id: 1 })
    const res = await request(app).get('/payments/invoice/1')
    expect(res.status).toBe(200)
    expect(res.body.invoice_id).toBe(1)
  })
})

describe('GET /payments/customer/:customerId', () => {
  it('devolve lista de pagamentos do cliente', async () => {
    services.getPaymentsByCustomerId.mockResolvedValue([{ id: 2 }])
    const res = await request(app).get('/payments/customer/5')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('POST /payments', () => {
  it('devolve 400 se invoice_id ou amount estiverem em falta', async () => {
    const res = await request(app).post('/payments').send({ invoice_id: 1 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })
  it('devolve 404 se a fatura não existir', async () => {
    services.getInvoiceById.mockResolvedValue(null)
    const res = await request(app).post('/payments').send({ invoice_id: 99, amount: 22 })
    expect(res.status).toBe(404)
  })
  it('devolve 409 se já existir pagamento para a fatura', async () => {
    services.getInvoiceById.mockResolvedValue({ id: 1 })
    services.getPaymentByInvoiceId.mockResolvedValue({ id: 7 })
    const res = await request(app).post('/payments').send({ invoice_id: 1, amount: 22 })
    expect(res.status).toBe(409)
  })
  it('devolve 400 se payment_method for inválido', async () => {
    services.getInvoiceById.mockResolvedValue({ id: 1 })
    services.getPaymentByInvoiceId.mockResolvedValue(null)
    const res = await request(app).post('/payments').send({ invoice_id: 1, amount: 22, payment_method: 'Bitcoin' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/payment_method/)
  })
  it('devolve 400 se payment_status for inválido', async () => {
    services.getInvoiceById.mockResolvedValue({ id: 1 })
    services.getPaymentByInvoiceId.mockResolvedValue(null)
    const res = await request(app).post('/payments').send({ invoice_id: 1, amount: 22, payment_status: 'Unknown' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/payment_status/)
  })
  it('cria pagamento e devolve 201', async () => {
    services.getInvoiceById.mockResolvedValue({ id: 1 })
    services.getPaymentByInvoiceId.mockResolvedValue(null)
    services.createPayment.mockResolvedValue({ id: 10, invoice_id: 1, amount: 22 })
    const res = await request(app).post('/payments').send({ invoice_id: 1, amount: 22, payment_method: 'Cash' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 10)
  })
})

describe('GET /payments/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getPaymentById.mockResolvedValue(null)
    expect((await request(app).get('/payments/999')).status).toBe(404)
  })
  it('devolve o pagamento', async () => {
    services.getPaymentById.mockResolvedValue({ id: 5, amount: 22 })
    const res = await request(app).get('/payments/5')
    expect(res.status).toBe(200)
    expect(res.body.amount).toBe(22)
  })
})

describe('PUT /payments/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getPaymentById.mockResolvedValue(null)
    expect((await request(app).put('/payments/999').send({})).status).toBe(404)
  })
  it('devolve 400 se payment_method for inválido', async () => {
    services.getPaymentById.mockResolvedValue({ id: 5 })
    const res = await request(app).put('/payments/5').send({ payment_method: 'Crypto' })
    expect(res.status).toBe(400)
  })
  it('actualiza com sucesso', async () => {
    services.getPaymentById.mockResolvedValue({ id: 5 })
    services.updatePayment.mockResolvedValue(1)
    const res = await request(app).put('/payments/5').send({ payment_status: 'Completed' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizado/)
  })
})

describe('PATCH /payments/:id/process', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getPaymentById.mockResolvedValue(null)
    expect((await request(app).patch('/payments/999/process')).status).toBe(404)
  })
  it('processa o pagamento com sucesso', async () => {
    services.getPaymentById.mockResolvedValue({ id: 5 })
    services.processPayment.mockResolvedValue(1)
    const res = await request(app).patch('/payments/5/process')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/processado/)
  })
})

describe('PATCH /payments/:id/fail', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getPaymentById.mockResolvedValue(null)
    expect((await request(app).patch('/payments/999/fail')).status).toBe(404)
  })
  it('marca como falhado com sucesso', async () => {
    services.getPaymentById.mockResolvedValue({ id: 5 })
    services.failPayment.mockResolvedValue(1)
    const res = await request(app).patch('/payments/5/fail')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/falhado/)
  })
})

describe('DELETE /payments/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getPaymentById.mockResolvedValue(null)
    expect((await request(app).delete('/payments/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.getPaymentById.mockResolvedValue({ id: 5 })
    services.deletePayment.mockResolvedValue(1)
    const res = await request(app).delete('/payments/5')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminado/)
  })
})
