import { Router, type Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../lib/db.js';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

// GET /api/usuarios - Listar todos (admin)
router.get('/', authMiddleware, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, is_released, released_at, fecha_creacion, horas_mensuales FROM usuarios ORDER BY fecha_creacion DESC'
    );
    return res.status(200).json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/monthly-summary - Resumen del mes actual por usuario (admin)
router.get('/monthly-summary', authMiddleware, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.nombre, u.email, u.rol, u.activo,
        u.horas_mensuales,
        COALESCE(mh.total_hours, 0)    AS total_hours,
        COALESCE(mh.used_hours, 0)     AS used_hours,
        COALESCE(mh.rollover_hours, 0) AS rollover_hours,
        GREATEST(0,
          COALESCE(mh.total_hours, 0)
          + COALESCE(mh.rollover_hours, 0)
          - COALESCE(mh.used_hours, 0)
        ) AS available_hours
      FROM usuarios u
      LEFT JOIN monthly_hours mh
        ON mh.user_id = u.id
        AND mh.month = date_trunc('month', CURRENT_DATE)::date
      ORDER BY u.nombre
    `);
    return res.status(200).json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/usuarios - Crear usuario (admin)
router.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { nombre, email, rol, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son requeridos' });
  }

  try {
    // Verificar email duplicado
    const existing = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, activo, fecha_creacion`,
      [nombre, email, hash, rol || 'usuario']
    );

    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id - Actualizar usuario (admin)
router.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { nombre, rol, activo } = req.body;

  try {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (nombre !== undefined) { fields.push(`nombre = $${idx++}`); values.push(nombre); }
    if (rol !== undefined) { fields.push(`rol = $${idx++}`); values.push(rol); }
    if (activo !== undefined) { fields.push(`activo = $${idx++}`); values.push(activo); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, nombre, email, rol, activo`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id/horas-mensuales - Actualizar horas mensuales estándar (admin)
router.put('/:id/horas-mensuales', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { horas_mensuales } = req.body;

  if (!horas_mensuales || isNaN(Number(horas_mensuales)) || Number(horas_mensuales) <= 0) {
    return res.status(400).json({ error: 'horas_mensuales debe ser un número positivo' });
  }

  try {
    await pool.query(
      'UPDATE usuarios SET horas_mensuales = $1 WHERE id = $2',
      [horas_mensuales, id]
    );

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    await pool.query(
      `INSERT INTO monthly_hours (user_id, month, total_hours, used_hours, rollover_hours)
       VALUES ($1, $2, $3, 0, 0)
       ON CONFLICT (user_id, month) DO UPDATE SET total_hours = $3, updated_at = NOW()`,
      [id, month, horas_mensuales]
    );

    return res.status(200).json({ ok: true, horas_mensuales });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/usuarios/:id - Eliminar usuario (admin)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id, email', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json({ message: 'Usuario eliminado', user: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
