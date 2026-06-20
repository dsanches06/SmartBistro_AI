import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllStock: vi.fn(), getStockById: vi.fn(), getStockByIngredientId: vi.fn(),
  stockExistsForIngredient: vi.fn(), createStock: vi.fn(), updateStock: vi.fn(),
  adjustQuantity: vi.fn(), deleteStock: vi.fn(),
  getOrderById: vi.fn(), getUserById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getIngredientById: vi.fn(), getOrderItemById: vi.fn(),
  getInvoiceById: vi.fn(), getPaymentById: vi.fn(), getReservationById: vi.fn(),
  getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /stock', () => {
  it('devolve lista de stock', async () => {
    services.getAllStock.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const res = await request(app).get('/stock')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('GET /stock/ingredient/:ingredientId', () => {
  it('devolve 404 se não houver stock para o ingrediente', async () => {
    services.getStockByIngredientId.mockResolvedValue(null)
    expect((await request(app).get('/stock/ingredient/99')).status).toBe(404)
  })
  it('devolve o stock do ingrediente', async () => {
    services.getStockByIngredientId.mockResolvedValue({ id: 2, ingredient_id: 5 })
    const res = await request(app).get('/stock/ingredient/5')
    expect(res.status).toBe(200)
    expect(res.body.ingredient_id).toBe(5)
  })
})

describe('GET /stock/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.getStockById.mockResolvedValue(null)
    expect((await request(app).get('/stock/999')).status).toBe(404)
  })
  it('devolve o registo de stock', async () => {
    services.getStockById.mockResolvedValue({ id: 3, available_quantity: 100 })
    const res = await request(app).get('/stock/3')
    expect(res.status).toBe(200)
    expect(res.body.available_quantity).toBe(100)
  })
})

describe('POST /stock', () => {
  it('devolve 400 se ingredient_id estiver em falta', async () => {
    const res = await request(app).post('/stock').send({ available_quantity: 100 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/ingredient_id/)
  })
  it('devolve 409 se já existir stock para o ingrediente', async () => {
    services.stockExistsForIngredient.mockResolvedValue(true)
    const res = await request(app).post('/stock').send({ ingredient_id: 3 })
    expect(res.status).toBe(409)
  })
  it('cria o registo de stock e devolve 201', async () => {
    services.stockExistsForIngredient.mockResolvedValue(false)
    services.createStock.mockResolvedValue({ id: 9, ingredient_id: 3, available_quantity: 200 })
    const res = await request(app).post('/stock').send({ ingredient_id: 3, available_quantity: 200 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 9)
  })
})

describe('PUT /stock/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.updateStock.mockResolvedValue(0)
    expect((await request(app).put('/stock/999').send({ available_quantity: 50 })).status).toBe(404)
  })
  it('actualiza com sucesso', async () => {
    services.updateStock.mockResolvedValue(1)
    const res = await request(app).put('/stock/3').send({ available_quantity: 50 })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizado/)
  })
})

describe('PATCH /stock/ingredient/:ingredientId/adjust', () => {
  it('devolve 400 se delta estiver em falta', async () => {
    const res = await request(app).patch('/stock/ingredient/5/adjust').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/delta/)
  })
  it('devolve 404 se não houver stock para o ingrediente', async () => {
    services.adjustQuantity.mockResolvedValue(0)
    const res = await request(app).patch('/stock/ingredient/99/adjust').send({ delta: -10 })
    expect(res.status).toBe(404)
  })
  it('ajusta a quantidade com sucesso', async () => {
    services.adjustQuantity.mockResolvedValue(1)
    const res = await request(app).patch('/stock/ingredient/5/adjust').send({ delta: -10 })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/-10/)
  })
})

describe('DELETE /stock/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.deleteStock.mockResolvedValue(0)
    expect((await request(app).delete('/stock/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.deleteStock.mockResolvedValue(1)
    const res = await request(app).delete('/stock/3')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminado/)
  })
})
