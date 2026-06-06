import { describe, it, expect, vi } from 'vitest'
import { invoiceService } from '../src/services/invoiceService.js'
import { api } from '../src/services/api.js'

vi.mock('../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('invoiceService', () => {
  it('getAll chama GET /invoices', async () => {
    api.get.mockResolvedValue([{ id: 1 }, { id: 2 }])
    const r = await invoiceService.getAll()
    expect(api.get).toHaveBeenCalledWith('/invoices')
    expect(r).toHaveLength(2)
  })

  it('getById chama GET /invoices/:id', async () => {
    api.get.mockResolvedValue({ id: 5, total_amount: 22.6 })
    const r = await invoiceService.getById(5)
    expect(api.get).toHaveBeenCalledWith('/invoices/5')
    expect(r).toHaveProperty('total_amount', 22.6)
  })

  it('getByOrder chama GET /invoices/order/:orderId', async () => {
    api.get.mockResolvedValue({ id: 5, order_id: 10 })
    await invoiceService.getByOrder(10)
    expect(api.get).toHaveBeenCalledWith('/invoices/order/10')
  })

  it('create chama POST /invoices com os dados corretos', async () => {
    const data = { order_id: 1, subtotal_amount: 20, tax_amount: 2.6, total_amount: 22.6, profit_margin: 5 }
    api.post.mockResolvedValue({ id: 7, ...data })
    const r = await invoiceService.create(data)
    expect(api.post).toHaveBeenCalledWith('/invoices', data)
    expect(r).toHaveProperty('id', 7)
  })

  it('update chama PUT /invoices/:id', async () => {
    api.put.mockResolvedValue({ message: 'Actualizada' })
    await invoiceService.update(5, { total_amount: 25 })
    expect(api.put).toHaveBeenCalledWith('/invoices/5', { total_amount: 25 })
  })

  it('remove chama DELETE /invoices/:id', async () => {
    api.delete.mockResolvedValue({ message: 'Eliminada' })
    await invoiceService.remove(5)
    expect(api.delete).toHaveBeenCalledWith('/invoices/5')
  })
})
