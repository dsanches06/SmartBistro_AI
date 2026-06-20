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

    // Verificar se o username já está em uso
    const [existingAuth] = await db.query(
      'SELECT id FROM auth_accounts WHERE username = ?', [userTrim]
    );
    if (existingAuth.length > 0)
      return res.status(409).json({ message: 'Username já está em uso.' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Ligar a utilizador existente apenas por phone ou email (identificadores únicos)
    const conditions = [];
    const params     = [];
    if (phoneTrim) { conditions.push('phone = ?'); params.push(phoneTrim); }
    if (emailTrim) { conditions.push('email = ?'); params.push(emailTrim); }

    let userId;
    let linked = false;

    if (conditions.length > 0) {
      const [existing] = await db.query(
        `SELECT id, name, email, phone, role_id FROM users WHERE ${conditions.join(' OR ')} LIMIT 1`,
        params,
      );

      if (existing.length > 0) {
        const found = existing[0];
        console.log(`[Auth] register: utilizador encontrado id=${found.id} name="${found.name}"`);

        const [hasAuth] = await db.query(
          'SELECT id FROM auth_accounts WHERE user_id = ?', [found.id]
        );
        if (hasAuth.length > 0)
          return res.status(409).json({ message: 'Já existe uma conta para este utilizador. Usa o login.' });

        userId = found.id;
        linked = true;

        await db.query(
          `UPDATE users SET
             name  = COALESCE(?, name),
             email = COALESCE(email, ?),
             phone = COALESCE(phone, ?)
           WHERE id = ?`,
          [nameTrim, emailTrim, phoneTrim, userId]
        );
      }
    }

    if (!userId) {
      console.log(`[Auth] register: novo utilizador "${nameTrim}"`);
      const [insertResult] = await db.query(
        `INSERT INTO users (name, email, phone, role_id) VALUES (?, ?, ?, 2)`,
        [nameTrim, emailTrim, phoneTrim]
      );
      userId = getInsertId(insertResult);
    }

    if (!userId)
      return res.status(500).json({ message: 'Erro interno ao criar utilizador.' });

    console.log(`[Auth] register: a criar auth_account para userId=${userId}`);
    await db.query(
      'INSERT INTO auth_accounts (user_id, username, password_hash) VALUES (?, ?, ?)',
      [userId, userTrim, password_hash]
    );

    await db.query('UPDATE users SET active = TRUE WHERE id = ?', [userId]);

    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role_id, u.created_at, a.username
       FROM users u
       JOIN auth_accounts a ON a.user_id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    if (!rows.length)
      return res.status(500).json({ message: 'Erro ao recuperar utilizador após registo.' });

    console.log(`[Auth] register: sucesso id=${userId} linked=${linked}`);
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
      `SELECT u.id, u.name, u.email, u.phone, u.role_id,
              a.username, a.password_hash
       FROM auth_accounts a
       JOIN users u ON u.id = a.user_id
       WHERE a.username = ?`,
      [identifier.trim()],
    );

    if (!rows.length)
      return res.status(401).json({ message: 'Credenciais inválidas.' });

    const user    = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid)
      return res.status(401).json({ message: 'Credenciais inválidas.' });

    await db.query('UPDATE users SET active = TRUE WHERE id = ?', [user.id]);

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
    await db.query('UPDATE users SET active = FALSE WHERE id = ?', [req.user.id]);
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
      `SELECT u.id FROM users u
       JOIN auth_accounts a ON a.user_id = u.id
       WHERE u.role_id = 1 AND u.active = TRUE`
    );

    if (admins.length > 0) {
      const [user] = await db.query(
        `SELECT u.name, a.username, u.email
         FROM users u
         LEFT JOIN auth_accounts a ON a.user_id = u.id
         WHERE u.id = ?`,
        [req.user.id]
      );
      const u = user[0];
      const label = u?.username ? `@${u.username}` : u?.email || `#${req.user.id}`;

      await Promise.all(admins.map(admin =>
        db.query(
          `INSERT INTO notification (user_id, title, message) VALUES (?, ?, ?)`,
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

// POST /auth/change-password  (requer verifyToken)
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword?.trim() || !newPassword?.trim())
    return res.status(400).json({ message: 'currentPassword e newPassword são obrigatórios.' });

  if (newPassword.length < 6)
    return res.status(400).json({ message: 'A nova password deve ter pelo menos 6 caracteres.' });

  try {
    const [rows] = await db.query(
      'SELECT password_hash FROM auth_accounts WHERE user_id = ?',
      [req.user.id]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Conta não encontrada.' });

    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid)
      return res.status(401).json({ message: 'Password atual incorreta.' });

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.query(
      'UPDATE auth_accounts SET password_hash = ? WHERE user_id = ?',
      [newHash, req.user.id]
    );

    return res.json({ success: true, message: 'Password alterada com sucesso.' });
  } catch (err) {
    console.error('[Auth] changePassword:', err.message);
    return res.status(500).json({ message: 'Erro interno.' });
  }
}

// GET /auth/me  (requer verifyToken)
export async function me(req, res) {
  try {
    const queryResult = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role_id, u.created_at,
              a.username
       FROM users u
       LEFT JOIN auth_accounts a ON a.user_id = u.id
       WHERE u.id = ?`,
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
