import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM veiculos ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar veículos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { placa, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda, data_compra, status, fornecedor_id, cliente_id, fotos } = req.body;
    const result = await pool.query(
      `INSERT INTO veiculos (placa, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda, data_compra, status, fornecedor_id, cliente_id, fotos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [placa, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda||null, data_compra, status||'Estoque', fornecedor_id||null, cliente_id||null, fotos||[]]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar veículo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { placa, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda, data_compra, status, fornecedor_id, cliente_id, fotos } = req.body;
    const result = await pool.query(
      `UPDATE veiculos SET placa=$1, marca=$2, modelo=$3, versao=$4, ano_fabricacao=$5, ano_modelo=$6, cor=$7, quilometragem=$8, valor_compra=$9, valor_avaliacao=$10, valor_venda=$11, data_compra=$12, status=$13, fornecedor_id=$14, cliente_id=$15, fotos=$16
       WHERE id=$17 RETURNING *`,
      [placa, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda||null, data_compra, status||'Estoque', fornecedor_id||null, cliente_id||null, fotos||[], id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Veículo não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar veículo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM veiculos WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir veículo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
