import { describe, it, expect, vi } from 'vitest'
import { paymentService } from '../src/services/paymentService.js'
import { api } from '../src/services/api.js'

vi.mock('../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('paymentService', () => {
  it('getAll chama GET /payments', async () => {
    api.get.mockResolvedValue([])
    await paymentService.getAll()
    expect(api.get).toHaveBeenCalledWith('/payments')
  })

  it('getById chama GET /payments/:id', async () => {
    api.get.mockResolvedValue({ id: 1, amount: 22.6 })
    const r = await paymentService.getById(1)
    expect(api.get).toHaveBeenCalledWith('/payments/1')
    expect(r).toHaveProperty('amount', 22.6)
  })

  it('getByInvoice chama GET /payments/invoice/:invoiceId', async () => {
    api.get.mockResolvedValue({ id: 1, invoice_id: 5 })
    await paymentService.getByInvoice(5)
    expect(api.get).toHaveBeenCalledWith('/payments/invoice/5')
  })

  it('getByUser chama GET /payments/user/:userId', async () => {
    api.get.mockResolvedValue([])
    await paymentService.getByUser(3)
    expect(api.get).toHaveBeenCalledWith('/payments/user/3')
  })

  it('create chama POST /payments com os dados corretos', async () => {
    const data = { invoice_id: 5, amount: 22.6, payment_method: 'MB Way', payment_status: 'Pending' }
    api.post.mockResolvedValue({ id: 30, ...data })
    const r = await paymentService.create(data)
    expect(api.post).toHaveBeenCalledWith('/payments', data)
    expect(r).toHaveProperty('id', 30)
  })

  it('update chama PUT /payments/:id', async () => {
    api.put.mockResolvedValue({})
    await paymentService.update(1, { payment_method: 'Cash' })
    expect(api.put).toHaveBeenCalledWith('/payments/1', { payment_method: 'Cash' })
  })

  it('process chama PATCH /payments/:id/process', async () => {
    api.patch.mockResolvedValue({})
    await paymentService.process(1, {})
    expect(api.patch).toHaveBeenCalledWith('/payments/1/process', {})
  })

  it('fail chama PATCH /payments/:id/fail', async () => {
    api.patch.mockResolvedValue({})
    await paymentService.fail(1, {})
    expect(api.patch).toHaveBeenCalledWith('/payments/1/fail', {})
  })

  it('remove chama DELETE /payments/:id', async () => {
    api.delete.mockResolvedValue({})
    await paymentService.remove(1)
    expect(api.delete).toHaveBeenCalledWith('/payments/1')
  })
})
