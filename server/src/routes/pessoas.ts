import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const totalResult = await pool.query('SELECT COUNT(*) FROM pessoas');
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query('SELECT * FROM pessoas ORDER BY id DESC LIMIT $1 OFFSET $2', [Number(limit), offset]);
    
    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total: total
    });
  } catch (err) {
    console.error('Erro ao listar pessoas:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, documento, tipo_pessoa, is_cliente, is_fornecedor, is_vendedor, is_socio, telefone, email, cidade, estado } = req.body;
    const result = await pool.query(
      `INSERT INTO pessoas (nome, documento, tipo_pessoa, is_cliente, is_fornecedor, is_vendedor, is_socio, telefone, email, cidade, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [nome, documento, tipo_pessoa, is_cliente||0, is_fornecedor||0, is_vendedor||0, is_socio||0, telefone, email, cidade, estado]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar pessoa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, documento, tipo_pessoa, is_cliente, is_fornecedor, is_vendedor, is_socio, telefone, email, cidade, estado } = req.body;
    const result = await pool.query(
      `UPDATE pessoas SET nome=$1, documento=$2, tipo_pessoa=$3, is_cliente=$4, is_fornecedor=$5, is_vendedor=$6, is_socio=$7, telefone=$8, email=$9, cidade=$10, estado=$11
       WHERE id=$12 RETURNING *`,
      [nome, documento, tipo_pessoa, is_cliente||0, is_fornecedor||0, is_vendedor||0, is_socio||0, telefone, email, cidade, estado, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Pessoa não encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar pessoa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM pessoas WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir pessoa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
