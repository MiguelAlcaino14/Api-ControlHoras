import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRouter from './routes/auth.js';
import usuariosRouter from './routes/usuarios.js';
import profilesRouter from './routes/profiles.js';
import managementRouter from './routes/management.js';
import entriesRouter from './routes/entries.js';

const app = express();

// Security headers
app.use(helmet());

// CORS restringido a orígenes permitidos
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
  .split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (ej: Postman, apps móviles) solo en desarrollo
    if (!origin && process.env.NODE_ENV !== 'production') return callback(null, true);
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin no permitido: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Control Horas corriendo en puerto ${PORT}`);
});
