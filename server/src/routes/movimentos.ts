import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const totalResult = await pool.query('SELECT COUNT(*) FROM movimentos');
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query('SELECT * FROM movimentos ORDER BY data DESC, id DESC LIMIT $1 OFFSET $2', [Number(limit), offset]);
    
    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total: total
    });
  } catch (err) {
    console.error('Erro ao listar movimentos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { data, banco_id, tipo, historico, valor, centro_custo_id, veiculo_id, pessoa_id } = req.body;
    const result = await pool.query(
      `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, centro_custo_id, veiculo_id, pessoa_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [data, banco_id, tipo, historico, valor, centro_custo_id||null, veiculo_id||null, pessoa_id||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar movimento:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, banco_id, tipo, historico, valor, centro_custo_id, veiculo_id, pessoa_id } = req.body;
    const result = await pool.query(
      `UPDATE movimentos SET data=$1, banco_id=$2, tipo=$3, historico=$4, valor=$5, centro_custo_id=$6, veiculo_id=$7, pessoa_id=$8
       WHERE id=$9 RETURNING *`,
      [data, banco_id, tipo, historico, valor, centro_custo_id||null, veiculo_id||null, pessoa_id||null, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Movimento não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar movimento:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM movimentos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir movimento:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
