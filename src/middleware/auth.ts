import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

function requireSecret(name: string, fallback?: string): string {
  const val = process.env[name] || fallback;
  if (!val || val.length < 32) {
    throw new Error(`FATAL: ${name} debe estar definido y tener al menos 32 caracteres`);
  }
  return val;
}

const getJwtSecret = () => requireSecret('JWT_SECRET');
const getRefreshSecret = () => requireSecret('JWT_REFRESH_SECRET', process.env.JWT_SECRET);
const getResetSecret = () => requireSecret('JWT_RESET_SECRET', process.env.JWT_SECRET);

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    rol: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, getJwtSecret()) as unknown as { id: string; email: string; rol: string; type?: string };
    if (payload.type) {
      // Rechazar refresh/reset tokens usados como access tokens
      return res.status(401).json({ error: 'Token inválido' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  next();
}

export function generateToken(user: { id: string; email: string; rol: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, rol: user.rol },
    getJwtSecret(),
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(user: { id: string }): string {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    getRefreshSecret(),
    { expiresIn: '7d' }
  );
}

export function generateResetToken(userId: string): string {
  return jwt.sign(
    { id: userId, type: 'reset' },
    getResetSecret(),
    { expiresIn: '1h' }
  );
}

export function verifyRefreshToken(token: string): { id: string } {
  const payload = jwt.verify(token, getRefreshSecret()) as any;
  if (payload.type !== 'refresh') throw new Error('Token inválido');
  return { id: payload.id };
}

export function verifyResetToken(token: string): { id: string } {
  const payload = jwt.verify(token, getResetSecret()) as any;
  if (payload.type !== 'reset') throw new Error('Token inválido');
  return { id: payload.id };
}
