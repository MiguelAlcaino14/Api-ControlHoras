import { Router, type Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../lib/db.js';
import { AuthRequest, authMiddleware, generateToken, generateRefreshToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y password son requeridos' });
  }

  try {
    const result = await pool.query(
      'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: 'Usuario desactivado' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken({ id: user.id, email: user.email, rol: user.rol });
    const refreshToken = generateRefreshToken({ id: user.id });

    return res.status(200).json({
      token,
      refreshToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: user.activo,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token requerido' });
  }

  try {
    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.verify(refreshToken, process.env.JWT_SECRET || 'dev-secret') as any;

    if (payload.type !== 'refresh') {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = $1',
      [payload.id]
    );

    if (result.rows.length === 0 || !result.rows[0].activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o desactivado' });
    }

    const user = result.rows[0];
    const newToken = generateToken({ id: user.id, email: user.email, rol: user.rol });
    const newRefreshToken = generateRefreshToken({ id: user.id });

    return res.status(200).json({
      token: newToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: user.activo,
      },
    });
  } catch {
    return res.status(401).json({ error: 'Refresh token inválido o expirado' });
  }
});

// GET /api/auth/me - obtener perfil del usuario autenticado
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo FROM usuarios WHERE id = $1',
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  try {
    const result = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);

    // Siempre responder 200 para no revelar si el email existe
    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'Si el email existe, se enviarán instrucciones' });
    }

    // TODO: integrar envío de email con un servicio (SendGrid, Resend, etc.)
    // Por ahora se genera un token de reset que dura 1 hora
    const jwt = await import('jsonwebtoken');
    const resetToken = jwt.default.sign(
      { id: result.rows[0].id, type: 'reset' },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '1h' }
    );

    console.log(`[RESET TOKEN para ${email}]: ${resetToken}`);

    return res.status(200).json({
      message: 'Si el email existe, se enviarán instrucciones',
      // En desarrollo devolvemos el token; en producción quitar esto
      ...(process.env.NODE_ENV !== 'production' && { resetToken }),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: AuthRequest, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token y password son requeridos' });
  }

  try {
    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;

    if (payload.type !== 'reset') {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [hash, payload.id]);

    return res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

export default router;
