import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllConversations: vi.fn(), getConversationById: vi.fn(),
  createConversation: vi.fn(), updateConversation: vi.fn(), deleteConversation: vi.fn(),
  getOrderById: vi.fn(), getUserById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getIngredientById: vi.fn(), getStockById: vi.fn(),
  getOrderItemById: vi.fn(), getInvoiceById: vi.fn(), getPaymentById: vi.fn(),
  getReservationById: vi.fn(), getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /conversations', () => {
  it('devolve lista de conversas', async () => {
    services.getAllConversations.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const res = await request(app).get('/conversations')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('GET /conversations/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.getConversationById.mockResolvedValue(null)
    expect((await request(app).get('/conversations/999')).status).toBe(404)
  })
  it('devolve a conversa', async () => {
    services.getConversationById.mockResolvedValue({ id: 5, title: 'Teste' })
    const res = await request(app).get('/conversations/5')
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Teste')
  })
})

describe('POST /conversations', () => {
  it('devolve 400 se title estiver em falta', async () => {
    const res = await request(app).post('/conversations').send({ user_id: 1 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/)
  })
  it('cria conversa e devolve 201', async () => {
    services.createConversation.mockResolvedValue({ id: 8, title: 'Nova Conversa' })
    const res = await request(app).post('/conversations').send({ title: 'Nova Conversa', user_id: 1 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 8)
  })
})

describe('PUT /conversations/:id', () => {
  it('devolve 400 se title estiver em falta', async () => {
    const res = await request(app).put('/conversations/5').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/)
  })
  it('devolve 404 se não existir', async () => {
    services.updateConversation.mockResolvedValue(0)
    const res = await request(app).put('/conversations/999').send({ title: 'X' })
    expect(res.status).toBe(404)
  })
  it('actualiza com sucesso', async () => {
    services.updateConversation.mockResolvedValue(1)
    const res = await request(app).put('/conversations/5').send({ title: 'Actualizada' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizada/)
  })
})

describe('DELETE /conversations/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.deleteConversation.mockResolvedValue(0)
    expect((await request(app).delete('/conversations/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.deleteConversation.mockResolvedValue(1)
    const res = await request(app).delete('/conversations/5')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminada/)
  })
})
