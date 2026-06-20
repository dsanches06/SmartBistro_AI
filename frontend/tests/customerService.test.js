import { describe, it, expect, vi } from 'vitest'
import { userService } from '../src/services/userService.js'
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

describe('userService', () => {
  it('getAll chama GET /users', async () => {
    api.get.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const result = await userService.getAll()
    expect(api.get).toHaveBeenCalledWith('/users')
    expect(result).toHaveLength(2)
  })

  it('getById chama GET /users/:id', async () => {
    api.get.mockResolvedValue({ id: 1, name: 'João' })
    const result = await userService.getById(1)
    expect(api.get).toHaveBeenCalledWith('/users/1')
    expect(result).toHaveProperty('name', 'João')
  })

  it('create chama POST /users com os dados corretos', async () => {
    const data = { name: 'Maria', email: 'maria@email.com', phone: '912345678' }
    api.post.mockResolvedValue({ id: 5, ...data })
    const result = await userService.create(data)
    expect(api.post).toHaveBeenCalledWith('/users', data)
    expect(result).toHaveProperty('id', 5)
  })

  it('update chama PUT /users/:id com os dados corretos', async () => {
    api.put.mockResolvedValue({ message: 'Actualizado' })
    await userService.update(1, { name: 'Maria Atualizada' })
    expect(api.put).toHaveBeenCalledWith('/users/1', { name: 'Maria Atualizada' })
  })

  it('toggleActive chama PATCH /users/:id/active', async () => {
    api.patch.mockResolvedValue({})
    await userService.toggleActive(1, false)
    expect(api.patch).toHaveBeenCalledWith('/users/1/active', { active: false })
  })

  it('toggleActive com active=true', async () => {
    api.patch.mockResolvedValue({})
    await userService.toggleActive(2, true)
    expect(api.patch).toHaveBeenCalledWith('/users/2/active', { active: true })
  })

  it('remove chama DELETE /users/:id', async () => {
    api.delete.mockResolvedValue({ message: 'Eliminado' })
    await userService.remove(1)
    expect(api.delete).toHaveBeenCalledWith('/users/1')
  })

  it('getNotifications chama GET /users/:id/notifications', async () => {
    api.get.mockResolvedValue([{ id: 10, title: 'Pedido pronto' }])
    const result = await userService.getNotifications(1)
    expect(api.get).toHaveBeenCalledWith('/users/1/notifications')
    expect(result).toHaveLength(1)
  })

  it('getUnreadNotifications chama GET /users/:id/notifications/unread', async () => {
    api.get.mockResolvedValue([])
    await userService.getUnreadNotifications(1)
    expect(api.get).toHaveBeenCalledWith('/users/1/notifications/unread')
  })

  it('markNotificationRead chama PATCH /users/:id/notifications/:notificationId', async () => {
    api.patch.mockResolvedValue({})
    await userService.markNotificationRead(1, 99)
    expect(api.patch).toHaveBeenCalledWith('/users/1/notifications/99')
  })
})
