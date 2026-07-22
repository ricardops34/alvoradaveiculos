import { Pool, types } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// O driver `pg` devolve colunas NUMERIC/DECIMAL (OID 1700) como string por padrão, pra não
// arriscar perda de precisão em valores arbitrários. Aqui os valores são sempre monetários
// (DECIMAL(15,2)), bem dentro da precisão seguro de um number — sem isso, ordenação e
// comparações numéricas no frontend (ex: tabela de veículos por Vlr. Avaliação) ficam erradas,
// pois viram comparação de texto ("275900.00" < "99900.00" alfabeticamente).
types.setTypeParser(1700, (value) => parseFloat(value));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://alvorada:alvorada2026@localhost:5432/alvorada_db',
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool PostgreSQL:', err);
});

export default pool;
