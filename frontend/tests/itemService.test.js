import { describe, it, expect, vi } from 'vitest'
import { itemService } from '../src/services/itemService.js'
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

describe('itemService', () => {
  it('getAll chama GET /items', async () => {
    api.get.mockResolvedValue([{ id: 1, name: 'Pizza' }, { id: 2, name: 'Hamburguer' }])
    const result = await itemService.getAll()
    expect(api.get).toHaveBeenCalledWith('/items')
    expect(result).toHaveLength(2)
  })

  it('getActive chama GET /items/active', async () => {
    api.get.mockResolvedValue([{ id: 1, name: 'Pizza', is_active: true }])
    const result = await itemService.getActive()
    expect(api.get).toHaveBeenCalledWith('/items/active')
    expect(result[0]).toHaveProperty('is_active', true)
  })

  it('getById chama GET /items/:id', async () => {
    api.get.mockResolvedValue({ id: 1, name: 'Pizza', price: 9.5 })
    const result = await itemService.getById(1)
    expect(api.get).toHaveBeenCalledWith('/items/1')
    expect(result).toHaveProperty('price', 9.5)
  })

  it('create chama POST /items com os dados corretos', async () => {
    const data = { name: 'Hamburguer', price: 8.5, is_active: true }
    api.post.mockResolvedValue({ id: 10, ...data })
    const result = await itemService.create(data)
    expect(api.post).toHaveBeenCalledWith('/items', data)
    expect(result).toHaveProperty('id', 10)
  })

  it('update chama PUT /items/:id com os dados corretos', async () => {
    api.put.mockResolvedValue({ message: 'Item actualizado' })
    await itemService.update(1, { price: 9.0 })
    expect(api.put).toHaveBeenCalledWith('/items/1', { price: 9.0 })
  })

  it('toggleActive chama PATCH /items/:id/active com is_active=false', async () => {
    api.patch.mockResolvedValue({})
    await itemService.toggleActive(1, false)
    expect(api.patch).toHaveBeenCalledWith('/items/1/active', { is_active: false })
  })

  it('toggleActive chama PATCH /items/:id/active com is_active=true', async () => {
    api.patch.mockResolvedValue({})
    await itemService.toggleActive(2, true)
    expect(api.patch).toHaveBeenCalledWith('/items/2/active', { is_active: true })
  })

  it('remove chama DELETE /items/:id', async () => {
    api.delete.mockResolvedValue({ message: 'Item eliminado' })
    await itemService.remove(1)
    expect(api.delete).toHaveBeenCalledWith('/items/1')
  })

  it('propaga o erro lançado pelo api', async () => {
    api.get.mockRejectedValue(new Error('API 404 — /items/999'))
    await expect(itemService.getById(999)).rejects.toThrow('API 404')
  })
})
