import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET - Listar todos (pode filtrar por tipo_veiculo e suporta paginação)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { tipo_veiculo, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let query = 'SELECT * FROM marcas';
    let params: any[] = [];
    let paramIndex = 1;

    if (tipo_veiculo) {
      query += ` WHERE tipo_veiculo = $${paramIndex++}`;
      params.push(tipo_veiculo);
    }
    
    // Contagem total para o frontend saber se tem mais
    const totalResult = await pool.query(`SELECT COUNT(*) FROM marcas ${tipo_veiculo ? 'WHERE tipo_veiculo = $1' : ''}`, params);
    const total = parseInt(totalResult.rows[0].count);

    query += ` ORDER BY nome LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(Number(limit), offset);

    const result = await pool.query(query, params);
    
    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total: total
    });
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
