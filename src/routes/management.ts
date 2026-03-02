import { Router, type Response } from 'express';
import pool from '../lib/db.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';

const router = Router();

// ── CLIENTS ──

// GET /api/management/clients - Listar clientes del usuario
router.get('/clients', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clients WHERE user_id = $1 AND active = true ORDER BY name',
      [req.user!.id]
    );
    return res.status(200).json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/management/clients/search - Buscar cliente por nombre (para CSV import)
router.get('/clients/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name } = req.query;
  try {
    const result = await pool.query(
      'SELECT id FROM clients WHERE user_id = $1 AND name = $2 LIMIT 1',
      [req.user!.id, name]
    );
    return res.status(200).json(result.rows[0] || null);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/management/clients - Crear cliente
router.post('/clients', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO clients (user_id, name) VALUES ($1, $2)
       RETURNING id, user_id, name, active, created_at`,
      [req.user!.id, name]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── PROJECTS ──

// GET /api/management/projects - Listar proyectos del usuario
router.get('/projects', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE user_id = $1 AND active = true ORDER BY name',
      [req.user!.id]
    );
    return res.status(200).json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/management/projects/search - Buscar proyecto por caso_code (para CSV import)
router.get('/projects/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { caso_code } = req.query;
  try {
    const result = await pool.query(
      'SELECT id FROM projects WHERE user_id = $1 AND caso_code = $2 LIMIT 1',
      [req.user!.id, caso_code]
    );
    return res.status(200).json(result.rows[0] || null);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/management/projects - Crear proyecto
router.post('/projects', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, client_id, caso_code } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO projects (user_id, client_id, name, caso_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, client_id, name, caso_code, active, created_at`,
      [req.user!.id, client_id, name, caso_code]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
