import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllIngredients: vi.fn(), getIngredientById: vi.fn(),
  ingredientNameExists: vi.fn(), createIngredient: vi.fn(),
  updateIngredient: vi.fn(), deleteIngredient: vi.fn(),
  getOrderById: vi.fn(), getUserById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getStockById: vi.fn(), getOrderItemById: vi.fn(),
  getInvoiceById: vi.fn(), getPaymentById: vi.fn(), getReservationById: vi.fn(),
  getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /ingredients', () => {
  it('devolve lista com filtros aplicados', async () => {
    services.getAllIngredients.mockResolvedValue([{ id: 1, name: 'Farinha' }])
    const res = await request(app).get('/ingredients?search=far&sort=name')
    expect(res.status).toBe(200)
    expect(services.getAllIngredients).toHaveBeenCalledWith('far', 'name')
  })
  it('devolve 500 em erro', async () => {
    services.getAllIngredients.mockRejectedValue(new Error('fail'))
    expect((await request(app).get('/ingredients')).status).toBe(500)
  })
})

describe('GET /ingredients/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.getIngredientById.mockResolvedValue(null)
    expect((await request(app).get('/ingredients/999')).status).toBe(404)
  })
  it('devolve o ingrediente', async () => {
    services.getIngredientById.mockResolvedValue({ id: 1, name: 'Farinha' })
    const res = await request(app).get('/ingredients/1')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Farinha')
  })
})

describe('POST /ingredients', () => {
  it('devolve 400 se name ou measurement_unit estiverem em falta', async () => {
    const res = await request(app).post('/ingredients').send({ name: 'Sal' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })
  it('devolve 409 se o nome já existir', async () => {
    services.ingredientNameExists.mockResolvedValue(true)
    const res = await request(app).post('/ingredients').send({ name: 'Sal', measurement_unit: 'g' })
    expect(res.status).toBe(409)
  })
  it('cria ingrediente e devolve 201', async () => {
    services.ingredientNameExists.mockResolvedValue(false)
    services.createIngredient.mockResolvedValue({ id: 5, name: 'Sal', measurement_unit: 'g' })
    const res = await request(app).post('/ingredients').send({ name: 'Sal', measurement_unit: 'g' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 5)
  })
})

describe('PUT /ingredients/:id', () => {
  it('devolve 409 se o novo nome já existir', async () => {
    services.ingredientNameExists.mockResolvedValue(true)
    const res = await request(app).put('/ingredients/1').send({ name: 'Açúcar' })
    expect(res.status).toBe(409)
  })
  it('devolve 404 se o registo não existir', async () => {
    services.ingredientNameExists.mockResolvedValue(false)
    services.updateIngredient.mockResolvedValue(0)
    const res = await request(app).put('/ingredients/999').send({ name: 'Açúcar' })
    expect(res.status).toBe(404)
  })
  it('actualiza com sucesso', async () => {
    services.ingredientNameExists.mockResolvedValue(false)
    services.updateIngredient.mockResolvedValue(1)
    const res = await request(app).put('/ingredients/1').send({ measurement_unit: 'kg' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizado/)
  })
})

describe('DELETE /ingredients/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.deleteIngredient.mockResolvedValue(0)
    expect((await request(app).delete('/ingredients/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.deleteIngredient.mockResolvedValue(1)
    const res = await request(app).delete('/ingredients/1')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminado/)
  })
})
