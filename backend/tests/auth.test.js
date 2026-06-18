import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({
  db:      { query: vi.fn() },
  pgPool:  {},
  mysqlDb: {},
}))

vi.mock('bcrypt', () => ({
  default: {
    hash:    vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn(),
  },
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    sign:   vi.fn().mockReturnValue('mocked-jwt-token'),
    verify: vi.fn(),
  },
}))

// Importações depois dos mocks (Vitest faz hoist dos vi.mock automaticamente)
import app from '../src/app.js'
import { db } from '../src/db.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

beforeEach(() => {
  vi.clearAllMocks()
  jwt.sign.mockReturnValue('mocked-jwt-token')
  bcrypt.hash.mockResolvedValue('hashed_password')
})

// ─── POST /auth/register ──────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('devolve 400 se name estiver vazio', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: '', username: 'user', password: '123456' })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/obrigatórios/)
  })

  it('devolve 400 se password estiver vazio', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'João', username: 'joao', password: '' })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/obrigatórios/)
  })

  it('devolve 400 se username estiver vazio', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'João', username: '', password: '123456' })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/username/)
  })

  it('devolve 409 se o username já está em uso', async () => {
    db.query.mockResolvedValueOnce([[{ id: 1 }]])
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'João', username: 'joao', password: '123456' })
    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/Username/)
  })

  it('cria novo cliente e devolve 201 com token', async () => {
    db.query
      .mockResolvedValueOnce([[]])                       // username não existe
      .mockResolvedValueOnce([{ insertId: 42 }])         // INSERT customers
      .mockResolvedValueOnce([{}])                       // INSERT auth_accounts
      .mockResolvedValueOnce([{}])                       // UPDATE active
      .mockResolvedValueOnce([[{
        id: 42, name: 'João', email: null, phone: null,
        role_id: 2, created_at: new Date(), username: 'joao',
      }]])

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'João', username: 'joao', password: '123456' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token', 'mocked-jwt-token')
    expect(res.body).toHaveProperty('user')
    expect(res.body.user).toHaveProperty('id', 42)
  })

  it('vincula cliente existente encontrado por telefone e devolve 200', async () => {
    db.query
      .mockResolvedValueOnce([[]])                         // username não existe
      .mockResolvedValueOnce([[{ id: 10, name: 'João', email: null, phone: '912345678', role_id: 2 }]])  // cliente encontrado
      .mockResolvedValueOnce([[]])                         // sem auth_account para este cliente
      .mockResolvedValueOnce([{}])                         // UPDATE customers com COALESCE
      .mockResolvedValueOnce([{}])                         // INSERT auth_accounts
      .mockResolvedValueOnce([{}])                         // UPDATE active
      .mockResolvedValueOnce([[{
        id: 10, name: 'João', email: null, phone: '912345678',
        role_id: 2, created_at: new Date(), username: 'joao',
      }]])

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'João', username: 'joao', phone: '912345678', password: '123456' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('linked', true)
  })
})

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('devolve 400 se identifier estiver vazio', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: '', password: '123456' })
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/obrigatórios/)
  })

  it('devolve 400 se password estiver vazio', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'joao', password: '' })
    expect(res.status).toBe(400)
  })

  it('devolve 401 se o utilizador não existir', async () => {
    db.query.mockResolvedValueOnce([[]])
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'naoexiste', password: '123456' })
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/inválidas/)
  })

  it('devolve 401 se a password for incorreta', async () => {
    db.query.mockResolvedValueOnce([[{
      id: 1, name: 'João', email: null, phone: null,
      role_id: 2, username: 'joao', password_hash: 'hash',
    }]])
    bcrypt.compare.mockResolvedValue(false)
    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'joao', password: 'errada' })
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/inválidas/)
  })

  it('devolve 200 com token e user sem password_hash', async () => {
    db.query
      .mockResolvedValueOnce([[{
        id: 1, name: 'João', email: 'joao@email.com', phone: null,
        role_id: 2, username: 'joao', password_hash: 'hash',
      }]])
      .mockResolvedValueOnce([{}]) // UPDATE active
    bcrypt.compare.mockResolvedValue(true)

    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: 'joao', password: 'correta' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token', 'mocked-jwt-token')
    expect(res.body.user).not.toHaveProperty('password_hash')
    expect(res.body.user).toHaveProperty('active', true)
  })
})

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('devolve 401 se não tiver token', async () => {
    const res = await request(app).get('/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/Token em falta/)
  })

  it('devolve 401 se o token for inválido', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid signature') })
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer token-invalido')
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/Token inválido/)
  })

  it('devolve os dados do utilizador com token válido', async () => {
    jwt.verify.mockReturnValue({ id: 1, role_id: 2 })
    db.query.mockResolvedValueOnce([[{
      id: 1, name: 'João', email: 'joao@email.com', phone: null,
      role_id: 2, created_at: new Date(), username: 'joao',
    }]])
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer token-valido')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('username', 'joao')
  })
})
