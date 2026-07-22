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

    const totalResult = await pool.query(`SELECT COUNT(*) FROM noticias ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM noticias ${whereClause} ORDER BY publicado_em DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );

    res.json({ items: result.rows, hasNext: offset + result.rows.length < total, total });
  } catch (err) {
    console.error('Erro ao listar notícias:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM noticias WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notícia não encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar notícia:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { titulo, resumo, conteudo, imagem_url, ativo, publicado_em } = req.body;
    const result = await pool.query(
      `INSERT INTO noticias (titulo, resumo, conteudo, imagem_url, ativo, publicado_em) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [titulo, resumo || null, conteudo || null, imagem_url || null, ativo !== false, publicado_em || new Date().toISOString().split('T')[0]]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar notícia:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { titulo, resumo, conteudo, imagem_url, ativo, publicado_em } = req.body;
    const result = await pool.query(
      `UPDATE noticias SET titulo=$1, resumo=$2, conteudo=$3, imagem_url=$4, ativo=$5, publicado_em=$6 WHERE id=$7 RETURNING *`,
      [titulo, resumo || null, conteudo || null, imagem_url || null, ativo !== false, publicado_em, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Notícia não encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar notícia:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM noticias WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir notícia:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
