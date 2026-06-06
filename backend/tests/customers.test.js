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
  // customerController
  getAllCustomers:      vi.fn(),
  getCustomerById:     vi.fn(),
  createCustomer:      vi.fn(),
  updateCustomer:      vi.fn(),
  deleteCustomer:      vi.fn(),
  toggleCustomerActive: vi.fn(),
  nameExists:          vi.fn(),
  phoneExists:         vi.fn(),
  // notificationController (usado nas rotas de clientes)
  getNotificationsByCustomerId:    vi.fn(),
  getUnreadNotificationsByCustomer: vi.fn(),
  getNotificationById:             vi.fn(),
  markNotificationAsRead:          vi.fn(),
  // outros middlewares de existência
  getOrderById:       vi.fn(),
  getTableById:       vi.fn(),
  getItemById:        vi.fn(),
  getIngredientById:  vi.fn(),
  getStockById:       vi.fn(),
  getOrderItemById:   vi.fn(),
  getInvoiceById:     vi.fn(),
  getPaymentById:     vi.fn(),
  getReservationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

// ─── GET /customers ───────────────────────────────────────────────────────────

describe('GET /customers', () => {
  it('devolve lista de clientes', async () => {
    services.getAllCustomers.mockResolvedValue([{ id: 1, name: 'João' }, { id: 2, name: 'Maria' }])
    const res = await request(app).get('/customers')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('filtra clientes por search e sort via query params', async () => {
    services.getAllCustomers.mockResolvedValue([])
    await request(app).get('/customers?search=jo&sort=name')
    expect(services.getAllCustomers).toHaveBeenCalledWith('jo', 'name')
  })

  it('devolve 500 em caso de erro do serviço', async () => {
    services.getAllCustomers.mockRejectedValue(new Error('DB fail'))
    const res = await request(app).get('/customers')
    expect(res.status).toBe(500)
  })
})

// ─── POST /customers ──────────────────────────────────────────────────────────

describe('POST /customers', () => {
  it('devolve 400 se name estiver em falta', async () => {
    const res = await request(app).post('/customers').send({ phone: '912345678' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/)
  })

  it('devolve 409 se o nome já existir', async () => {
    services.nameExists.mockResolvedValue(true)
    const res = await request(app).post('/customers').send({ name: 'João' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/nome/)
  })

  it('devolve 409 se o telefone já existir', async () => {
    services.nameExists.mockResolvedValue(false)
    services.phoneExists.mockResolvedValue(true)
    const res = await request(app).post('/customers').send({ name: 'Maria', phone: '912345678' })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/telefone/)
  })

  it('cria cliente e devolve 201', async () => {
    services.nameExists.mockResolvedValue(false)
    services.phoneExists.mockResolvedValue(false)
    services.createCustomer.mockResolvedValue({ id: 10, name: 'Maria', phone: '912345678' })
    const res = await request(app)
      .post('/customers')
      .send({ name: 'Maria', phone: '912345678' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 10)
    expect(res.body).toHaveProperty('name', 'Maria')
  })
})

// ─── GET /customers/:id ───────────────────────────────────────────────────────

describe('GET /customers/:id', () => {
  it('devolve 404 se o cliente não existir (middleware)', async () => {
    services.getCustomerById.mockResolvedValue(null)
    const res = await request(app).get('/customers/999')
    expect(res.status).toBe(404)
  })

  it('devolve os dados do cliente se existir', async () => {
    services.getCustomerById.mockResolvedValue({ id: 1, name: 'João', phone: null })
    const res = await request(app).get('/customers/1')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('name', 'João')
  })
})

// ─── PUT /customers/:id ───────────────────────────────────────────────────────

describe('PUT /customers/:id', () => {
  it('devolve 404 se o cliente não existir (middleware)', async () => {
    services.getCustomerById.mockResolvedValue(null)
    const res = await request(app).put('/customers/999').send({ name: 'Novo' })
    expect(res.status).toBe(404)
  })

  it('devolve 409 se o novo nome já existir noutro cliente', async () => {
    services.getCustomerById.mockResolvedValue({ id: 1 })
    services.nameExists.mockResolvedValue(true)
    const res = await request(app).put('/customers/1').send({ name: 'Maria' })
    expect(res.status).toBe(409)
  })

  it('actualiza o cliente com sucesso', async () => {
    services.getCustomerById.mockResolvedValue({ id: 1 })
    services.nameExists.mockResolvedValue(false)
    services.updateCustomer.mockResolvedValue(1)
    const res = await request(app).put('/customers/1').send({ name: 'João Atualizado' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizado/)
  })
})

// ─── DELETE /customers/:id ────────────────────────────────────────────────────

describe('DELETE /customers/:id', () => {
  it('devolve 404 se o cliente não existir (middleware)', async () => {
    services.getCustomerById.mockResolvedValue(null)
    const res = await request(app).delete('/customers/999')
    expect(res.status).toBe(404)
  })

  it('elimina o cliente e devolve mensagem de sucesso', async () => {
    services.getCustomerById.mockResolvedValue({ id: 1 })
    services.deleteCustomer.mockResolvedValue(1)
    const res = await request(app).delete('/customers/1')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminado/)
  })
})
