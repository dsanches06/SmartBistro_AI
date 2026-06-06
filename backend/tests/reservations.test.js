import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllReservations: vi.fn(), getReservationById: vi.fn(), getReservationsByCustomerId: vi.fn(),
  createReservation: vi.fn(), updateReservationStatus: vi.fn(), cancelReservation: vi.fn(),
  deleteReservation: vi.fn(), updateTableStatus: vi.fn(),
  getOrderById: vi.fn(), getCustomerById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getIngredientById: vi.fn(), getStockById: vi.fn(),
  getOrderItemById: vi.fn(), getInvoiceById: vi.fn(), getPaymentById: vi.fn(),
  getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /reservations', () => {
  it('devolve lista com filtro de status', async () => {
    services.getAllReservations.mockResolvedValue([{ id: 1, status: 'Pending' }])
    const res = await request(app).get('/reservations?status=Pending')
    expect(res.status).toBe(200)
    expect(services.getAllReservations).toHaveBeenCalledWith('Pending')
  })
})

describe('GET /reservations/customer/:customerId', () => {
  it('devolve reservas do cliente', async () => {
    services.getReservationsByCustomerId.mockResolvedValue([{ id: 3, customer_id: 2 }])
    const res = await request(app).get('/reservations/customer/2')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('POST /reservations', () => {
  it('devolve 400 se reservation_date estiver em falta', async () => {
    const res = await request(app).post('/reservations').send({ customer_id: 1 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/reservation_date/)
  })
  it('cria reserva e devolve 201', async () => {
    services.createReservation.mockResolvedValue({ id: 8, reservation_date: '2026-07-01' })
    const res = await request(app).post('/reservations').send({
      customer_id: 1, reservation_date: '2026-07-01', party_size: 4,
    })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 8)
  })
})

describe('GET /reservations/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getReservationById.mockResolvedValue(null)
    expect((await request(app).get('/reservations/999')).status).toBe(404)
  })
  it('devolve a reserva', async () => {
    services.getReservationById.mockResolvedValue({ id: 5, status: 'Pending' })
    const res = await request(app).get('/reservations/5')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('Pending')
  })
})

describe('PATCH /reservations/:id/status', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getReservationById.mockResolvedValue(null)
    expect((await request(app).patch('/reservations/999/status').send({ status: 'Confirmed' })).status).toBe(404)
  })
  it('devolve 400 se status estiver em falta', async () => {
    services.getReservationById.mockResolvedValue({ id: 5 })
    services.updateReservationStatus.mockResolvedValue(0)
    const res = await request(app).patch('/reservations/5/status').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/status/)
  })
  it('actualiza o status com sucesso', async () => {
    services.getReservationById.mockResolvedValue({ id: 5 })
    services.updateReservationStatus.mockResolvedValue(1)
    const res = await request(app).patch('/reservations/5/status').send({ status: 'Confirmed' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/Confirmed/)
  })
})

describe('PATCH /reservations/:id/cancel', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getReservationById.mockResolvedValue(null)
    expect((await request(app).patch('/reservations/999/cancel')).status).toBe(404)
  })
  it('cancela a reserva e liberta a mesa', async () => {
    services.getReservationById.mockResolvedValue({ id: 5, table_id: 3 })
    services.cancelReservation.mockResolvedValue(1)
    services.updateTableStatus.mockResolvedValue(1)
    const res = await request(app).patch('/reservations/5/cancel')
    expect(res.status).toBe(200)
    expect(services.updateTableStatus).toHaveBeenCalledWith(3, 'Available')
    expect(res.body.table_id).toBe(3)
  })
  it('cancela a reserva sem mesa associada', async () => {
    services.getReservationById.mockResolvedValue({ id: 5, table_id: null })
    services.cancelReservation.mockResolvedValue(1)
    const res = await request(app).patch('/reservations/5/cancel')
    expect(res.status).toBe(200)
    expect(services.updateTableStatus).not.toHaveBeenCalled()
  })
})

describe('DELETE /reservations/:id', () => {
  it('devolve 404 se não existir (middleware)', async () => {
    services.getReservationById.mockResolvedValue(null)
    expect((await request(app).delete('/reservations/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.getReservationById.mockResolvedValue({ id: 5 })
    services.deleteReservation.mockResolvedValue(1)
    const res = await request(app).delete('/reservations/5')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminada/)
  })
})
