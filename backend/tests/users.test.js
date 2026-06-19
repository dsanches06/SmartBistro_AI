import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

vi.mock('../src/db.js', () => ({
  db:      { query: vi.fn() },
  pgPool:  {},
  mysqlDb: {},
}))

import app from '../src/app.js'
import { db } from '../src/db.js'

beforeEach(() => { vi.clearAllMocks() })

// ─── GET /users ───────────────────────────────────────────────────────────────

describe('GET /users', () => {
  it('devolve lista de utilizadores', async () => {
    db.query.mockResolvedValueOnce([[
      { id: 1, name: 'Admin', email: 'admin@test.pt', phone: null, active: true, role_id: 1, created_at: new Date() },
      { id: 2, name: 'Ana',   email: null,            phone: '910000000', active: true, role_id: 2, created_at: new Date() },
    ]])
    const res = await request(app).get('/users')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toHaveProperty('name', 'Admin')
  })
})

// ─── POST /users ──────────────────────────────────────────────────────────────

describe('POST /users', () => {
  it('devolve 400 se name estiver vazio', async () => {
    const res = await request(app).post('/users').send({ name: '' })
    expect(res.status).toBe(400)
  })

  it('devolve 409 se email já existe', async () => {
    db.query.mockResolvedValueOnce([[{ id: 99 }]]) // emailExists → existe
    const res = await request(app).post('/users').send({ name: 'Novo', email: 'dup@test.pt' })
    expect(res.status).toBe(409)
  })

  it('cria utilizador e devolve 201', async () => {
    db.query
      .mockResolvedValueOnce([[]])   // emailExists → não existe
      .mockResolvedValueOnce([[]])   // phoneExists → não existe
      .mockResolvedValueOnce([{ insertId: 10 }])  // INSERT
      .mockResolvedValueOnce([[{ id: 10, name: 'Novo', email: 'novo@test.pt', phone: null, active: false, role_id: 2, created_at: new Date() }]])
    const res = await request(app).post('/users').send({ name: 'Novo', email: 'novo@test.pt' })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id', 10)
  })
})

// ─── GET /users/:id ───────────────────────────────────────────────────────────

describe('GET /users/:id', () => {
  it('devolve 404 se utilizador não existe', async () => {
    db.query.mockResolvedValueOnce([[]])
    const res = await request(app).get('/users/999')
    expect(res.status).toBe(404)
  })

  it('devolve utilizador se existe', async () => {
    const user = { id: 3, name: 'Ana', email: null, phone: '910000000', active: true, role_id: 2, created_at: new Date() }
    db.query.mockResolvedValueOnce([[user]])
    const res = await request(app).get('/users/3')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('id', 3)
  })
})

// ─── DELETE /users/:id ────────────────────────────────────────────────────────

describe('DELETE /users/:id', () => {
  it('devolve 404 se utilizador não existe', async () => {
    db.query.mockResolvedValueOnce([[]])
    const res = await request(app).delete('/users/999')
    expect(res.status).toBe(404)
  })

  it('elimina utilizador com sucesso', async () => {
    db.query
      .mockResolvedValueOnce([[{ id: 3, name: 'Ana', email: null, phone: null, active: true, role_id: 2, created_at: new Date() }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
    const res = await request(app).delete('/users/3')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })
})

// ─── GET /staff ───────────────────────────────────────────────────────────────

describe('GET /staff', () => {
  it('devolve lista do staff', async () => {
    db.query.mockResolvedValueOnce([[
      { user_id: 1, employee_number: 'EMP-1', hire_date: '2025-01-01', name: 'Admin', email: 'a@b.pt', phone: null, active: true, role_id: 1, created_at: new Date() },
    ]])
    const res = await request(app).get('/staff')
    expect(res.status).toBe(200)
    expect(res.body[0]).toHaveProperty('employee_number', 'EMP-1')
  })
})

// ─── POST /staff ──────────────────────────────────────────────────────────────

describe('POST /staff', () => {
  it('devolve 400 se user_id estiver em falta', async () => {
    const res = await request(app).post('/staff').send({})
    expect(res.status).toBe(400)
  })

  it('cria staff com sucesso', async () => {
    db.query
      .mockResolvedValueOnce([[{ id: 5 }]])          // utilizador existe
      .mockResolvedValueOnce([[]])                    // não é staff ainda
      .mockResolvedValueOnce([{ insertId: 1 }])      // INSERT staff
      .mockResolvedValueOnce([[{ user_id: 5, employee_number: 'EMP-5', hire_date: '2026-01-01', name: 'Carlos', email: null, phone: null, active: true, role_id: 1, created_at: new Date() }]])
    const res = await request(app).post('/staff').send({ user_id: 5 })
    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('user_id', 5)
  })
})
