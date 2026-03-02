import express from 'express';
import cors from 'cors';
import profilesRouter from './routes/profiles.js';
import managementRouter from './routes/management.js';
import entriesRouter from './routes/entries.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/profiles', profilesRouter);
app.use('/api/management', managementRouter);
app.use('/api/time', entriesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Control Horas corriendo en puerto ${PORT}`);
});