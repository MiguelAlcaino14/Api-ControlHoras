import { Router, type Response } from 'express';
import pool from '../lib/db.js';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

// PATCH /api/profiles/liberar/:id (admin)
router.patch('/liberar/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE usuarios SET is_released = true, released_at = NOW()
       WHERE id = $1
       RETURNING id, nombre, email, rol, activo, is_released, released_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json({
      message: 'Perfil liberado con éxito',
      profile: result.rows[0],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/profiles/all (admin)
router.get('/all', authMiddleware, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, nombre, email, rol, activo, is_released FROM usuarios ORDER BY nombre'
    );
    return res.status(200).json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
