import { describe, it, expect, vi } from 'vitest'
import { api } from '../src/services/api.js'

function mockFetch(data, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  })
}

describe('api', () => {
  describe('api.get', () => {
    it('faz GET para o endpoint correto e devolve JSON', async () => {
      const spy = mockFetch([{ id: 1 }])
      const result = await api.get('/items')
      expect(spy).toHaveBeenCalledWith('/api/items', expect.objectContaining({}))
      expect(result).toEqual([{ id: 1 }])
    })

    it('lança erro quando a resposta não é ok', async () => {
      mockFetch(null, false, 404)
      await expect(api.get('/items/999')).rejects.toThrow('API 404')
    })
  })

  describe('api.post', () => {
    it('faz POST com body JSON e headers corretos', async () => {
      const spy = mockFetch({ id: 10 }, true, 201)
      const payload = { name: 'Hamburguer', price: 8.5 }
      const result = await api.post('/items', payload)
      expect(spy).toHaveBeenCalledWith(
        '/api/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      )
      expect(result).toEqual({ id: 10 })
    })

    it('lança erro quando a resposta não é ok', async () => {
      mockFetch({ error: 'Bad Request' }, false, 400)
      await expect(api.post('/items', {})).rejects.toThrow('API 400')
    })
  })

  describe('api.put', () => {
    it('faz PUT com body JSON correto', async () => {
      const spy = mockFetch({ updated: true })
      await api.put('/items/1', { name: 'Atualizado' })
      expect(spy).toHaveBeenCalledWith(
        '/api/items/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Atualizado' }),
        }),
      )
    })
  })

  describe('api.patch', () => {
    it('faz PATCH com body JSON correto', async () => {
      const spy = mockFetch({ patched: true })
      await api.patch('/items/1/active', { is_active: false })
      expect(spy).toHaveBeenCalledWith(
        '/api/items/1/active',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ is_active: false }),
        }),
      )
    })
  })

  describe('api.delete', () => {
    it('faz DELETE para o endpoint correto', async () => {
      const spy = mockFetch({ deleted: true })
      await api.delete('/items/1')
      expect(spy).toHaveBeenCalledWith(
        '/api/items/1',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('lança erro quando a resposta não é ok', async () => {
      mockFetch(null, false, 404)
      await expect(api.delete('/items/999')).rejects.toThrow('API 404')
    })
  })
})
