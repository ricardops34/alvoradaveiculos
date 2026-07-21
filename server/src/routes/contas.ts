import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, tipo, status, pessoa_id, veiculo_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (tipo) {
      params.push(tipo);
      whereClause += ` AND c.tipo = $${params.length}`;
    }
    if (status) {
      params.push(status);
      whereClause += ` AND c.status = $${params.length}`;
    }
    if (pessoa_id) {
      params.push(pessoa_id);
      whereClause += ` AND c.pessoa_id = $${params.length}`;
    }
    if (veiculo_id) {
      params.push(veiculo_id);
      whereClause += ` AND c.veiculo_id = $${params.length}`;
    }

    const queryBase = `
      FROM contas c
      LEFT JOIN pessoas p ON c.pessoa_id = p.id
      LEFT JOIN veiculos v ON c.veiculo_id = v.id
      LEFT JOIN centros_custo cc ON c.centro_custo_id = cc.id
      LEFT JOIN bancos b ON c.banco_id = b.id
      ${whereClause}
    `;

    const totalResult = await pool.query(`SELECT COUNT(*) ${queryBase}`, params);
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(`
      SELECT c.*,
             p.nome as pessoa_nome,
             v.placa as veiculo_placa,
             cc.nome as centro_custo_nome,
             b.nome as banco_nome
      ${queryBase}
      ORDER BY c.status ASC, c.data_vencimento ASC NULLS LAST, c.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total: total
    });
  } catch (err) {
    console.error('Erro ao listar contas:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM contas WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar conta:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { tipo, descricao, valor, data_emissao, data_vencimento, pessoa_id, veiculo_id, centro_custo_id } = req.body;

    if (tipo !== 'Pagar' && tipo !== 'Receber') {
      res.status(400).json({ error: "Tipo deve ser 'Pagar' ou 'Receber'" });
      return;
    }

    // Título vinculado a veículo exige também o centro de custo (placa é o código do veículo)
    if (veiculo_id && !centro_custo_id) {
      res.status(400).json({ error: 'Contas vinculadas a um veículo exigem um Centro de Custo.' });
      return;
    }

    const result = await pool.query(
      `INSERT INTO contas (tipo, descricao, valor, data_emissao, data_vencimento, pessoa_id, veiculo_id, centro_custo_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Pendente') RETURNING *`,
      [tipo, descricao, valor, data_emissao || new Date().toISOString().split('T')[0], data_vencimento || null, pessoa_id || null, veiculo_id || null, centro_custo_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar conta:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { descricao, valor, data_emissao, data_vencimento, pessoa_id, veiculo_id, centro_custo_id } = req.body;

    if (veiculo_id && !centro_custo_id) {
      res.status(400).json({ error: 'Contas vinculadas a um veículo exigem um Centro de Custo.' });
      return;
    }

    const current = await pool.query('SELECT status FROM contas WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }
    if (current.rows[0].status !== 'Pendente') {
      res.status(400).json({ error: 'Só é possível editar contas com status Pendente.' });
      return;
    }

    const result = await pool.query(
      `UPDATE contas SET descricao=$1, valor=$2, data_emissao=$3, data_vencimento=$4, pessoa_id=$5, veiculo_id=$6, centro_custo_id=$7
       WHERE id=$8 RETURNING *`,
      [descricao, valor, data_emissao, data_vencimento || null, pessoa_id || null, veiculo_id || null, centro_custo_id || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar conta:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const current = await pool.query('SELECT status FROM contas WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }
    if (current.rows[0].status !== 'Pendente') {
      res.status(400).json({ error: 'Só é possível excluir contas com status Pendente.' });
      return;
    }
    await pool.query('DELETE FROM contas WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir conta:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST - Dar baixa: gera o movimento (Débito se Pagar, Crédito se Receber) e marca a conta como Paga
router.post('/:id/baixar', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { banco_id, data_pagamento, centro_custo_id } = req.body;

    if (!banco_id) {
      res.status(400).json({ error: 'Informe a conta bancária/caixa da baixa.' });
      return;
    }

    await client.query('BEGIN');

    const contaResult = await client.query('SELECT * FROM contas WHERE id = $1', [id]);
    if (contaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Conta não encontrada' });
      return;
    }

    const conta = contaResult.rows[0];
    if (conta.status !== 'Pendente') {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Esta conta já foi baixada ou está cancelada.' });
      return;
    }

    const centroCustoFinal = centro_custo_id || conta.centro_custo_id;
    if (!centroCustoFinal) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Informe o Centro de Custo da baixa.' });
      return;
    }

    const dataMov = data_pagamento || new Date().toISOString().split('T')[0];
    const tipoMovimento = conta.tipo === 'Pagar' ? 'Débito' : 'Crédito';
    const valorMovimento = conta.tipo === 'Pagar' ? -Math.abs(Number(conta.valor)) : Math.abs(Number(conta.valor));

    const movResult = await client.query(
      `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [dataMov, banco_id, tipoMovimento, `Baixa - ${conta.descricao}`, valorMovimento, conta.veiculo_id, conta.pessoa_id, centroCustoFinal]
    );

    const updateResult = await client.query(
      `UPDATE contas SET status = 'Pago', banco_id = $1, data_pagamento = $2, movimento_id = $3, centro_custo_id = $4
       WHERE id = $5 RETURNING *`,
      [banco_id, dataMov, movResult.rows[0].id, centroCustoFinal, id]
    );

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao dar baixa na conta:', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

export default router;
