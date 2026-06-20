import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllRoles: vi.fn(), getRoleById: vi.fn(),
  getOrderById: vi.fn(), getUserById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getIngredientById: vi.fn(), getStockById: vi.fn(),
  getOrderItemById: vi.fn(), getInvoiceById: vi.fn(), getPaymentById: vi.fn(),
  getReservationById: vi.fn(), getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /roles', () => {
  it('devolve lista de roles', async () => {
    services.getAllRoles.mockResolvedValue([{ id: 1, name: 'Admin' }, { id: 2, name: 'Waiter' }])
    const res = await request(app).get('/roles')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
  it('devolve 500 em erro de serviço', async () => {
    services.getAllRoles.mockRejectedValue(new Error('db fail'))
    expect((await request(app).get('/roles')).status).toBe(500)
  })
})

describe('GET /roles/:id', () => {
  it('devolve 404 se o role não existir', async () => {
    services.getRoleById.mockResolvedValue(null)
    expect((await request(app).get('/roles/999')).status).toBe(404)
  })
  it('devolve o role', async () => {
    services.getRoleById.mockResolvedValue({ id: 1, name: 'Admin' })
    const res = await request(app).get('/roles/1')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Admin')
  })
})
