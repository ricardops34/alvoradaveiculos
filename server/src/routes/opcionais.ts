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
      whereClause += ` AND nome ILIKE $${params.length}`;
    }

    const totalResult = await pool.query(`SELECT COUNT(*) FROM opcionais ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM opcionais ${whereClause} ORDER BY nome LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );

    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total: total
    });
  } catch (err) {
    console.error('Erro ao listar opcionais:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM opcionais WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Opcional não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar opcional:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;
    const result = await pool.query(
      'INSERT INTO opcionais (nome) VALUES ($1) RETURNING *',
      [nome]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar opcional:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const result = await pool.query(
      'UPDATE opcionais SET nome = $1 WHERE id = $2 RETURNING *',
      [nome, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Opcional não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar opcional:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM opcionais WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir opcional:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
