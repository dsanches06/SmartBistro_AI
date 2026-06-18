import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const SALT_ROUNDS = 10;

function signToken(user) {
  return jwt.sign(
    { id: user.id, role_id: user.role_id },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
}

function getQueryRows(result) {
  if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
    return result[0];
  }
  return Array.isArray(result) ? result : [];
}

function getInsertId(result) {
  if (result == null) return null;
  if (Array.isArray(result)) return getInsertId(result[0]);
  if (typeof result === 'object') {
    return result.insertId ?? result.id ?? result.lastInsertId ?? null;
  }
  return null;
}

// POST /auth/register
export async function register(req, res) {
  const { name, username, email, phone, password } = req.body;

  if (!name?.trim() || !password?.trim())
    return res.status(400).json({ message: 'name e password são obrigatórios.' });

  if (!username?.trim())
    return res.status(400).json({ message: 'O username é obrigatório.' });

  try {
    const nameTrim  = name.trim();
    const userTrim  = username.trim();
    const emailTrim = email?.trim()  || null;
    const phoneTrim = phone?.trim()  || null;

    // Verificar se o username já está em uso na auth_accounts
    const [existingAuth] = await db.query(
      'SELECT id FROM auth_accounts WHERE username = ?', [userTrim]
    );
    if (existingAuth.length > 0)
      return res.status(409).json({ message: 'Username já está em uso.' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Ligar a cliente existente apenas por phone ou email (identificadores únicos).
    // Nome NÃO é usado para ligar — pode haver vários clientes com o mesmo nome.
    const conditions = [];
    const params     = [];
    if (phoneTrim) { conditions.push('phone = ?'); params.push(phoneTrim); }
    if (emailTrim) { conditions.push('email = ?'); params.push(emailTrim); }

    let customerId;
    let linked = false;

    if (conditions.length > 0) {
      const [existing] = await db.query(
        `SELECT id, name, email, phone, role_id FROM customers WHERE ${conditions.join(' OR ')} LIMIT 1`,
        params,
      );

      if (existing.length > 0) {
        const found = existing[0];
        console.log(`[Auth] register: cliente encontrado id=${found.id} name="${found.name}"`);

        const [hasAuth] = await db.query(
          'SELECT id FROM auth_accounts WHERE customer_id = ?', [found.id]
        );
        if (hasAuth.length > 0)
          return res.status(409).json({ message: 'Já existe uma conta para este utilizador. Usa o login.' });

        customerId = found.id;
        linked = true;

        await db.query(
          `UPDATE customers SET
             name  = COALESCE(?, name),
             email = COALESCE(email, ?),
             phone = COALESCE(phone, ?)
           WHERE id = ?`,
          [nameTrim, emailTrim, phoneTrim, customerId]
        );
      }
    }

    if (!customerId) {
      console.log(`[Auth] register: novo cliente "${nameTrim}"`);
      const [insertResult] = await db.query(
        `INSERT INTO customers (name, email, phone, role_id) VALUES (?, ?, ?, 2)`,
        [nameTrim, emailTrim, phoneTrim]
      );
      customerId = getInsertId(insertResult);
    }

    if (!customerId)
      return res.status(500).json({ message: 'Erro interno ao criar cliente.' });

    console.log(`[Auth] register: a criar auth_account para customerId=${customerId}`);
    await db.query(
      'INSERT INTO auth_accounts (customer_id, username, password_hash) VALUES (?, ?, ?)',
      [customerId, userTrim, password_hash]
    );

    await db.query('UPDATE customers SET active = TRUE WHERE id = ?', [customerId]);

    const [rows] = await db.query(
      `SELECT c.id, c.name, c.email, c.phone, c.role_id, c.created_at, a.username
       FROM customers c
       JOIN auth_accounts a ON a.customer_id = c.id
       WHERE c.id = ?`,
      [customerId]
    );

    if (!rows.length)
      return res.status(500).json({ message: 'Erro ao recuperar utilizador após registo.' });

    console.log(`[Auth] register: sucesso id=${customerId} linked=${linked}`);
    const user  = rows[0];
    const token = signToken(user);
    return res.status(linked ? 200 : 201).json({ token, user, linked });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Username, email ou telefone já está em uso.' });
    console.error('[Auth] register:', err);
    return res.status(500).json({ message: 'Erro interno.' });
  }
}

// POST /auth/login
export async function login(req, res) {
  const { identifier, password } = req.body;

  if (!identifier?.trim() || !password?.trim())
    return res.status(400).json({ message: 'identifier e password são obrigatórios.' });

  try {
    const [rows] = await db.query(
      `SELECT c.id, c.name, c.email, c.phone, c.role_id,
              a.username, a.password_hash
       FROM auth_accounts a
       JOIN customers c ON c.id = a.customer_id
       WHERE a.username = ?`,
      [identifier.trim()],
    );

    if (!rows.length)
      return res.status(401).json({ message: 'Credenciais inválidas.' });

    const user    = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid)
      return res.status(401).json({ message: 'Credenciais inválidas.' });

    await db.query('UPDATE customers SET active = TRUE WHERE id = ?', [user.id]);

    const { password_hash: _, ...safeUser } = user;
    const token = signToken(user);

    return res.json({ token, user: { ...safeUser, active: true } });
  } catch (err) {
    console.error('[Auth] login:', err.message);
    return res.status(500).json({ message: 'Erro interno.' });
  }
}

// POST /auth/logout  (requer verifyToken)
export async function logout(req, res) {
  try {
    await db.query('UPDATE customers SET active = FALSE WHERE id = ?', [req.user.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Auth] logout:', err.message);
    return res.status(500).json({ message: 'Erro interno.' });
  }
}

// POST /auth/request-delete  (requer verifyToken)
export async function requestDelete(req, res) {
  try {
    const [admins] = await db.query(
      `SELECT c.id FROM customers c
       JOIN auth_accounts a ON a.customer_id = c.id
       WHERE c.role_id = 1 AND c.active = TRUE`
    );

    if (admins.length > 0) {
      const [user] = await db.query(
        `SELECT c.name, a.username, c.email
         FROM customers c
         LEFT JOIN auth_accounts a ON a.customer_id = c.id
         WHERE c.id = ?`,
        [req.user.id]
      );
      const u = user[0];
      const label = u?.username ? `@${u.username}` : u?.email || `#${req.user.id}`;

      await Promise.all(admins.map(admin =>
        db.query(
          `INSERT INTO notification (customer_id, title, message) VALUES (?, ?, ?)`,
          [
            admin.id,
            '🗑️ Pedido de remoção de conta',
            `O utilizador ${u?.name || ''} (${label}) solicitou a remoção da sua conta.`,
          ]
        )
      ));
    }

    return res.json({ success: true, message: 'Pedido enviado aos administradores.' });
  } catch (err) {
    console.error('[Auth] requestDelete:', err.message);
    return res.status(500).json({ message: 'Erro interno.' });
  }
}

// GET /auth/me  (requer verifyToken)
export async function me(req, res) {
  try {
    const queryResult = await db.query(
      `SELECT c.id, c.name, c.email, c.phone, c.role_id, c.created_at,
              a.username
       FROM customers c
       LEFT JOIN auth_accounts a ON a.customer_id = c.id
       WHERE c.id = ?`,
      [req.user.id],
    );
    const rows = getQueryRows(queryResult);

    if (!rows.length)
      return res.status(404).json({ message: 'Utilizador não encontrado.' });

    return res.json(rows[0]);
  } catch (err) {
    console.error('[Auth] me:', err.message);
    return res.status(500).json({ message: 'Erro interno.' });
  }
}
