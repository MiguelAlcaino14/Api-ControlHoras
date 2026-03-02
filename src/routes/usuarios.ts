import { Router, type Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../lib/db.js';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

// GET /api/usuarios - Listar todos (admin)
router.get('/', authMiddleware, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, is_released, released_at, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC'
    );
    return res.status(200).json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/usuarios/monthly-summary - Resumen mensual de todos (admin)
router.get('/monthly-summary', authMiddleware, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.nombre, u.email, u.rol, u.activo,
        COALESCE(json_agg(
          json_build_object(
            'month', mh.month,
            'total_hours', mh.total_hours,
            'used_hours', mh.used_hours,
            'rollover_hours', mh.rollover_hours
          ) ORDER BY mh.month DESC
        ) FILTER (WHERE mh.id IS NOT NULL), '[]') AS monthly_hours
      FROM usuarios u
      LEFT JOIN monthly_hours mh ON mh.user_id = u.id
      GROUP BY u.id, u.nombre, u.email, u.rol, u.activo
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
