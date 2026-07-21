import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, filter } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    if (filter) {
      params.push(`%${filter}%`);
      whereClause += ` AND (nome ILIKE $${params.length} OR codigo ILIKE $${params.length})`;
    }

    const totalResult = await pool.query(`SELECT COUNT(*) FROM centros_custo ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM centros_custo ${whereClause} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );
    
    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total: total
    });
  } catch (err) {
    console.error('Erro ao listar centros de custo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM centros_custo WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Centro de custo não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar centro de custo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { codigo, nome, tipo } = req.body;
    const result = await pool.query(
      'INSERT INTO centros_custo (codigo, nome, tipo) VALUES ($1, $2, $3) RETURNING *',
      [codigo, nome, tipo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar centro de custo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { codigo, nome, tipo } = req.body;
    const result = await pool.query(
      'UPDATE centros_custo SET codigo=$1, nome=$2, tipo=$3 WHERE id=$4 RETURNING *',
      [codigo, nome, tipo, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Centro de custo não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar centro de custo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM centros_custo WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir centro de custo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
