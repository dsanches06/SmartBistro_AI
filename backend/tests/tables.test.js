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
  // tableController
  getAllTables:            vi.fn(),
  getTableById:            vi.fn(),
  getTableDetailsById:     vi.fn(),
  getTableReservationById: vi.fn(),
  tableNumberExists:       vi.fn(),
  createTable:             vi.fn(),
  updateTable:             vi.fn(),
  updateTableStatus:       vi.fn(),
  deleteTable:             vi.fn(),
  // outros middlewares de existência
  getOrderById:         vi.fn(),
  getUserById:      vi.fn(),
  getItemById:          vi.fn(),
  getIngredientById:    vi.fn(),
  getStockById:         vi.fn(),
  getOrderItemById:     vi.fn(),
  getInvoiceById:       vi.fn(),
  getPaymentById:       vi.fn(),
  getReservationById:   vi.fn(),
  getNotificationById:  vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

// ─── GET /tables ──────────────────────────────────────────────────────────────

describe('GET /tables', () => {
  it('devolve lista de mesas', async () => {
    services.getAllTables.mockResolvedValue([{ id: 1, table_number: 1 }, { id: 2, table_number: 2 }])
    const res = await request(app).get('/tables')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })

  it('filtra mesas por status via query param', async () => {
    services.getAllTables.mockResolvedValue([{ id: 1, status: 'Free' }])
    await request(app).get('/tables?status=Free')
    expect(services.getAllTables).toHaveBeenCalledWith('Free')
  })

  it('devolve 500 em caso de erro do serviço', async () => {
    services.getAllTables.mockRejectedValue(new Error('DB error'))
    const res = await request(app).get('/tables')
    expect(res.status).toBe(500)
  })
})

// ─── POST /tables ─────────────────────────────────────────────────────────────

describe('POST /tables', () => {
  it('devolve 400 se table_number estiver em falta', async () => {
    const res = await request(app).post('/tables').send({ capacity: 4 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/table_number/)
  })

  it('devolve 409 se o número de mesa já existir', async () => {
    services.tableNumberExists.mockResolvedValue(true)
    const res = await request(app).post('/tables').send({ table_number: 5, capacity: 4 })
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/já existe/)
  })

  it('cria mesa e devolve 201', async () => {
    services.tableNumberExists.mockResolvedValue(false)
    services.createTable.mockResolvedValue({ id: 5, table_number: 5, capacity: 4, status: 'Free' })
    const res = await request(app)
      .post('/tables')
      .send({ table_number: 5, capacity: 4 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 5)
    expect(res.body).toHaveProperty('table_number', 5)
  })
})

// ─── GET /tables/:id ──────────────────────────────────────────────────────────

describe('GET /tables/:id', () => {
  it('devolve 404 se a mesa não existir (middleware)', async () => {
    services.getTableById.mockResolvedValue(null)
    const res = await request(app).get('/tables/999')
    expect(res.status).toBe(404)
  })

  it('devolve a mesa se existir', async () => {
    const table = { id: 2, table_number: 2, capacity: 4, status: 'Free' }
    services.getTableById.mockResolvedValue(table)
    const res = await request(app).get('/tables/2')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('table_number', 2)
  })
})

// ─── GET /tables/:id/details ──────────────────────────────────────────────────

describe('GET /tables/:id/details', () => {
  it('devolve 404 se a mesa não existir (middleware)', async () => {
    services.getTableById.mockResolvedValue(null)
    const res = await request(app).get('/tables/999/details')
    expect(res.status).toBe(404)
  })

  it('devolve detalhes da mesa', async () => {
    services.getTableById.mockResolvedValue({ id: 2 })
    services.getTableDetailsById.mockResolvedValue({ id: 2, orders: [], reservation: null })
    const res = await request(app).get('/tables/2/details')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('orders')
  })
})

// ─── PUT /tables/:id ─────────────────────────────────────────────────────────

describe('PUT /tables/:id', () => {
  it('devolve 404 se a mesa não existir (middleware)', async () => {
    services.getTableById.mockResolvedValue(null)
    const res = await request(app).put('/tables/999').send({ capacity: 6 })
    expect(res.status).toBe(404)
  })

  it('devolve 409 se o novo número de mesa já estiver em uso', async () => {
    services.getTableById.mockResolvedValue({ id: 2 })
    services.tableNumberExists.mockResolvedValue(true)
    const res = await request(app).put('/tables/2').send({ table_number: 5 })
    expect(res.status).toBe(409)
  })

  it('actualiza a mesa com sucesso', async () => {
    services.getTableById.mockResolvedValue({ id: 2 })
    services.tableNumberExists.mockResolvedValue(false)
    services.updateTable.mockResolvedValue(1)
    const res = await request(app).put('/tables/2').send({ capacity: 6 })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizada/)
  })
})

// ─── PATCH /tables/:id/status ─────────────────────────────────────────────────

describe('PATCH /tables/:id/status', () => {
  it('devolve 404 se a mesa não existir (middleware)', async () => {
    services.getTableById.mockResolvedValue(null)
    const res = await request(app).patch('/tables/999/status').send({ status: 'Occupied' })
    expect(res.status).toBe(404)
  })

  it('devolve 400 se status estiver em falta', async () => {
    services.getTableById.mockResolvedValue({ id: 2 })
    const res = await request(app).patch('/tables/2/status').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/status/)
  })

  it('actualiza o status para Occupied', async () => {
    services.getTableById.mockResolvedValue({ id: 2 })
    services.updateTableStatus.mockResolvedValue(1)
    const res = await request(app).patch('/tables/2/status').send({ status: 'Occupied' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/Occupied/)
  })

  it('actualiza o status para Free', async () => {
    services.getTableById.mockResolvedValue({ id: 2 })
    services.updateTableStatus.mockResolvedValue(1)
    const res = await request(app).patch('/tables/2/status').send({ status: 'Free' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/Free/)
  })
})

// ─── DELETE /tables/:id ───────────────────────────────────────────────────────

describe('DELETE /tables/:id', () => {
  it('devolve 404 se a mesa não existir (middleware)', async () => {
    services.getTableById.mockResolvedValue(null)
    const res = await request(app).delete('/tables/999')
    expect(res.status).toBe(404)
  })

  it('elimina a mesa e devolve mensagem de sucesso', async () => {
    services.getTableById.mockResolvedValue({ id: 2 })
    services.deleteTable.mockResolvedValue(1)
    const res = await request(app).delete('/tables/2')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminada/)
  })
})
