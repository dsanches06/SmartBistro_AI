import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection.js';

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role_id: user.role_id },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
}

// POST /auth/register
export async function register(req, res) {
  const { name, username, email, phone, password } = req.body;

  if (!name?.trim() || !password?.trim())
    return res.status(400).json({ message: 'name e password são obrigatórios.' });

  if (!username?.trim() && !email?.trim())
    return res.status(400).json({ message: 'É necessário fornecer username ou email.' });

  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.execute(
      `INSERT INTO customers (name, username, email, phone, password_hash, role_id)
       VALUES (?, ?, ?, ?, ?, 2)`,
      [
        name.trim(),
        username?.trim() || null,
        email?.trim()    || null,
        phone?.trim()    || null,
        password_hash,
      ],
    );

    const [rows] = await pool.execute(
      'SELECT id, name, username, email, phone, role_id, created_at FROM customers WHERE id = ?',
      [result.insertId],
    );

    const user  = rows[0];
    const token = signToken(user);

    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Username, email ou telefone já existe.' });
    console.error('[Auth] register:', err.message);
    return res.status(500).json({ message: 'Erro interno.' });
  }
}

// POST /auth/login
export async function login(req, res) {
  const { identifier, password } = req.body;
  // identifier = email OU username

  if (!identifier?.trim() || !password?.trim())
    return res.status(400).json({ message: 'identifier e password são obrigatórios.' });

  try {
    const [rows] = await pool.execute(
      `SELECT id, name, username, email, phone, role_id, password_hash
       FROM customers
       WHERE (email = ? OR username = ?) AND password_hash IS NOT NULL`,
      [identifier.trim(), identifier.trim()],
    );

    if (!rows.length)
      return res.status(401).json({ message: 'Credenciais inválidas.' });

    const user    = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid)
      return res.status(401).json({ message: 'Credenciais inválidas.' });

    const { password_hash: _, ...safeUser } = user;
    const token = signToken(user);

    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error('[Auth] login:', err.message);
    return res.status(500).json({ message: 'Erro interno.' });
  }
}

// GET /auth/me  (requer verifyToken)
export async function me(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, username, email, phone, role_id, created_at FROM customers WHERE id = ?',
      [req.user.id],
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Utilizador não encontrado.' });

    return res.json(rows[0]);
  } catch (err) {
    console.error('[Auth] me:', err.message);
    return res.status(500).json({ message: 'Erro interno.' });
  }
}
