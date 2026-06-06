import { describe, it, expect, vi } from 'vitest'
import BaseService from '../src/services/BaseService.js'

function mockFetch(body, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(body),
  })
}

describe('BaseService', () => {
  const service = new BaseService('/endpoint-base')

  describe('fetchData', () => {
    it('faz GET e devolve o JSON da resposta', async () => {
      mockFetch([{ id: 1 }, { id: 2 }])
      const result = await service.fetchData('/endpoint-base')
      expect(result).toEqual([{ id: 1 }, { id: 2 }])
    })

    it('lança erro com mensagem de status se a resposta não é ok', async () => {
      mockFetch(null, false, 500)
      await expect(service.fetchData('/endpoint-base')).rejects.toThrow('Erro ao buscar dados: 500')
    })
  })

  describe('sendMessage', () => {
    it('faz POST com o payload e devolve JSON', async () => {
      const spy = mockFetch({ created: true })
      const result = await service.sendMessage('/endpoint-base', { key: 'value' })
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('/endpoint-base'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ key: 'value' }),
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      expect(result).toEqual({ created: true })
    })

    it('lança erro se a resposta não é ok', async () => {
      mockFetch(null, false, 400)
      await expect(service.sendMessage('/endpoint-base', {})).rejects.toThrow('API error: 400')
    })
  })

  describe('hasFunctionResults', () => {
    it('retorna true quando há functionResults não vazios', () => {
      const r = { success: true, functionResults: [{ result: { id: 1 } }] }
      expect(service.hasFunctionResults(r)).toBe(true)
    })

    it('retorna false quando functionResults está vazio', () => {
      expect(service.hasFunctionResults({ success: true, functionResults: [] })).toBe(false)
    })

    it('retorna false quando functionResults não é array', () => {
      expect(service.hasFunctionResults({ success: true, functionResults: null })).toBe(false)
    })

    it('retorna falsy quando r é null', () => {
      expect(service.hasFunctionResults(null)).toBeFalsy()
    })

    it('retorna false quando success é false', () => {
      expect(service.hasFunctionResults({ success: false, functionResults: [{ result: {} }] })).toBe(false)
    })
  })

  describe('getFirstFunctionResult', () => {
    it('devolve o primeiro elemento de functionResults', () => {
      const fr1 = { result: { id: 1 } }
      const fr2 = { result: { id: 2 } }
      const r = { success: true, functionResults: [fr1, fr2] }
      expect(service.getFirstFunctionResult(r)).toBe(fr1)
    })

    it('devolve null quando não há functionResults', () => {
      expect(service.getFirstFunctionResult({ success: true, functionResults: [] })).toBeNull()
    })
  })

  describe('extractDataFromFunctionResult', () => {
    it('extrai e devolve uma cópia do campo result', () => {
      const fr = { result: { id: 1, name: 'Pedido' } }
      const data = service.extractDataFromFunctionResult(fr)
      expect(data).toEqual({ id: 1, name: 'Pedido' })
    })

    it('devolve null se fr é null', () => {
      expect(service.extractDataFromFunctionResult(null)).toBeNull()
    })

    it('devolve null se fr não tem campo result', () => {
      expect(service.extractDataFromFunctionResult({ other: 'data' })).toBeNull()
    })
  })
})
