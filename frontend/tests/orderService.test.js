import { describe, it, expect, vi } from 'vitest'
import { orderService } from '../src/services/orderService.js'
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

describe('orderService', () => {
  it('getAll chama GET /orders', async () => {
    api.get.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const result = await orderService.getAll()
    expect(api.get).toHaveBeenCalledWith('/orders')
    expect(result).toHaveLength(2)
  })

  it('getPending chama GET /orders/pending', async () => {
    api.get.mockResolvedValue([{ id: 3 }])
    await orderService.getPending()
    expect(api.get).toHaveBeenCalledWith('/orders/pending')
  })

  it('getById chama GET /orders/:id', async () => {
    api.get.mockResolvedValue({ id: 5, service_type: 'Table' })
    const result = await orderService.getById(5)
    expect(api.get).toHaveBeenCalledWith('/orders/5')
    expect(result).toHaveProperty('id', 5)
  })

  it('getByUser chama GET /orders/user/:userId', async () => {
    api.get.mockResolvedValue([])
    await orderService.getByUser(3)
    expect(api.get).toHaveBeenCalledWith('/orders/user/3')
  })

  it('create chama POST /orders com os dados corretos', async () => {
    const data = { service_type: 'Table', kitchen_sequence_json: [{ item_id: 1, quantity: 2 }] }
    api.post.mockResolvedValue({ id: 10, ...data })
    const result = await orderService.create(data)
    expect(api.post).toHaveBeenCalledWith('/orders', data)
    expect(result).toHaveProperty('id', 10)
  })

  it('update chama PUT /orders/:id com os dados corretos', async () => {
    const data = { order_status: 'Preparing' }
    api.put.mockResolvedValue({ message: 'Pedido actualizado com sucesso' })
    await orderService.update(5, data)
    expect(api.put).toHaveBeenCalledWith('/orders/5', data)
  })

  it('updateStatus chama PATCH /orders/:id/status com o status correto', async () => {
    api.patch.mockResolvedValue({ message: 'Status actualizado' })
    await orderService.updateStatus(5, 'Ready')
    expect(api.patch).toHaveBeenCalledWith('/orders/5/status', { order_status: 'Ready' })
  })

  it('remove chama DELETE /orders/:id', async () => {
    api.delete.mockResolvedValue({ message: 'Pedido eliminado com sucesso' })
    await orderService.remove(5)
    expect(api.delete).toHaveBeenCalledWith('/orders/5')
  })

  it('runPipeline chama POST /orders/pipeline', async () => {
    const data = { items: [{ name: 'Pizza', quantity: 1 }] }
    api.post.mockResolvedValue({ success: true })
    await orderService.runPipeline(data)
    expect(api.post).toHaveBeenCalledWith('/orders/pipeline', data)
  })

  it('chefStart chama POST /orders/:id/chef-start', async () => {
    api.post.mockResolvedValue({})
    await orderService.chefStart(7)
    expect(api.post).toHaveBeenCalledWith('/orders/7/chef-start')
  })

  it('propaga o erro lançado pelo api', async () => {
    api.get.mockRejectedValue(new Error('API 500'))
    await expect(orderService.getAll()).rejects.toThrow('API 500')
  })
})
