import { describe, it, expect, vi } from 'vitest'
import { authService } from '../src/services/authService.js'

function mockFetch(body, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  })
}

describe('authService', () => {
  describe('login', () => {
    it('faz POST para /auth/login com identifier e password', async () => {
      const spy = mockFetch({ token: 'abc123', user: { id: 1, name: 'João' } })
      await authService.login('joao', 'pass123')
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ identifier: 'joao', password: 'pass123' }),
        }),
      )
    })

    it('devolve token e user quando as credenciais são válidas', async () => {
      mockFetch({ token: 'abc123', user: { id: 1, name: 'João' } })
      const result = await authService.login('joao', 'pass123')
      expect(result).toHaveProperty('token', 'abc123')
      expect(result.user).toHaveProperty('id', 1)
    })

    it('lança erro com a mensagem da API quando as credenciais são inválidas', async () => {
      mockFetch({ message: 'Credenciais inválidas.' }, false, 401)
      await expect(authService.login('errado', 'errado')).rejects.toThrow('Credenciais inválidas.')
    })
  })

  describe('register', () => {
    it('faz POST para /auth/register com todos os campos', async () => {
      const spy = mockFetch({ token: 'xyz', user: { id: 2 } }, true, 201)
      await authService.register('Maria', 'maria99', 'maria@email.com', '912345678', 'senha123')
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Maria',
            username: 'maria99',
            email: 'maria@email.com',
            phone: '912345678',
            password: 'senha123',
          }),
        }),
      )
    })

    it('devolve token quando o registo é bem-sucedido', async () => {
      mockFetch({ token: 'novo-token', user: { id: 2 } }, true, 201)
      const result = await authService.register('Maria', 'maria99', 'maria@email.com', '912345678', 'senha123')
      expect(result).toHaveProperty('token')
    })

    it('lança erro se o username já está em uso', async () => {
      mockFetch({ message: 'Username já está em uso.' }, false, 409)
      await expect(
        authService.register('João', 'joao', null, null, '123456'),
      ).rejects.toThrow('Username já está em uso.')
    })
  })

  describe('logout', () => {
    it('faz POST para /auth/logout com Authorization header', async () => {
      const spy = mockFetch({ success: true })
      await authService.logout('meu-token-123')
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer meu-token-123' }),
        }),
      )
    })
  })

  describe('me', () => {
    it('faz GET para /auth/me com Authorization header', async () => {
      const spy = mockFetch({ id: 1, name: 'João', role_id: 2 })
      await authService.me('meu-token-123')
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer meu-token-123' }),
        }),
      )
    })

    it('devolve os dados do utilizador autenticado', async () => {
      mockFetch({ id: 1, name: 'João', role_id: 2 })
      const result = await authService.me('token')
      expect(result).toEqual({ id: 1, name: 'João', role_id: 2 })
    })
  })

  describe('requestDelete', () => {
    it('faz POST para /auth/request-delete com Authorization header', async () => {
      const spy = mockFetch({ success: true })
      await authService.requestDelete('meu-token')
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/request-delete'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer meu-token' }),
        }),
      )
    })
  })
})
