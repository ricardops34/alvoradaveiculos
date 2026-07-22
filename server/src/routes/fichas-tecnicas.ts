import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, modelo_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    if (modelo_id) {
      params.push(modelo_id);
      whereClause += ` AND f.modelo_id = $${params.length}`;
    }

    const totalResult = await pool.query(`SELECT COUNT(*) FROM fichas_tecnicas f ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(
      `SELECT f.*, mo.nome as modelo_nome, ma.nome as marca_nome
       FROM fichas_tecnicas f
       LEFT JOIN modelos mo ON f.modelo_id = mo.id
       LEFT JOIN marcas ma ON mo.marca_id = ma.id
       ${whereClause}
       ORDER BY ma.nome, mo.nome LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );

    res.json({ items: result.rows, hasNext: offset + result.rows.length < total, total });
  } catch (err) {
    console.error('Erro ao listar fichas técnicas:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM fichas_tecnicas WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ficha técnica não encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar ficha técnica:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { modelo_id, motor, potencia, torque, cambio, tracao, consumo_cidade, consumo_estrada, porta_malas, tanque, observacoes } = req.body;
    const result = await pool.query(
      `INSERT INTO fichas_tecnicas (modelo_id, motor, potencia, torque, cambio, tracao, consumo_cidade, consumo_estrada, porta_malas, tanque, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (modelo_id) DO UPDATE SET motor=$2, potencia=$3, torque=$4, cambio=$5, tracao=$6, consumo_cidade=$7, consumo_estrada=$8, porta_malas=$9, tanque=$10, observacoes=$11
       RETURNING *`,
      [modelo_id, motor || null, potencia || null, torque || null, cambio || null, tracao || null, consumo_cidade || null, consumo_estrada || null, porta_malas || null, tanque || null, observacoes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar ficha técnica:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { motor, potencia, torque, cambio, tracao, consumo_cidade, consumo_estrada, porta_malas, tanque, observacoes } = req.body;
    const result = await pool.query(
      `UPDATE fichas_tecnicas SET motor=$1, potencia=$2, torque=$3, cambio=$4, tracao=$5, consumo_cidade=$6, consumo_estrada=$7, porta_malas=$8, tanque=$9, observacoes=$10 WHERE id=$11 RETURNING *`,
      [motor || null, potencia || null, torque || null, cambio || null, tracao || null, consumo_cidade || null, consumo_estrada || null, porta_malas || null, tanque || null, observacoes || null, req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Ficha técnica não encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar ficha técnica:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM fichas_tecnicas WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir ficha técnica:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
