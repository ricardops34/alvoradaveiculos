import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://alvorada:alvorada2026@localhost:5432/alvorada_db',
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL:', err);
});

export default pool;
