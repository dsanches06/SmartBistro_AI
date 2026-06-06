import { describe, it, expect, vi } from 'vitest'
import { orderItemService } from '../src/services/orderItemService.js'
import { api } from '../src/services/api.js'

vi.mock('../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('orderItemService', () => {
  it('getAll chama GET /order-items', async () => {
    api.get.mockResolvedValue([])
    await orderItemService.getAll()
    expect(api.get).toHaveBeenCalledWith('/order-items')
  })

  it('getById chama GET /order-items/:id', async () => {
    api.get.mockResolvedValue({ id: 1, quantity: 2 })
    const r = await orderItemService.getById(1)
    expect(api.get).toHaveBeenCalledWith('/order-items/1')
    expect(r).toHaveProperty('quantity', 2)
  })

  it('getByOrder chama GET /order-items/order/:orderId', async () => {
    api.get.mockResolvedValue([{ id: 1 }, { id: 2 }])
    await orderItemService.getByOrder(10)
    expect(api.get).toHaveBeenCalledWith('/order-items/order/10')
  })

  it('create chama POST /order-items com os dados corretos', async () => {
    const data = { order_id: 10, item_id: 3, quantity: 2 }
    api.post.mockResolvedValue({ id: 20, ...data })
    const r = await orderItemService.create(data)
    expect(api.post).toHaveBeenCalledWith('/order-items', data)
    expect(r).toHaveProperty('id', 20)
  })

  it('createBulk chama POST /order-items/bulk', async () => {
    const items = { order_id: 1, items: [{ item_id: 1, quantity: 2 }] }
    api.post.mockResolvedValue([{ id: 30 }])
    await orderItemService.createBulk(items)
    expect(api.post).toHaveBeenCalledWith('/order-items/bulk', items)
  })

  it('updateQuantity chama PATCH /order-items/:id', async () => {
    api.patch.mockResolvedValue({})
    await orderItemService.updateQuantity(1, { quantity: 5 })
    expect(api.patch).toHaveBeenCalledWith('/order-items/1', { quantity: 5 })
  })

  it('remove chama DELETE /order-items/:id', async () => {
    api.delete.mockResolvedValue({})
    await orderItemService.remove(1)
    expect(api.delete).toHaveBeenCalledWith('/order-items/1')
  })

  it('removeByOrder chama DELETE /order-items/order/:orderId', async () => {
    api.delete.mockResolvedValue({})
    await orderItemService.removeByOrder(10)
    expect(api.delete).toHaveBeenCalledWith('/order-items/order/10')
  })
})
