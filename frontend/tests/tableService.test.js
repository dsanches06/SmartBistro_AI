import { describe, it, expect, vi } from 'vitest'
import { tableService } from '../src/services/tableService.js'
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

describe('tableService', () => {
  it('getAll chama GET /tables', async () => {
    api.get.mockResolvedValue([{ id: 1, number: 1 }, { id: 2, number: 2 }])
    const result = await tableService.getAll()
    expect(api.get).toHaveBeenCalledWith('/tables')
    expect(result).toHaveLength(2)
  })

  it('getById chama GET /tables/:id', async () => {
    api.get.mockResolvedValue({ id: 2, number: 2, capacity: 4 })
    const result = await tableService.getById(2)
    expect(api.get).toHaveBeenCalledWith('/tables/2')
    expect(result).toHaveProperty('capacity', 4)
  })

  it('getDetailsById chama GET /tables/:id/details', async () => {
    api.get.mockResolvedValue({ id: 2, orders: [], reservation: null })
    await tableService.getDetailsById(2)
    expect(api.get).toHaveBeenCalledWith('/tables/2/details')
  })

  it('getReservationById chama GET /tables/:id/reservation', async () => {
    api.get.mockResolvedValue(null)
    await tableService.getReservationById(2)
    expect(api.get).toHaveBeenCalledWith('/tables/2/reservation')
  })

  it('create chama POST /tables com os dados corretos', async () => {
    const data = { number: 5, capacity: 4, status: 'Free' }
    api.post.mockResolvedValue({ id: 5, ...data })
    const result = await tableService.create(data)
    expect(api.post).toHaveBeenCalledWith('/tables', data)
    expect(result).toHaveProperty('id', 5)
  })

  it('update chama PUT /tables/:id com os dados corretos', async () => {
    api.put.mockResolvedValue({ message: 'Mesa actualizada' })
    await tableService.update(2, { capacity: 6 })
    expect(api.put).toHaveBeenCalledWith('/tables/2', { capacity: 6 })
  })

  it('updateStatus chama PATCH /tables/:id/status com o status correto', async () => {
    api.patch.mockResolvedValue({})
    await tableService.updateStatus(2, 'Occupied')
    expect(api.patch).toHaveBeenCalledWith('/tables/2/status', { status: 'Occupied' })
  })

  it('updateStatus com status "Free"', async () => {
    api.patch.mockResolvedValue({})
    await tableService.updateStatus(3, 'Free')
    expect(api.patch).toHaveBeenCalledWith('/tables/3/status', { status: 'Free' })
  })

  it('remove chama DELETE /tables/:id', async () => {
    api.delete.mockResolvedValue({ message: 'Mesa eliminada' })
    await tableService.remove(2)
    expect(api.delete).toHaveBeenCalledWith('/tables/2')
  })
})
