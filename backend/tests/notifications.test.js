import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({ db: { query: vi.fn() }, pgPool: {}, mysqlDb: {} }))
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }))
vi.mock('../src/services/index.js', () => ({
  getAllNotifications: vi.fn(), getNotificationById: vi.fn(), getNotificationsByUser: vi.fn(),
  getUnreadNotifications: vi.fn(), createNotification: vi.fn(), updateNotification: vi.fn(),
  markAsRead: vi.fn(), toggleReadStatus: vi.fn(), deleteNotification: vi.fn(),
  getOrderById: vi.fn(), getUserById: vi.fn(), getTableById: vi.fn(),
  getItemById: vi.fn(), getIngredientById: vi.fn(), getStockById: vi.fn(),
  getOrderItemById: vi.fn(), getInvoiceById: vi.fn(), getPaymentById: vi.fn(),
  getReservationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /notifications', () => {
  it('devolve lista de notificações', async () => {
    services.getAllNotifications.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const res = await request(app).get('/notifications')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('GET /notifications/customer/:customerId', () => {
  it('devolve notificações do cliente', async () => {
    services.getNotificationsByUser.mockResolvedValue([{ id: 3, user_id: 2 }])
    const res = await request(app).get('/notifications/customer/2')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })
})

describe('GET /notifications/customer/:customerId/unread', () => {
  it('devolve notificações não lidas do cliente', async () => {
    services.getUnreadNotifications.mockResolvedValue([{ id: 4, is_read: false }])
    const res = await request(app).get('/notifications/customer/2/unread')
    expect(res.status).toBe(200)
    expect(res.body[0].is_read).toBe(false)
  })
})

describe('GET /notifications/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.getNotificationById.mockResolvedValue(null)
    expect((await request(app).get('/notifications/999')).status).toBe(404)
  })
  it('devolve a notificação', async () => {
    services.getNotificationById.mockResolvedValue({ id: 5, message: 'Pedido pronto' })
    const res = await request(app).get('/notifications/5')
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Pedido pronto')
  })
})

describe('POST /notifications', () => {
  it('devolve 400 se user_id ou message estiverem em falta', async () => {
    const res = await request(app).post('/notifications').send({ user_id: 1 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/obrigatórios/)
  })
  it('cria notificação e devolve 201', async () => {
    services.createNotification.mockResolvedValue({ id: 9, user_id: 1, message: 'Olá' })
    const res = await request(app).post('/notifications').send({ user_id: 1, message: 'Olá' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 9)
  })
})

describe('PUT /notifications/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.updateNotification.mockResolvedValue(0)
    expect((await request(app).put('/notifications/999').send({ message: 'X' })).status).toBe(404)
  })
  it('actualiza com sucesso', async () => {
    services.updateNotification.mockResolvedValue(1)
    const res = await request(app).put('/notifications/5').send({ message: 'Actualizado' })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/actualizada/)
  })
})

describe('PATCH /notifications/:id/read', () => {
  it('devolve 404 se não existir', async () => {
    services.markAsRead.mockResolvedValue(0)
    expect((await request(app).patch('/notifications/999/read')).status).toBe(404)
  })
  it('marca como lida com sucesso', async () => {
    services.markAsRead.mockResolvedValue(1)
    const res = await request(app).patch('/notifications/5/read')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/lida/)
  })
})

describe('PATCH /notifications/:id/read-status', () => {
  it('devolve 400 se is_read estiver em falta', async () => {
    const res = await request(app).patch('/notifications/5/read-status').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/is_read/)
  })
  it('devolve 404 se não existir', async () => {
    services.toggleReadStatus.mockResolvedValue(0)
    const res = await request(app).patch('/notifications/999/read-status').send({ is_read: true })
    expect(res.status).toBe(404)
  })
  it('alterna o estado de leitura com sucesso', async () => {
    services.toggleReadStatus.mockResolvedValue(1)
    const res = await request(app).patch('/notifications/5/read-status').send({ is_read: false })
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/não lida/)
  })
})

describe('DELETE /notifications/:id', () => {
  it('devolve 404 se não existir', async () => {
    services.deleteNotification.mockResolvedValue(0)
    expect((await request(app).delete('/notifications/999')).status).toBe(404)
  })
  it('elimina com sucesso', async () => {
    services.deleteNotification.mockResolvedValue(1)
    const res = await request(app).delete('/notifications/5')
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/eliminada/)
  })
})
