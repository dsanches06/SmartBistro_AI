import { describe, it, expect, vi } from 'vitest'
import { reservationService } from '../src/services/reservationService.js'
import { api } from '../src/services/api.js'

vi.mock('../src/services/api.js', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

describe('reservationService', () => {
  it('getAll chama GET /reservations', async () => {
    api.get.mockResolvedValue([])
    await reservationService.getAll()
    expect(api.get).toHaveBeenCalledWith('/reservations')
  })

  it('getById chama GET /reservations/:id', async () => {
    api.get.mockResolvedValue({ id: 1, party_size: 4 })
    const r = await reservationService.getById(1)
    expect(api.get).toHaveBeenCalledWith('/reservations/1')
    expect(r).toHaveProperty('party_size', 4)
  })

  it('getByUser chama GET /reservations/user/:userId', async () => {
    api.get.mockResolvedValue([])
    await reservationService.getByUser(2)
    expect(api.get).toHaveBeenCalledWith('/reservations/user/2')
  })

  it('create chama POST /reservations com os dados corretos', async () => {
    const data = { user_id: 1, table_id: 3, reservation_date: '2026-07-01T20:00:00', party_size: 2 }
    api.post.mockResolvedValue({ id: 5, ...data })
    const r = await reservationService.create(data)
    expect(api.post).toHaveBeenCalledWith('/reservations', data)
    expect(r).toHaveProperty('id', 5)
  })

  it('updateStatus chama PATCH /reservations/:id/status', async () => {
    api.patch.mockResolvedValue({})
    await reservationService.updateStatus(1, 'Confirmed')
    expect(api.patch).toHaveBeenCalledWith('/reservations/1/status', { status: 'Confirmed' })
  })

  it('confirm é um atalho para updateStatus Confirmed', async () => {
    api.patch.mockResolvedValue({})
    await reservationService.confirm(1)
    expect(api.patch).toHaveBeenCalledWith('/reservations/1/status', { status: 'Confirmed' })
  })

  it('cancel chama PATCH /reservations/:id/cancel', async () => {
    api.patch.mockResolvedValue({})
    await reservationService.cancel(1)
    expect(api.patch).toHaveBeenCalledWith('/reservations/1/cancel')
  })

  it('remove chama DELETE /reservations/:id', async () => {
    api.delete.mockResolvedValue({})
    await reservationService.remove(1)
    expect(api.delete).toHaveBeenCalledWith('/reservations/1')
  })
})
