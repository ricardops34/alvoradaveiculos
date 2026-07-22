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
      whereClause += ` AND titulo ILIKE $${params.length}`;
    }

    const totalResult = await pool.query(`SELECT COUNT(*) FROM publicidade ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM publicidade ${whereClause} ORDER BY ordem, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );

    res.json({ items: result.rows, hasNext: offset + result.rows.length < total, total });
  } catch (err) {
    console.error('Erro ao listar publicidade:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM publicidade WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Anúncio não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar publicidade:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { titulo, imagem_url, link_url, posicao, ativo, ordem } = req.body;
    const result = await pool.query(
      `INSERT INTO publicidade (titulo, imagem_url, link_url, posicao, ativo, ordem) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [titulo, imagem_url || null, link_url || null, posicao || 'lateral', ativo !== false, ordem || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar publicidade:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { titulo, imagem_url, link_url, posicao, ativo, ordem } = req.body;
    const result = await pool.query(
      `UPDATE publicidade SET titulo=$1, imagem_url=$2, link_url=$3, posicao=$4, ativo=$5, ordem=$6 WHERE id=$7 RETURNING *`,
      [titulo, imagem_url || null, link_url || null, posicao || 'lateral', ativo !== false, ordem || 0, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Anúncio não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar publicidade:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM publicidade WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir publicidade:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
