import { describe, it, expect, vi } from 'vitest'
import { notificationService } from '../src/services/notificationService.js'
import { api } from '../src/services/api.js'

vi.mock('../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('notificationService', () => {
  it('getAll chama GET /notifications', async () => {
    api.get.mockResolvedValue([])
    await notificationService.getAll()
    expect(api.get).toHaveBeenCalledWith('/notifications')
  })

  it('getById chama GET /notifications/:id', async () => {
    api.get.mockResolvedValue({ id: 1, title: 'Pedido pronto' })
    const r = await notificationService.getById(1)
    expect(api.get).toHaveBeenCalledWith('/notifications/1')
    expect(r).toHaveProperty('title', 'Pedido pronto')
  })

  it('getByCustomer chama GET /notifications/customer/:customerId', async () => {
    api.get.mockResolvedValue([{ id: 1 }])
    await notificationService.getByCustomer(5)
    expect(api.get).toHaveBeenCalledWith('/notifications/customer/5')
  })

  it('getUnread chama GET /notifications/customer/:customerId/unread', async () => {
    api.get.mockResolvedValue([])
    await notificationService.getUnread(5)
    expect(api.get).toHaveBeenCalledWith('/notifications/customer/5/unread')
  })

  it('create chama POST /notifications com os dados corretos', async () => {
    const data = { customer_id: 1, title: 'Aviso', message: 'Pedido pronto' }
    api.post.mockResolvedValue({ id: 10, ...data })
    const r = await notificationService.create(data)
    expect(api.post).toHaveBeenCalledWith('/notifications', data)
    expect(r).toHaveProperty('id', 10)
  })

  it('update chama PUT /notifications/:id', async () => {
    api.put.mockResolvedValue({})
    await notificationService.update(1, { title: 'Novo título' })
    expect(api.put).toHaveBeenCalledWith('/notifications/1', { title: 'Novo título' })
  })

  it('markAsRead chama PATCH /notifications/:id/read', async () => {
    api.patch.mockResolvedValue({})
    await notificationService.markAsRead(1)
    expect(api.patch).toHaveBeenCalledWith('/notifications/1/read')
  })

  it('toggleReadStatus chama PATCH /notifications/:id/read-status', async () => {
    api.patch.mockResolvedValue({})
    await notificationService.toggleReadStatus(1)
    expect(api.patch).toHaveBeenCalledWith('/notifications/1/read-status')
  })

  it('remove chama DELETE /notifications/:id', async () => {
    api.delete.mockResolvedValue({})
    await notificationService.remove(1)
    expect(api.delete).toHaveBeenCalledWith('/notifications/1')
  })
})
