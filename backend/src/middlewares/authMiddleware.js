import jwt from 'jsonwebtoken';

// Valida o JWT do header Authorization e anexa o payload a req.user.
// Rejeita com 401 se o token estiver em falta, inválido ou expirado.
export function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  const token  = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token)
    return res.status(401).json({ message: 'Token em falta.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
}

// Verifica se o utilizador autenticado tem um dos roles permitidos.
// Devolve 403 caso o role não esteja na lista fornecida.
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role_id))
      return res.status(403).json({ message: 'Sem permissão.' });
    next();
  };
}
