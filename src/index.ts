import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import usuariosRouter from './routes/usuarios.js';
import profilesRouter from './routes/profiles.js';
import managementRouter from './routes/management.js';
import entriesRouter from './routes/entries.js';

const app = express();
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/management', managementRouter);
app.use('/api/time', entriesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Control Horas corriendo en puerto ${PORT}`);
});
