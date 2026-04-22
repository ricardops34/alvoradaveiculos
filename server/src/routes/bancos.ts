import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM bancos ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar bancos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { codigo, nome, agencia, conta, tipo, limite_credito, saldo_inicial } = req.body;
    const result = await pool.query(
      'INSERT INTO bancos (codigo, nome, agencia, conta, tipo, limite_credito, saldo_inicial) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [codigo, nome, agencia, conta, tipo, limite_credito || 0, saldo_inicial || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar banco:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { codigo, nome, agencia, conta, tipo, limite_credito, saldo_inicial } = req.body;
    const result = await pool.query(
      'UPDATE bancos SET codigo=$1, nome=$2, agencia=$3, conta=$4, tipo=$5, limite_credito=$6, saldo_inicial=$7 WHERE id=$8 RETURNING *',
      [codigo, nome, agencia, conta, tipo, limite_credito || 0, saldo_inicial || 0, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Banco não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar banco:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM bancos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir banco:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
