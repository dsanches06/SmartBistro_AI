import { describe, it, expect, vi } from 'vitest'
import { ingredientService } from '../src/services/ingredientService.js'
import { api } from '../src/services/api.js'

vi.mock('../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('ingredientService', () => {
  it('getAll chama GET /ingredients', async () => {
    api.get.mockResolvedValue([{ id: 1, name: 'Farinha' }])
    const r = await ingredientService.getAll()
    expect(api.get).toHaveBeenCalledWith('/ingredients')
    expect(r).toHaveLength(1)
  })

  it('getById chama GET /ingredients/:id', async () => {
    api.get.mockResolvedValue({ id: 3, name: 'Sal' })
    const r = await ingredientService.getById(3)
    expect(api.get).toHaveBeenCalledWith('/ingredients/3')
    expect(r).toHaveProperty('name', 'Sal')
  })

  it('create chama POST /ingredients com os dados corretos', async () => {
    const data = { name: 'Azeite', measurement_unit: 'ml' }
    api.post.mockResolvedValue({ id: 10, ...data })
    const r = await ingredientService.create(data)
    expect(api.post).toHaveBeenCalledWith('/ingredients', data)
    expect(r).toHaveProperty('id', 10)
  })

  it('update chama PUT /ingredients/:id', async () => {
    api.put.mockResolvedValue({ message: 'Actualizado' })
    await ingredientService.update(3, { name: 'Sal fino' })
    expect(api.put).toHaveBeenCalledWith('/ingredients/3', { name: 'Sal fino' })
  })

  it('remove chama DELETE /ingredients/:id', async () => {
    api.delete.mockResolvedValue({ message: 'Eliminado' })
    await ingredientService.remove(3)
    expect(api.delete).toHaveBeenCalledWith('/ingredients/3')
  })
})
