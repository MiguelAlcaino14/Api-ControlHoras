import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { 
    user_id, project_id, client_id, fecha, asunto, 
    servicio, estado, hh, caso, proyecto, complejidad 
  } = req.body;

  const { data, error } = await supabase
    .from('time_entries')
    .insert([{ 
      user_id, project_id, client_id, fecha, asunto, 
      servicio, estado, hh, caso, proyecto, complejidad,
      fecha_creacion: new Date().toISOString().split('T')[0]
    }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data[0]);
});

router.get('/monthly/:user_id', async (req: Request, res: Response) => {
  const { user_id } = req.params;
  const { data, error } = await supabase
    .from('monthly_hours')
    .select('*')
    .eq('user_id', user_id)
    .order('month', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
});

export default router;