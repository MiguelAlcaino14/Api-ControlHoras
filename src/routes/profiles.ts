import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

router.patch('/liberar/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('usuarios')
    .update({ 
      is_released: true, 
      released_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }


  return res.status(200).json({
    message: 'Perfil liberado con éxito',
    profile: data ? data[0] : null
  });
});

export default router;