import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllLogs: vi.fn(), getLogById: vi.fn(), getLogsByOrderId: vi.fn(),
  getLogsByAgent: vi.fn(), createLog: vi.fn(), deleteLog: vi.fn(), deleteLogsByOrderId: vi.fn(),
  getOrderById: vi.fn(), getCustomerById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getIngredientById: vi.fn(), getStockById: vi.fn(),
  getOrderItemById: vi.fn(), getInvoiceById: vi.fn(), getPaymentById: vi.fn(),
  getReservationById: vi.fn(), getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /logs', () => {
  it('devolve lista com filtros', async () => {
    services.getAllLogs.mockResolvedValue([{ id: 1, agent_name: 'Maitre', status: 'Success' }])
    const res = await request(app).get('/logs?agent_name=Maitre&status=Success')
    expect(res.status).toBe(200)
    expect(services.getAllLogs).toHaveBeenCalledWith('Maitre', 'Success')
  })
  it('devolve 500 em erro', async () => {
    services.getAllLogs.mockRejectedValue(new Error('fail'))
    expect((await request(app).get('/logs')).status).toBe(500)
  })
})

describe('GET /logs/order/:orderId', () => {
  it('devolve logs do pedido', async () => {
    services.getLogsByOrderId.mockResolvedValue([{ id: 2, order_id: 5 }])
    const res = await request(app).get('/logs/order/5')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('GET /logs/agent/:agentName', () => {
  it('devolve logs do agente', async () => {
    services.getLogsByAgent.mockResolvedValue([{ id: 3, agent_name: 'Chef' }])
    const res = await request(app).get('/logs/agent/Chef')
    expect(res.status).toBe(200)
    expect(res.body[0].agent_name).toBe('Chef')
  })
})

describe('GET /logs/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.getLogById.mockResolvedValue(null)
    expect((await request(app).get('/logs/999')).status).toBe(404)
  })
  it('devolve o log', async () => {
    services.getLogById.mockResolvedValue({ id: 5, agent_name: 'Waiter', status: 'Success' })
    const res = await request(app).get('/logs/5')
    expect(res.status).toBe(200)
    expect(res.body.agent_name).toBe('Waiter')
  })
})

describe('POST /logs', () => {
  it('devolve 400 se agent_name ou status estiverem em falta', async () => {
    const res = await request(app).post('/logs').send({ agent_name: 'Chef' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })
  it('cria log e devolve 201', async () => {
    services.createLog.mockResolvedValue({ id: 9, agent_name: 'Chef', status: 'Success' })
    const res = await request(app).post('/logs').send({ agent_name: 'Chef', status: 'Success' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 9)
  })
})

describe('DELETE /logs/order/:orderId', () => {
  it('elimina todos os logs do pedido', async () => {
    services.deleteLogsByOrderId.mockResolvedValue(3)
    const res = await request(app).delete('/logs/order/5')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/3/)
  })
})

describe('DELETE /logs/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.deleteLog.mockResolvedValue(0)
    expect((await request(app).delete('/logs/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.deleteLog.mockResolvedValue(1)
    const res = await request(app).delete('/logs/5')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminado/)
  })
})
