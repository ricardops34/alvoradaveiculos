import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET - Listar todos
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM marcas ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar marcas:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST - Criar
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome } = req.body;
    const result = await pool.query(
      'INSERT INTO marcas (nome) VALUES ($1) RETURNING *',
      [nome]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar marca:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT - Atualizar
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    const result = await pool.query(
      'UPDATE marcas SET nome = $1 WHERE id = $2 RETURNING *',
      [nome, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Marca não encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar marca:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE - Excluir
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM marcas WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir marca:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
