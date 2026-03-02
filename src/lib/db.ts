import * as dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error en pool de PostgreSQL:', err);
});

export default pool;
