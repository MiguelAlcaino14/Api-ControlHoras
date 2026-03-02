import { Router, type Request, type Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.get('/clients', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('active', true);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
});

router.post('/projects', async (req: Request, res: Response) => {
  const { name, client_id, user_id, caso_code } = req.body;
  const { data, error } = await supabase
    .from('projects')
    .insert([{ name, client_id, user_id, caso_code, active: true }])
    .select();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data[0]);
});

export default router;