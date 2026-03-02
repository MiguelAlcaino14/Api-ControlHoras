import { Router, type Response } from 'express';
import pool from '../lib/db.js';
import { AuthRequest, authMiddleware, adminOnly } from '../middleware/auth.js';

const router = Router();

// GET /api/time/entries - Listar time entries (con filtros)
router.get('/entries', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { user_id, fecha_desde, fecha_hasta, caso } = req.query;
  const isAdmin = req.user!.rol === 'admin';

  try {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    // Si no es admin, solo puede ver sus propios registros
    if (!isAdmin) {
      conditions.push(`user_id = $${idx++}`);
      values.push(req.user!.id);
    } else if (user_id) {
      conditions.push(`user_id = $${idx++}`);
      values.push(user_id);
    }

    if (fecha_desde) {
      conditions.push(`fecha >= $${idx++}`);
      values.push(fecha_desde);
    }
    if (fecha_hasta) {
      conditions.push(`fecha <= $${idx++}`);
      values.push(fecha_hasta);
    }
    if (caso) {
      conditions.push(`caso = $${idx++}`);
      values.push(caso);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM time_entries ${where} ORDER BY created_at DESC`,
      values
    );

    return res.status(200).json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/time/entries/search - Buscar entry por user_id + caso (para CSV import)
router.get('/entries/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { caso } = req.query;
  try {
    const result = await pool.query(
      'SELECT id, horas_utilizadas FROM time_entries WHERE user_id = $1 AND caso = $2 LIMIT 1',
      [req.user!.id, caso]
    );
    return res.status(200).json(result.rows[0] || null);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/time/entries - Crear time entry
router.post('/entries', authMiddleware, async (req: AuthRequest, res: Response) => {
  const {
    project_id, client_id, fecha, asunto, servicio,
    estado, hh, caso, proyecto, complejidad,
    compania, razon, categoria, solicitante,
    horas_utilizadas, fecha_creacion, fecha_solucion
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO time_entries (
        user_id, project_id, client_id, fecha, asunto, servicio,
        estado, hh, caso, proyecto, complejidad,
        compania, razon, categoria, solicitante,
        horas_utilizadas, fecha_creacion, fecha_solucion
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        req.user!.id, project_id || null, client_id || null, fecha, asunto, servicio,
        estado || 'abierto', hh || 0, caso, proyecto, complejidad || 'media',
        compania || '', razon || '', categoria || '', solicitante || '',
        horas_utilizadas || 0, fecha_creacion || null, fecha_solucion || null
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/time/entries/:id - Actualizar time entry
router.put('/entries/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    project_id, client_id, fecha, asunto, servicio,
    estado, hh, caso, proyecto, complejidad,
    compania, razon, categoria, solicitante,
    horas_utilizadas, fecha_creacion, fecha_solucion
  } = req.body;

  try {
    // Verificar que le pertenece (o es admin)
    if (req.user!.rol !== 'admin') {
      const check = await pool.query('SELECT user_id FROM time_entries WHERE id = $1', [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Entrada no encontrada' });
      if (check.rows[0].user_id !== req.user!.id) return res.status(403).json({ error: 'No autorizado' });
    }

    const result = await pool.query(
      `UPDATE time_entries SET
        project_id = COALESCE($1, project_id),
        client_id = COALESCE($2, client_id),
        fecha = COALESCE($3, fecha),
        asunto = COALESCE($4, asunto),
        servicio = COALESCE($5, servicio),
        estado = COALESCE($6, estado),
        hh = COALESCE($7, hh),
        caso = COALESCE($8, caso),
        proyecto = COALESCE($9, proyecto),
        complejidad = COALESCE($10, complejidad),
        compania = COALESCE($11, compania),
        razon = COALESCE($12, razon),
        categoria = COALESCE($13, categoria),
        solicitante = COALESCE($14, solicitante),
        horas_utilizadas = COALESCE($15, horas_utilizadas),
        fecha_creacion = COALESCE($16, fecha_creacion),
        fecha_solucion = COALESCE($17, fecha_solucion),
        updated_at = NOW()
      WHERE id = $18
      RETURNING *`,
      [
        project_id, client_id, fecha, asunto, servicio,
        estado, hh, caso, proyecto, complejidad,
        compania, razon, categoria, solicitante,
        horas_utilizadas, fecha_creacion, fecha_solucion, id
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Entrada no encontrada' });
    return res.status(200).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ── MONTHLY HOURS ──

// GET /api/time/monthly/:user_id - Horas mensuales de un usuario
router.get('/monthly/:user_id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { user_id } = req.params;

  // Solo admin puede ver de otros usuarios
  if (req.user!.rol !== 'admin' && req.user!.id !== user_id) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM monthly_hours WHERE user_id = $1 ORDER BY month DESC',
      [user_id]
    );
    return res.status(200).json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/time/monthly-search - Buscar registro mensual específico
router.get('/monthly-search', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { month } = req.query;
  try {
    const result = await pool.query(
      'SELECT id, used_hours FROM monthly_hours WHERE user_id = $1 AND month = $2 LIMIT 1',
      [req.user!.id, month]
    );
    return res.status(200).json(result.rows[0] || null);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/time/monthly - Crear registro mensual
router.post('/monthly', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { month, total_hours, used_hours, rollover_hours } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO monthly_hours (user_id, month, total_hours, used_hours, rollover_hours)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, month) DO UPDATE SET
         used_hours = monthly_hours.used_hours + EXCLUDED.used_hours,
         updated_at = NOW()
       RETURNING *`,
      [req.user!.id, month, total_hours || 0, used_hours || 0, rollover_hours || 0]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/time/monthly/:id - Actualizar registro mensual
router.put('/monthly/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { used_hours, total_hours, rollover_hours } = req.body;

  try {
    const fields: string[] = ['updated_at = NOW()'];
    const values: any[] = [];
    let idx = 1;

    if (used_hours !== undefined) { fields.push(`used_hours = $${idx++}`); values.push(used_hours); }
    if (total_hours !== undefined) { fields.push(`total_hours = $${idx++}`); values.push(total_hours); }
    if (rollover_hours !== undefined) { fields.push(`rollover_hours = $${idx++}`); values.push(rollover_hours); }

    values.push(id);
    const result = await pool.query(
      `UPDATE monthly_hours SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    return res.status(200).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
