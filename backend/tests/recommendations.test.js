import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({
  db:      { query: vi.fn() },
  pgPool:  {},
  mysqlDb: {},
}))

vi.mock('../src/middlewares/authMiddleware.js', () => ({
  verifyToken: vi.fn((req, res, next) => {
    // Mock: se tiver Authorization header, simula user autenticado
    const header = req.headers['authorization'];
    if (header?.startsWith('Bearer ')) {
      req.user = { id: 42, role_id: 2 };
      return next();
    }
    return res.status(401).json({ message: 'Token em falta.' });
  }),
  requireRole: vi.fn(),
}))

vi.mock('../src/genai/agents/index.js', () => ({
  AnalyticsAgent: class MockAnalyticsAgent {
    async recommend() {
      return [
        { item_id: 1, label: 'O teu favorito' },
        { item_id: 2, label: 'Sugerido para ti' },
      ]
    }
    async forecast() {
      return {
        trend: 'crescimento',
        summary: 'Receita em ascensão',
        forecast: [
          { date: '2026-06-22', predicted: 150.50 },
          { date: '2026-06-23', predicted: 160.00 },
        ],
      }
    }
  },
}))

vi.mock('../src/services/index.js', () => ({
  getActiveMenuItems: vi.fn(),
  getUserOrderHistory: vi.fn(),
  getPopularItems: vi.fn(),
  getDailyRevenue: vi.fn(),
  getAllItems: vi.fn(),
  getActiveItems: vi.fn(),
  getItemById: vi.fn(),
  getOrderById: vi.fn(),
  getUserById: vi.fn(),
  getTableById: vi.fn(),
  getIngredientById: vi.fn(),
  getStockById: vi.fn(),
  getOrderItemById: vi.fn(),
  getInvoiceById: vi.fn(),
  getPaymentById: vi.fn(),
  getReservationById: vi.fn(),
  getNotificationById: vi.fn(),
}))

import app from '../src/app.js'
import * as services from '../src/services/index.js'

beforeEach(() => vi.clearAllMocks())

describe('GET /recommendations', () => {
  it('devolve 401 sem autenticação', async () => {
    const res = await request(app).get('/recommendations')
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/Token|autenticação/i)
  })

  it('devolve recomendações com user autenticado', async () => {
    services.getActiveMenuItems.mockResolvedValue([
      { id: 1, name: 'Pizza', category: 'Main Course' },
      { id: 2, name: 'Salada', category: 'Appetizer' },
    ])
    services.getUserOrderHistory.mockResolvedValue([
      { item_id: 1, times: 5 },
      { item_id: 2, times: 2 },
    ])
    services.getPopularItems.mockResolvedValue([
      { item_id: 1, orders: 10 },
    ])

    // Mock de user autenticado
    const res = await request(app)
      .get('/recommendations')
      .set('Authorization', 'Bearer mock-token')
    
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('recommendations')
    expect(res.body.cacheKey).toBe(7) // 5 + 2
    expect(services.getUserOrderHistory).toHaveBeenCalledWith(42)
  })

  it('devolve 500 em erro ao buscar items', async () => {
    services.getActiveMenuItems.mockRejectedValue(new Error('DB fail'))

    const res = await request(app)
      .get('/recommendations')
      .set('Authorization', 'Bearer mock-token')
    
    expect(res.status).toBe(500)
    expect(res.body.message).toMatch(/recomendações/)
  })

  it('devolve 500 em erro do AnalyticsAgent', async () => {
    services.getActiveMenuItems.mockResolvedValue([
      { id: 1, name: 'Pizza', category: 'Main Course' },
    ])
    services.getUserOrderHistory.mockResolvedValue([])
    services.getPopularItems.mockRejectedValue(new Error('Groq fail'))

    const res = await request(app)
      .get('/recommendations')
      .set('Authorization', 'Bearer mock-token')
    
    expect(res.status).toBe(500)
  })

  it('calcula cacheKey corretamente com histórico vazio', async () => {
    services.getActiveMenuItems.mockResolvedValue([])
    services.getUserOrderHistory.mockResolvedValue([])
    services.getPopularItems.mockResolvedValue([])

    const res = await request(app)
      .get('/recommendations')
      .set('Authorization', 'Bearer mock-token')
    
    expect(res.status).toBe(200)
    expect(res.body.cacheKey).toBe(0)
  })
})

describe('GET /forecast', () => {
  it('devolve previsão com período padrão (30 dias)', async () => {
    services.getDailyRevenue.mockResolvedValue([
      { date: '2026-06-15', total: 100.00 },
      { date: '2026-06-16', total: 120.50 },
      { date: '2026-06-17', total: 115.00 },
      { date: '2026-06-18', total: 140.00 },
    ])

    const res = await request(app).get('/forecast')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('historical')
    expect(res.body).toHaveProperty('forecast')
    expect(res.body).toHaveProperty('summary')
    expect(res.body).toHaveProperty('trend')
    expect(services.getDailyRevenue).toHaveBeenCalledWith(30)
  })

  it('devolve previsão com período customizado', async () => {
    services.getDailyRevenue.mockResolvedValue([
      { date: '2026-06-15', total: 100.00 },
      { date: '2026-06-16', total: 120.50 },
      { date: '2026-06-17', total: 115.00 },
    ])

    const res = await request(app).get('/forecast?days=60')
    expect(res.status).toBe(200)
    expect(services.getDailyRevenue).toHaveBeenCalledWith(60)
  })

  it('limita período máximo a 90 dias', async () => {
    services.getDailyRevenue.mockResolvedValue([])

    await request(app).get('/forecast?days=200')
    expect(services.getDailyRevenue).toHaveBeenCalledWith(90)
  })

  it('devolve dados insuficientes se menos de 3 dias', async () => {
    services.getDailyRevenue.mockResolvedValue([
      { date: '2026-06-20', total: 100.00 },
    ])

    const res = await request(app).get('/forecast')
    expect(res.status).toBe(200)
    expect(res.body.forecast).toEqual([])
    expect(res.body.summary).toMatch(/insuficientes/)
  })

  it('devolve 500 em erro ao buscar receita', async () => {
    services.getDailyRevenue.mockRejectedValue(new Error('DB fail'))

    const res = await request(app).get('/forecast')
    expect(res.status).toBe(500)
    expect(res.body.message).toMatch(/previsão/)
  })

  it('retorna previsão completa com dados válidos', async () => {
    services.getDailyRevenue.mockResolvedValue([
      { date: '2026-06-15', total: 100.00 },
      { date: '2026-06-16', total: 120.50 },
      { date: '2026-06-17', total: 115.00 },
      { date: '2026-06-18', total: 140.00 },
    ])

    const res = await request(app).get('/forecast')
    expect(res.status).toBe(200)
    expect(res.body.forecast).toBeDefined()
    expect(res.body.trend).toBe('crescimento')
    expect(res.body.summary).toBeTruthy()
  })
})
