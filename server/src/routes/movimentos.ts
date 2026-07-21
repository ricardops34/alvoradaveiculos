import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, banco_id, veiculo_id, centro_custo_id, tipo, data_inicio, data_fim } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (banco_id) {
      params.push(banco_id);
      whereClause += ` AND m.banco_id = $${params.length}`;
    }
    if (veiculo_id) {
      params.push(veiculo_id);
      whereClause += ` AND m.veiculo_id = $${params.length}`;
    }
    if (centro_custo_id) {
      params.push(centro_custo_id);
      whereClause += ` AND m.centro_custo_id = $${params.length}`;
    }
    if (tipo) {
      params.push(tipo);
      whereClause += ` AND m.tipo = $${params.length}`;
    }
    if (data_inicio) {
      params.push(data_inicio);
      whereClause += ` AND m.data >= $${params.length}`;
    }
    if (data_fim) {
      params.push(data_fim);
      whereClause += ` AND m.data <= $${params.length}`;
    }

    const queryBase = `
      FROM movimentos m
      LEFT JOIN bancos b ON m.banco_id = b.id
      LEFT JOIN centros_custo cc ON m.centro_custo_id = cc.id
      LEFT JOIN pessoas p ON m.pessoa_id = p.id
      LEFT JOIN veiculos v ON m.veiculo_id = v.id
      LEFT JOIN marcas ma ON v.marca_id = ma.id
      LEFT JOIN modelos mo ON v.modelo_id = mo.id
      ${whereClause}
    `;

    const totalResult = await pool.query(`SELECT COUNT(*) ${queryBase}`, params);
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(`
      SELECT m.*,
             b.nome as banco_nome,
             cc.nome as centro_custo_nome,
             p.nome as pessoa_nome,
             v.placa as veiculo_placa,
             COALESCE(ma.nome, v.marca) as veiculo_marca,
             COALESCE(mo.nome, v.modelo) as veiculo_modelo
      ${queryBase}
      ORDER BY m.data DESC, m.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total: total
    });
  } catch (err) {
    console.error('Erro ao listar movimentos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { data, banco_id, tipo, historico, valor, centro_custo_id, veiculo_id, pessoa_id } = req.body;
    const result = await pool.query(
      `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, centro_custo_id, veiculo_id, pessoa_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [data, banco_id, tipo, historico, valor, centro_custo_id||null, veiculo_id||null, pessoa_id||null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar movimento:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, banco_id, tipo, historico, valor, centro_custo_id, veiculo_id, pessoa_id } = req.body;
    const result = await pool.query(
      `UPDATE movimentos SET data=$1, banco_id=$2, tipo=$3, historico=$4, valor=$5, centro_custo_id=$6, veiculo_id=$7, pessoa_id=$8
       WHERE id=$9 RETURNING *`,
      [data, banco_id, tipo, historico, valor, centro_custo_id||null, veiculo_id||null, pessoa_id||null, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Movimento não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar movimento:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM movimentos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir movimento:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
