import { describe, it, expect, vi } from 'vitest'
import { chatService } from '../src/services/chatService.js'

function mockFetch(body, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
    body: null,
  })
}

describe('chatService', () => {
  describe('getConversations', () => {
    it('chama GET /conversations', async () => {
      mockFetch([{ id: 1, title: 'Conversa 1' }])
      const r = await chatService.getConversations()
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations'),
      )
      expect(r).toHaveLength(1)
    })
  })

  describe('getChatHistory', () => {
    it('chama GET /chat/history/conversation/:id', async () => {
      mockFetch([{ id: 1, content: 'Olá' }])
      const r = await chatService.getChatHistory(42)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/history/conversation/42'),
      )
      expect(r).toHaveLength(1)
    })
  })

  describe('sendMessageToConversation', () => {
    it('faz POST para /chat/conversation/:id/message', async () => {
      mockFetch({ success: true, conversationId: 10 })
      const r = await chatService.sendMessageToConversation(10, 'Qual é a sopa do dia?')
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/conversation/10/message'),
        expect.objectContaining({
          method: 'POST',
          body:   JSON.stringify({ message: 'Qual é a sopa do dia?' }),
        }),
      )
      expect(r).toHaveProperty('success', true)
    })
  })

  describe('sendMessageToBotStream — erro HTTP antes do stream', () => {
    it('chama onDone com success=false quando a resposta HTTP não é ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok:     false,
        status: 503,
        statusText: 'Service Unavailable',
        json:   () => Promise.resolve({ error: 'Serviço temporariamente indisponível' }),
      })

      const onDone = vi.fn()
      await chatService.sendMessageToBotStream('Olá', [], vi.fn(), onDone)
      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      )
    })

    it('classifica 401 como AUTH_ERROR', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false, status: 401, statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Não autorizado' }),
      })
      const onDone = vi.fn()
      await chatService.sendMessageToBotStream('Olá', [], vi.fn(), onDone)
      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorType: 'AUTH_ERROR' }),
      )
    })

    it('classifica 429 como RATE_LIMIT', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false, status: 429, statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: 'Rate limit' }),
      })
      const onDone = vi.fn()
      await chatService.sendMessageToBotStream('Olá', [], vi.fn(), onDone)
      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorType: 'RATE_LIMIT' }),
      )
    })
  })

  describe('sendMessageToBotStream — erro de rede', () => {
    it('chama onDone com NETWORK_ERROR quando fetch rejeita', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch'))
      const onDone = vi.fn()
      await chatService.sendMessageToBotStream('Olá', [], vi.fn(), onDone)
      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorType: 'NETWORK_ERROR' }),
      )
    })
  })

  describe('extractOrderData', () => {
    it('retorna null para input null', () => {
      expect(chatService.extractOrderData(null)).toBeNull()
    })

    it('retorna null para input inválido', () => {
      expect(chatService.extractOrderData('texto sem JSON')).toBeNull()
    })
  })
})
