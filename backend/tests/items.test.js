import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllItems: vi.fn(), getActiveItems: vi.fn(), getItemById: vi.fn(),
  itemNameExists: vi.fn(), createItem: vi.fn(), updateItem: vi.fn(),
  toggleItemActive: vi.fn(), deleteItem: vi.fn(),
  getOrderById: vi.fn(), getUserById: vi.fn(), getTableById: vi.fn(),
  getIngredientById: vi.fn(), getStockById: vi.fn(), getOrderItemById: vi.fn(),
  getInvoiceById: vi.fn(), getPaymentById: vi.fn(), getReservationById: vi.fn(),
  getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /items', () => {
  it('devolve lista de items com filtros', async () => {
    services.getAllItems.mockResolvedValue([{ id: 1, name: 'Pizza' }])
    const res = await request(app).get('/items?search=pizza&category=main')
    expect(res.status).toBe(200)
    expect(services.getAllItems).toHaveBeenCalledWith('pizza', 'main', undefined)
  })
  it('devolve 500 em erro', async () => {
    services.getAllItems.mockRejectedValue(new Error('fail'))
    expect((await request(app).get('/items')).status).toBe(500)
  })
})

describe('GET /items/active', () => {
  it('devolve só items activos', async () => {
    services.getActiveItems.mockResolvedValue([{ id: 1, is_active: true }])
    const res = await request(app).get('/items/active')
    expect(res.status).toBe(200)
    expect(res.body[0].is_active).toBe(true)
  })
})

describe('POST /items', () => {
  it('devolve 400 se name/category/price estiverem em falta', async () => {
    const res = await request(app).post('/items').send({ name: 'Pizza' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })
  it('devolve 409 se o nome já existir', async () => {
    services.itemNameExists.mockResolvedValue(true)
    const res = await request(app).post('/items').send({ name: 'Pizza', category: 'main', price: 9.5 })
    expect(res.status).toBe(409)
  })
  it('cria item e devolve 201', async () => {
    services.itemNameExists.mockResolvedValue(false)
    services.createItem.mockResolvedValue({ id: 10, name: 'Pizza' })
    const res = await request(app).post('/items').send({ name: 'Pizza', category: 'main', price: 9.5 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 10)
  })
})

describe('GET /items/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getItemById.mockResolvedValue(null)
    expect((await request(app).get('/items/999')).status).toBe(404)
  })
  it('devolve o item se existir', async () => {
    services.getItemById.mockResolvedValue({ id: 1, name: 'Pizza' })
    const res = await request(app).get('/items/1')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Pizza')
  })
})

describe('PUT /items/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getItemById.mockResolvedValue(null)
    expect((await request(app).put('/items/999').send({})).status).toBe(404)
  })
  it('devolve 409 se o novo nome já existir', async () => {
    services.getItemById.mockResolvedValue({ id: 1 })
    services.itemNameExists.mockResolvedValue(true)
    expect((await request(app).put('/items/1').send({ name: 'Hamburguer' })).status).toBe(409)
  })
  it('actualiza com sucesso', async () => {
    services.getItemById.mockResolvedValue({ id: 1 })
    services.itemNameExists.mockResolvedValue(false)
    services.updateItem.mockResolvedValue(1)
    const res = await request(app).put('/items/1').send({ price: 10 })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizado/)
  })
})

describe('PATCH /items/:id/active', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getItemById.mockResolvedValue(null)
    expect((await request(app).patch('/items/999/active').send({ is_active: true })).status).toBe(404)
  })
  it('devolve 400 se is_active estiver em falta', async () => {
    services.getItemById.mockResolvedValue({ id: 1 })
    const res = await request(app).patch('/items/1/active').send({})
    expect(res.status).toBe(400)
  })
  it('activa o item', async () => {
    services.getItemById.mockResolvedValue({ id: 1 })
    services.toggleItemActive.mockResolvedValue(1)
    const res = await request(app).patch('/items/1/active').send({ is_active: true })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/activado/)
  })
})

describe('DELETE /items/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getItemById.mockResolvedValue(null)
    expect((await request(app).delete('/items/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.getItemById.mockResolvedValue({ id: 1 })
    services.deleteItem.mockResolvedValue(1)
    const res = await request(app).delete('/items/1')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminado/)
  })
})
