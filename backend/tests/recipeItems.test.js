import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllRecipeItems: vi.fn(), getRecipeItemById: vi.fn(), getRecipeByItemId: vi.fn(),
  getRecipesByIngredientId: vi.fn(), createRecipeItem: vi.fn(),
  updateRecipeItem: vi.fn(), deleteRecipeItem: vi.fn(), deleteRecipeByItemId: vi.fn(),
  getOrderById: vi.fn(), getUserById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getIngredientById: vi.fn(), getStockById: vi.fn(),
  getOrderItemById: vi.fn(), getInvoiceById: vi.fn(), getPaymentById: vi.fn(),
  getReservationById: vi.fn(), getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /recipe-items', () => {
  it('devolve lista de fichas técnicas', async () => {
    services.getAllRecipeItems.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const res = await request(app).get('/recipe-items')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('GET /recipe-items/item/:itemId', () => {
  it('devolve fichas técnicas do item', async () => {
    services.getRecipeByItemId.mockResolvedValue([{ id: 1, item_id: 3 }])
    const res = await request(app).get('/recipe-items/item/3')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('GET /recipe-items/ingredient/:ingredientId', () => {
  it('devolve fichas técnicas do ingrediente', async () => {
    services.getRecipesByIngredientId.mockResolvedValue([{ id: 2, ingredient_id: 5 }])
    const res = await request(app).get('/recipe-items/ingredient/5')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('GET /recipe-items/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.getRecipeItemById.mockResolvedValue(null)
    expect((await request(app).get('/recipe-items/999')).status).toBe(404)
  })
  it('devolve a ficha técnica', async () => {
    services.getRecipeItemById.mockResolvedValue({ id: 1, required_quantity: 0.5 })
    const res = await request(app).get('/recipe-items/1')
    expect(res.status).toBe(200)
    expect(res.body.required_quantity).toBe(0.5)
  })
})

describe('POST /recipe-items', () => {
  it('devolve 400 se campos obrigatórios estiverem em falta', async () => {
    const res = await request(app).post('/recipe-items').send({ item_id: 1, ingredient_id: 2 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })
  it('cria ficha técnica e devolve 201', async () => {
    services.createRecipeItem.mockResolvedValue({ id: 5, item_id: 1, ingredient_id: 2, required_quantity: 0.5 })
    const res = await request(app).post('/recipe-items').send({ item_id: 1, ingredient_id: 2, required_quantity: 0.5 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 5)
  })
})

describe('PUT /recipe-items/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.updateRecipeItem.mockResolvedValue(0)
    const res = await request(app).put('/recipe-items/999').send({ required_quantity: 1 })
    expect(res.status).toBe(404)
  })
  it('actualiza com sucesso', async () => {
    services.updateRecipeItem.mockResolvedValue(1)
    const res = await request(app).put('/recipe-items/1').send({ required_quantity: 1 })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizada/)
  })
})

describe('DELETE /recipe-items/item/:itemId', () => {
  it('elimina todas as fichas técnicas do item', async () => {
    services.deleteRecipeByItemId.mockResolvedValue(2)
    const res = await request(app).delete('/recipe-items/item/3')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/2/)
  })
})

describe('DELETE /recipe-items/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.deleteRecipeItem.mockResolvedValue(0)
    expect((await request(app).delete('/recipe-items/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.deleteRecipeItem.mockResolvedValue(1)
    const res = await request(app).delete('/recipe-items/1')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminada/)
  })
})
