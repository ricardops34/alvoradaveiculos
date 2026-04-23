import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET - Listar todos (pode filtrar por marca_id e tipo_veiculo e suporta paginação)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { marca_id, tipo_veiculo, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let queryBase = `
      FROM modelos m 
      LEFT JOIN marcas ma ON m.marca_id = ma.id 
    `;
    let params: any[] = [];
    let conditions: string[] = [];

    if (marca_id) {
      conditions.push(`m.marca_id = $${params.length + 1}`);
      params.push(marca_id);
    }
    if (tipo_veiculo) {
      conditions.push(`m.tipo_veiculo = $${params.length + 1}`);
      params.push(tipo_veiculo);
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    
    // Total para paginação
    const totalResult = await pool.query(`SELECT COUNT(*) ${queryBase} ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count);

    let query = `SELECT m.*, ma.nome as marca_nome ${queryBase} ${whereClause}`;
    query += ` ORDER BY m.nome LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);
    
    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total: total
    });
  } catch (err) {
    console.error('Erro ao listar modelos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST - Criar
router.post('/', async (req: Request, res: Response) => {
  try {
    const { marca_id, nome, tipo_veiculo, ano_inicial, ano_final, descricao_detalhada } = req.body;
    const result = await pool.query(
      'INSERT INTO modelos (marca_id, nome, tipo_veiculo, ano_inicial, ano_final, descricao_detalhada) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [marca_id, nome, tipo_veiculo || 'Carro', ano_inicial, ano_final, descricao_detalhada]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar modelo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT - Atualizar
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { marca_id, nome, tipo_veiculo, ano_inicial, ano_final, descricao_detalhada } = req.body;
    const result = await pool.query(
      'UPDATE modelos SET marca_id = $1, nome = $2, tipo_veiculo = $3, ano_inicial = $4, ano_final = $5, descricao_detalhada = $6 WHERE id = $7 RETURNING *',
      [marca_id, nome, tipo_veiculo, ano_inicial, ano_final, descricao_detalhada, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Modelo não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar modelo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE - Excluir
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM modelos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir modelo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
