import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET - Listar todos
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM perfis ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar perfis:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST - Criar
router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, rotinas } = req.body;
    const result = await pool.query(
      'INSERT INTO perfis (nome, rotinas) VALUES ($1, $2) RETURNING *',
      [nome, rotinas || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar perfil:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT - Atualizar
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, rotinas } = req.body;
    const result = await pool.query(
      'UPDATE perfis SET nome = $1, rotinas = $2 WHERE id = $3 RETURNING *',
      [nome, rotinas || [], id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Perfil não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE - Excluir
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM perfis WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir perfil:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
