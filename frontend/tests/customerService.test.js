import { describe, it, expect, vi } from 'vitest'
import { customerService } from '../src/services/customerService.js'
import { api } from '../src/services/api.js'

vi.mock('../src/services/api.js', () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    put:    vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}))

describe('customerService', () => {
  it('getAll chama GET /customers', async () => {
    api.get.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const result = await customerService.getAll()
    expect(api.get).toHaveBeenCalledWith('/customers')
    expect(result).toHaveLength(2)
  })

  it('getById chama GET /customers/:id', async () => {
    api.get.mockResolvedValue({ id: 1, name: 'João' })
    const result = await customerService.getById(1)
    expect(api.get).toHaveBeenCalledWith('/customers/1')
    expect(result).toHaveProperty('name', 'João')
  })

  it('create chama POST /customers com os dados corretos', async () => {
    const data = { name: 'Maria', email: 'maria@email.com', phone: '912345678' }
    api.post.mockResolvedValue({ id: 5, ...data })
    const result = await customerService.create(data)
    expect(api.post).toHaveBeenCalledWith('/customers', data)
    expect(result).toHaveProperty('id', 5)
  })

  it('update chama PUT /customers/:id com os dados corretos', async () => {
    api.put.mockResolvedValue({ message: 'Actualizado' })
    await customerService.update(1, { name: 'Maria Atualizada' })
    expect(api.put).toHaveBeenCalledWith('/customers/1', { name: 'Maria Atualizada' })
  })

  it('toggleActive chama PATCH /customers/:id/active', async () => {
    api.patch.mockResolvedValue({})
    await customerService.toggleActive(1, false)
    expect(api.patch).toHaveBeenCalledWith('/customers/1/active', { active: false })
  })

  it('toggleActive com active=true', async () => {
    api.patch.mockResolvedValue({})
    await customerService.toggleActive(2, true)
    expect(api.patch).toHaveBeenCalledWith('/customers/2/active', { active: true })
  })

  it('remove chama DELETE /customers/:id', async () => {
    api.delete.mockResolvedValue({ message: 'Eliminado' })
    await customerService.remove(1)
    expect(api.delete).toHaveBeenCalledWith('/customers/1')
  })

  it('getNotifications chama GET /customers/:id/notifications', async () => {
    api.get.mockResolvedValue([{ id: 10, title: 'Pedido pronto' }])
    const result = await customerService.getNotifications(1)
    expect(api.get).toHaveBeenCalledWith('/customers/1/notifications')
    expect(result).toHaveLength(1)
  })

  it('getUnreadNotifications chama GET /customers/:id/notifications/unread', async () => {
    api.get.mockResolvedValue([])
    await customerService.getUnreadNotifications(1)
    expect(api.get).toHaveBeenCalledWith('/customers/1/notifications/unread')
  })

  it('markNotificationRead chama PATCH /customers/:id/notifications/:notificationId', async () => {
    api.patch.mockResolvedValue({})
    await customerService.markNotificationRead(1, 99)
    expect(api.patch).toHaveBeenCalledWith('/customers/1/notifications/99')
  })
})
