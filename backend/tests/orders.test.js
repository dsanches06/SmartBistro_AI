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

vi.mock('../src/services/index.js', () => ({
  // orderController
  getAllOrders:          vi.fn(),
  getPendingOrders:      vi.fn(),
  getOrderById:          vi.fn(),
  getOrdersByCustomerId: vi.fn(),
  createOrder:           vi.fn(),
  updateOrder:           vi.fn(),
  updateOrderStatus:     vi.fn(),
  deleteOrder:           vi.fn(),
  createInvoice:         vi.fn(),
  invoiceExistsForOrder: vi.fn(),
  createNotification:    vi.fn(),
  // middlewares de existência
  getCustomerById:       vi.fn(),
  getTableById:          vi.fn(),
  getItemById:           vi.fn(),
  getIngredientById:     vi.fn(),
  getStockById:          vi.fn(),
  getOrderItemById:      vi.fn(),
  getInvoiceById:        vi.fn(),
  getPaymentById:        vi.fn(),
  getReservationById:    vi.fn(),
  getNotificationById:   vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

// ─── GET /orders ──────────────────────────────────────────────────────────────

describe('GET /orders', () => {
  it('devolve lista de pedidos', async () => {
    services.getAllOrders.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const res = await request(app).get('/orders')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('filtra pedidos por status via query param', async () => {
    services.getAllOrders.mockResolvedValue([{ id: 3, order_status: 'Pending' }])
    const res = await request(app).get('/orders?status=Pending')
    expect(res.status).toBe(200)
    expect(services.getAllOrders).toHaveBeenCalledWith('Pending', undefined)
  })

  it('devolve 500 em caso de erro do serviço', async () => {
    services.getAllOrders.mockRejectedValue(new Error('DB error'))
    const res = await request(app).get('/orders')
    expect(res.status).toBe(500)
  })
})

// ─── GET /orders/pending ──────────────────────────────────────────────────────

describe('GET /orders/pending', () => {
  it('devolve pedidos pendentes', async () => {
    services.getPendingOrders.mockResolvedValue([{ id: 5 }, { id: 6 }])
    const res = await request(app).get('/orders/pending')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('devolve 500 em caso de erro', async () => {
    services.getPendingOrders.mockRejectedValue(new Error('fail'))
    const res = await request(app).get('/orders/pending')
    expect(res.status).toBe(500)
  })
})

// ─── GET /orders/customer/:customerId ────────────────────────────────────────

describe('GET /orders/customer/:customerId', () => {
  it('devolve pedidos de um cliente específico', async () => {
    services.getOrdersByCustomerId.mockResolvedValue([{ id: 10 }])
    const res = await request(app).get('/orders/customer/3')
    expect(res.status).toBe(200)
    expect(services.getOrdersByCustomerId).toHaveBeenCalledWith('3')
  })
})

// ─── POST /orders ─────────────────────────────────────────────────────────────

describe('POST /orders', () => {
  it('devolve 400 se service_type estiver em falta', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ kitchen_sequence_json: [] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })

  it('devolve 400 se kitchen_sequence_json estiver em falta', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ service_type: 'Table' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })

  it('devolve 400 se service_type for inválido', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ service_type: 'Invalido', kitchen_sequence_json: [] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/inválido/)
  })

  it('cria pedido de mesa e devolve 201', async () => {
    services.createOrder.mockResolvedValue({ id: 10, service_type: 'Table' })
    const res = await request(app)
      .post('/orders')
      .send({ service_type: 'Table', kitchen_sequence_json: [{ item_id: 1, quantity: 2 }] })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 10)
  })

  it('cria pedido takeaway e devolve 201', async () => {
    services.createOrder.mockResolvedValue({ id: 11, service_type: 'Takeaway' })
    const res = await request(app)
      .post('/orders')
      .send({ service_type: 'Takeaway', kitchen_sequence_json: [] })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('service_type', 'Takeaway')
  })
})

// ─── GET /orders/:id ──────────────────────────────────────────────────────────

describe('GET /orders/:id', () => {
  it('devolve 404 se o pedido não existir (middleware)', async () => {
    services.getOrderById.mockResolvedValue(null)
    const res = await request(app).get('/orders/999')
    expect(res.status).toBe(404)
  })

  it('devolve o pedido se existir', async () => {
    const order = { id: 1, service_type: 'Table', order_status: 'Pending' }
    services.getOrderById.mockResolvedValue(order)
    const res = await request(app).get('/orders/1')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', 1)
  })
})

// ─── PATCH /orders/:id/status ─────────────────────────────────────────────────

describe('PATCH /orders/:id/status', () => {
  it('devolve 404 se o pedido não existir (middleware)', async () => {
    services.getOrderById.mockResolvedValue(null)
    const res = await request(app)
      .patch('/orders/999/status')
      .send({ order_status: 'Preparing' })
    expect(res.status).toBe(404)
  })

  it('devolve 400 se order_status estiver em falta', async () => {
    services.getOrderById.mockResolvedValue({ id: 1 })
    const res = await request(app).patch('/orders/1/status').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatório/)
  })

  it('actualiza o status com sucesso', async () => {
    services.getOrderById.mockResolvedValue({ id: 1, customer_id: null, kitchen_sequence_json: null })
    services.updateOrderStatus.mockResolvedValue(1)
    const res = await request(app)
      .patch('/orders/1/status')
      .send({ order_status: 'Preparing' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/Preparing/)
  })

  it('cria fatura automaticamente quando status muda para Ready', async () => {
    services.getOrderById.mockResolvedValue({
      id: 1, customer_id: null, service_type: 'Table', kitchen_sequence_json: null,
    })
    services.updateOrderStatus.mockResolvedValue(1)
    services.invoiceExistsForOrder.mockResolvedValue(false)
    services.createInvoice.mockResolvedValue({ id: 50 })

    const res = await request(app)
      .patch('/orders/1/status')
      .send({ order_status: 'Ready' })
    expect(res.status).toBe(200)
    expect(services.createInvoice).toHaveBeenCalledOnce()
  })

  it('não cria fatura duplicada se já existe para o pedido', async () => {
    services.getOrderById.mockResolvedValue({ id: 1, customer_id: null, kitchen_sequence_json: null })
    services.updateOrderStatus.mockResolvedValue(1)
    services.invoiceExistsForOrder.mockResolvedValue(true)

    const res = await request(app)
      .patch('/orders/1/status')
      .send({ order_status: 'Ready' })
    expect(res.status).toBe(200)
    expect(services.createInvoice).not.toHaveBeenCalled()
  })
})

// ─── DELETE /orders/:id ───────────────────────────────────────────────────────

describe('DELETE /orders/:id', () => {
  it('devolve 404 se o pedido não existir (middleware)', async () => {
    services.getOrderById.mockResolvedValue(null)
    const res = await request(app).delete('/orders/999')
    expect(res.status).toBe(404)
  })

  it('elimina o pedido e devolve mensagem de sucesso', async () => {
    services.getOrderById.mockResolvedValue({ id: 1 })
    services.deleteOrder.mockResolvedValue(1)
    const res = await request(app).delete('/orders/1')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminado/)
  })
})
