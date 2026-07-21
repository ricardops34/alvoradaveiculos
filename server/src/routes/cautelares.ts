import { Router, Request, Response } from 'express';
import pool from '../db';
import { createUploadMiddleware } from '../uploads';

const router = Router();

const uploadLaudo = createUploadMiddleware('cautelares');

// POST - Upload do laudo da cautelar (PDF/imagem)
router.post('/upload-laudo', uploadLaudo.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    return;
  }
  res.json({
    url: `/uploads/cautelares/${req.file.filename}`,
    filename: req.file.filename
  });
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { veiculo_id } = req.query;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (veiculo_id) {
      params.push(veiculo_id);
      whereClause += ` AND ca.veiculo_id = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT ca.*, cc.nome as centro_custo_nome, v.placa as veiculo_placa
      FROM cautelares ca
      LEFT JOIN centros_custo cc ON ca.centro_custo_id = cc.id
      LEFT JOIN veiculos v ON ca.veiculo_id = v.id
      ${whereClause}
      ORDER BY ca.data DESC, ca.id DESC
    `, params);

    res.json({ items: result.rows, hasNext: false, total: result.rows.length });
  } catch (err) {
    console.error('Erro ao listar cautelares:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      veiculo_id, empresa_realizadora, data, resultado, laudo_url, custo, centro_custo_id, banco_id, observacoes
    } = req.body;

    if (!veiculo_id) {
      res.status(400).json({ error: 'Informe o veículo.' });
      return;
    }
    if (custo && (!centro_custo_id || !banco_id)) {
      res.status(400).json({ error: 'Cautelar com custo exige Banco/Conta e Centro de Custo.' });
      return;
    }

    await client.query('BEGIN');

    let movimentoId: number | null = null;
    if (custo && centro_custo_id && banco_id) {
      const veiculoResult = await client.query('SELECT placa FROM veiculos WHERE id = $1', [veiculo_id]);
      const placa = veiculoResult.rows[0]?.placa || '';
      const movResult = await client.query(
        `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, centro_custo_id)
         VALUES ($1, $2, 'Débito', $3, $4, $5, $6) RETURNING id`,
        [data || new Date().toISOString().split('T')[0], banco_id, `Cautelar - ${empresa_realizadora || 'Vistoria'} (${placa})`, -Math.abs(custo), veiculo_id, centro_custo_id]
      );
      movimentoId = movResult.rows[0].id;
    }

    const result = await client.query(
      `INSERT INTO cautelares (veiculo_id, empresa_realizadora, data, resultado, laudo_url, custo, centro_custo_id, banco_id, movimento_id, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [veiculo_id, empresa_realizadora || null, data || new Date().toISOString().split('T')[0], resultado || null, laudo_url || null, custo || null, centro_custo_id || null, banco_id || null, movimentoId, observacoes || null]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar cautelar:', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { empresa_realizadora, data, resultado, laudo_url, observacoes } = req.body;
    const result = await pool.query(
      `UPDATE cautelares SET empresa_realizadora=$1, data=$2, resultado=$3, laudo_url=$4, observacoes=$5
       WHERE id=$6 RETURNING *`,
      [empresa_realizadora || null, data, resultado || null, laudo_url || null, observacoes || null, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cautelar não encontrada' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar cautelar:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const current = await client.query('SELECT movimento_id FROM cautelares WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Cautelar não encontrada' });
      return;
    }

    await client.query('DELETE FROM cautelares WHERE id = $1', [id]);

    const movimentoId = current.rows[0].movimento_id;
    if (movimentoId) {
      await client.query('DELETE FROM movimentos WHERE id = $1', [movimentoId]);
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir cautelar:', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

export default router;
