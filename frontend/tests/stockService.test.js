import { describe, it, expect, vi } from 'vitest'
import { stockService } from '../src/services/stockService.js'
import { api } from '../src/services/api.js'

vi.mock('../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('stockService', () => {
  it('getAll chama GET /stock', async () => {
    api.get.mockResolvedValue([{ id: 1, available_quantity: 100 }])
    const r = await stockService.getAll()
    expect(api.get).toHaveBeenCalledWith('/stock')
    expect(r).toHaveLength(1)
  })

  it('getById chama GET /stock/:id', async () => {
    api.get.mockResolvedValue({ id: 2, available_quantity: 50 })
    const r = await stockService.getById(2)
    expect(api.get).toHaveBeenCalledWith('/stock/2')
    expect(r).toHaveProperty('available_quantity', 50)
  })

  it('getByIngredient chama GET /stock/ingredient/:ingredientId', async () => {
    api.get.mockResolvedValue({ id: 1, ingredient_id: 5 })
    await stockService.getByIngredient(5)
    expect(api.get).toHaveBeenCalledWith('/stock/ingredient/5')
  })

  it('create chama POST /stock com os dados corretos', async () => {
    const data = { ingredient_id: 3, available_quantity: 200, unit_cost: 0.5 }
    api.post.mockResolvedValue({ id: 8, ...data })
    const r = await stockService.create(data)
    expect(api.post).toHaveBeenCalledWith('/stock', data)
    expect(r).toHaveProperty('id', 8)
  })

  it('update chama PUT /stock/:id', async () => {
    api.put.mockResolvedValue({})
    await stockService.update(2, { available_quantity: 150 })
    expect(api.put).toHaveBeenCalledWith('/stock/2', { available_quantity: 150 })
  })

  it('adjustQuantity chama PATCH /stock/ingredient/:ingredientId/adjust', async () => {
    api.patch.mockResolvedValue({})
    await stockService.adjustQuantity(5, { delta: -10 })
    expect(api.patch).toHaveBeenCalledWith('/stock/ingredient/5/adjust', { delta: -10 })
  })

  it('remove chama DELETE /stock/:id', async () => {
    api.delete.mockResolvedValue({})
    await stockService.remove(2)
    expect(api.delete).toHaveBeenCalledWith('/stock/2')
  })
})
