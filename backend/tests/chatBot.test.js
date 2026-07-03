import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({
  db:      { query: vi.fn() },
  pgPool:  {},
  mysqlDb: {},
}))

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn(), verify: vi.fn() },
}))

vi.mock('../src/genai/orchestrations/index.js', () => ({
  runOrderPipeline:  vi.fn(),
  processChatStream: vi.fn(),
  clearSession:      vi.fn(),
}))

vi.mock('../src/utils/index.js', () => ({
  classifyClaudeError: vi.fn().mockReturnValue(null),
  ROLE_USER:           2,
  ROLE_ASSISTANT:      3,
  writeSseError:       vi.fn((res, err) => {
    res.write(`event: provider_error\ndata: ${JSON.stringify({ success: false, message: err.message })}\n\n`)
    res.end()
  }),
  createPipelineError: vi.fn(),
}))

vi.mock('../src/services/index.js', () => ({
  createConversation:  vi.fn(),
  createChatHistory:   vi.fn(),
  // outros usados por middlewares/controllers
  getOrderById:        vi.fn(),
  getUserById:     vi.fn(),
  getTableById:        vi.fn(),
  getItemById:         vi.fn(),
  getIngredientById:   vi.fn(),
  getStockById:        vi.fn(),
  getOrderItemById:    vi.fn(),
  getInvoiceById:      vi.fn(),
  getPaymentById:      vi.fn(),
  getReservationById:  vi.fn(),
  getNotificationById: vi.fn(),
  findOrCreateUser: vi.fn(),
  createOrder:         vi.fn(),
  createOrderItem:     vi.fn(),
  createInvoice:       vi.fn(),
  createPayment:       vi.fn(),
  updateTableStatus:   vi.fn(),
}))

import app from '../src/app.js'
import * as orchestrations from '../src/genai/orchestrations/index.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

// ─── POST /chat/message/stream — validação ────────────────────────────────────

describe('POST /chat/message/stream — validação', () => {
  it('devolve 400 se message estiver em falta', async () => {
    const res = await request(app)
      .post('/chat/message/stream')
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/message is required/)
  })

  it('devolve 400 se message for string vazia', async () => {
    const res = await request(app)
      .post('/chat/message/stream')
      .send({ message: '   ' })
    expect(res.status).toBe(400)
  })
})

// ─── POST /chat/message/stream — sucesso com SSE ─────────────────────────────

describe('POST /chat/message/stream — sucesso', () => {
  it('devolve Content-Type text/event-stream e evento done', async () => {
    services.createConversation.mockResolvedValue({ id: 100 })
    services.createChatHistory.mockResolvedValue({})

    orchestrations.processChatStream.mockImplementation(async (_msg, _convId, { onDone }) => {
      await onDone(null, [])
    })

    const res = await request(app)
      .post('/chat/message/stream')
      .send({ message: 'Quero um café' })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
    expect(res.text).toContain('event: done')
    expect(res.text).toContain('"success":true')
  })

  it('cria conversa nova se conversationId não for fornecido', async () => {
    services.createConversation.mockResolvedValue({ id: 200 })
    services.createChatHistory.mockResolvedValue({})
    orchestrations.processChatStream.mockImplementation(async (_msg, _convId, { onDone }) => {
      await onDone(null, [])
    })

    await request(app)
      .post('/chat/message/stream')
      .send({ message: 'Olá bot' })

    expect(services.createConversation).toHaveBeenCalledOnce()
    expect(services.createConversation).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Olá bot' }),
    )
  })

  it('reutiliza conversationId existente sem criar conversa nova', async () => {
    services.createChatHistory.mockResolvedValue({})
    orchestrations.processChatStream.mockImplementation(async (_msg, _convId, { onDone }) => {
      await onDone(null, [])
    })

    await request(app)
      .post('/chat/message/stream')
      .send({ message: 'Continua a conversa', conversationId: 55 })

    expect(services.createConversation).not.toHaveBeenCalled()
  })

  it('propaga chunks de texto no stream SSE', async () => {
    services.createConversation.mockResolvedValue({ id: 300 })
    services.createChatHistory.mockResolvedValue({})
    orchestrations.processChatStream.mockImplementation(async (_msg, _convId, { onChunk, onDone }) => {
      onChunk('Olá ')
      onChunk('cliente!')
      await onDone(null, [])
    })

    const res = await request(app)
      .post('/chat/message/stream')
      .send({ message: 'Oi' })

    expect(res.text).toContain('event: message')
    expect(res.text).toContain('"text":"Olá "')
    expect(res.text).toContain('"text":"cliente!"')
    expect(res.text).toContain('event: done')
  })

  it('inclui functionResults no evento done', async () => {
    services.createConversation.mockResolvedValue({ id: 400 })
    services.createChatHistory.mockResolvedValue({})
    orchestrations.processChatStream.mockImplementation(async (_msg, _convId, { onDone }) => {
      await onDone(null, [{ functionName: 'createOrder', result: { id: 99 } }])
    })

    const res = await request(app)
      .post('/chat/message/stream')
      .send({ message: 'Faz um pedido' })

    expect(res.text).toContain('createOrder')
    expect(res.text).toContain('"functionResults"')
  })

  it('escreve evento de erro SSE quando processChatStream lança exceção', async () => {
    services.createConversation.mockResolvedValue({ id: 500 })
    services.createChatHistory.mockResolvedValue({})
    orchestrations.processChatStream.mockImplementation(async (_msg, _convId, { onError }) => {
      onError(new Error('Groq rate limit'))
    })

    const res = await request(app)
      .post('/chat/message/stream')
      .send({ message: 'Quero ajuda' })

    // writeSseError é chamado — resposta deve terminar com event de erro
    expect(res.status).toBe(200) // SSE — headers já enviados antes do erro
    expect(res.text).toContain('provider_error')
  })
})

// ─── POST /chat/message — alias do stream ─────────────────────────────────────

describe('POST /chat/message', () => {
  it('devolve 400 se message estiver em falta', async () => {
    const res = await request(app)
      .post('/chat/message')
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/message is required/)
  })

  it('funciona como alias de /chat/message/stream', async () => {
    services.createConversation.mockResolvedValue({ id: 600 })
    services.createChatHistory.mockResolvedValue({})
    orchestrations.processChatStream.mockImplementation(async (_msg, _convId, { onDone }) => {
      await onDone(null, [])
    })

    const res = await request(app)
      .post('/chat/message')
      .send({ message: 'Olá' })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')
  })
})

// ─── POST /chat/conversation/:conversationId/message — sem stream ─────────────

describe('POST /chat/conversation/:conversationId/message', () => {
  it('devolve 400 se message estiver em falta', async () => {
    const res = await request(app)
      .post('/chat/conversation/42/message')
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/message is required/)
  })

  it('devolve 400 se message for string vazia', async () => {
    const res = await request(app)
      .post('/chat/conversation/42/message')
      .send({ message: '' })
    expect(res.status).toBe(400)
  })

  it('adiciona mensagem à conversa e devolve 200', async () => {
    services.createChatHistory.mockResolvedValue({})

    const res = await request(app)
      .post('/chat/conversation/42/message')
      .send({ message: 'Qual é a sopa do dia?' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.conversationId).toBe('42')
    expect(services.createChatHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: '42',
        content:         'Qual é a sopa do dia?',
      }),
    )
  })

  it('devolve 500 se createChatHistory lançar erro', async () => {
    services.createChatHistory.mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .post('/chat/conversation/42/message')
      .send({ message: 'Olá' })

    expect(res.status).toBe(500)
  })
})
