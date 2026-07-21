import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// GET - Ranking de vendedores (quantidade de vendas, valor total vendido e comissão total)
router.get('/ranking', async (req: Request, res: Response) => {
  try {
    const { data_inicio, data_fim } = req.query;

    let whereClause = "WHERE v.status = 'Vendido' AND v.vendedor_id IS NOT NULL";
    const params: any[] = [];

    if (data_inicio) {
      params.push(data_inicio);
      whereClause += ` AND v.data_venda >= $${params.length}`;
    }
    if (data_fim) {
      params.push(data_fim);
      whereClause += ` AND v.data_venda <= $${params.length}`;
    }

    const result = await pool.query(`
      SELECT vd.id as vendedor_id, vd.nome as vendedor_nome,
             COUNT(v.id) as total_vendas,
             COALESCE(SUM(v.valor_venda), 0) as valor_total_vendido,
             COALESCE(SUM(v.comissao_valor), 0) as comissao_total
      FROM veiculos v
      JOIN pessoas vd ON v.vendedor_id = vd.id
      ${whereClause}
      GROUP BY vd.id, vd.nome
      ORDER BY valor_total_vendido DESC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao calcular ranking de vendedores:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
