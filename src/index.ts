import express from 'express';
import cors from 'cors';
import profilesRouter from './routes/profiles.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/profiles', profilesRouter);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de API CONTROLHORAS corriendo en puerto ${PORT}`);
});