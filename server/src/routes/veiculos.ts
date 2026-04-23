import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];

    if (status && status !== 'Todos') {
      whereClause = 'WHERE v.status = $1';
      params.push(status);
    }

    const queryBase = `
      FROM veiculos v
      LEFT JOIN marcas ma ON v.marca_id = ma.id
      LEFT JOIN modelos mo ON v.modelo_id = mo.id
      LEFT JOIN pessoas f ON v.fornecedor_id = f.id
      LEFT JOIN pessoas c ON v.cliente_id = c.id
      ${whereClause}
    `;

    // Total para paginação
    const totalResult = await pool.query(`SELECT COUNT(*) ${queryBase}`, params);
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(`
      SELECT v.*, 
             COALESCE(ma.nome, v.marca) as marca_nome, 
             COALESCE(mo.nome, v.modelo) as modelo_nome,
             f.nome as fornecedor_nome,
             c.nome as cliente_nome
      ${queryBase}
      ORDER BY v.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, Number(limit), offset]);

    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total: total
    });
  } catch (err) {
    console.error('Erro ao listar veículos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { placa, marca, modelo, marca_id, modelo_id, tipo_veiculo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda, data_compra, status, forma_compra, banco_id, centro_custo_id, fornecedor_id, cliente_id, fotos } = req.body;
    
    const result = await client.query(
      `INSERT INTO veiculos (placa, marca, modelo, marca_id, modelo_id, tipo_veiculo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda, data_compra, status, forma_compra, banco_id, fornecedor_id, cliente_id, fotos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *`,
      [placa, marca, modelo, marca_id||null, modelo_id||null, tipo_veiculo||'Carro', versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda||null, data_compra, status||'Estoque', forma_compra||'Troca', banco_id||null, fornecedor_id||null, cliente_id||null, fotos||[]]
    );

    const vehicle = result.rows[0];

    if (forma_compra === 'Banco' && banco_id && centro_custo_id && valor_compra) {
      await client.query(
        `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [data_compra || new Date().toISOString().split('T')[0], banco_id, 'Débito', `Compra Veículo ${marca} ${modelo} (${placa})`, -Math.abs(valor_compra), vehicle.id, fornecedor_id || null, centro_custo_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(vehicle);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar veículo:', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { placa, marca, modelo, marca_id, modelo_id, tipo_veiculo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda, data_compra, status, forma_compra, banco_id, fornecedor_id, cliente_id, fotos } = req.body;
    const result = await pool.query(
      `UPDATE veiculos SET placa=$1, marca=$2, modelo=$3, marca_id=$4, modelo_id=$5, tipo_veiculo=$6, versao=$7, ano_fabricacao=$8, ano_modelo=$9, cor=$10, quilometragem=$11, valor_compra=$12, valor_avaliacao=$13, valor_venda=$14, data_compra=$15, status=$16, forma_compra=$17, banco_id=$18, fornecedor_id=$19, cliente_id=$20, fotos=$21
       WHERE id=$22 RETURNING *`,
      [placa, marca, modelo, marca_id||null, modelo_id||null, tipo_veiculo||'Carro', versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda||null, data_compra, status||'Estoque', forma_compra||'Troca', banco_id||null, fornecedor_id||null, cliente_id||null, fotos||[], id]
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

router.post('/:id/vender', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { cliente_id, data_venda, valor_venda, forma_venda, banco_id, centro_custo_id, troca_placa, troca_marca, troca_modelo, troca_cor, troca_ano_fab, troca_ano_mod, troca_valor } = req.body;
    
    await client.query('BEGIN');
    
    const result = await client.query(
      `UPDATE veiculos SET status = 'Vendido', cliente_id = $1, valor_venda = $2, data_venda = $3
       WHERE id = $4 RETURNING *`,
      [cliente_id, valor_venda, data_venda, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Veículo não encontrado' });
      return;
    }

    const vehicle = result.rows[0];

    if (forma_venda === 'Banco' && banco_id && centro_custo_id) {
      await client.query(
        `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [data_venda || new Date().toISOString().split('T')[0], banco_id, 'Crédito', `Venda Veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa})`, Math.abs(valor_venda), vehicle.id, cliente_id, centro_custo_id]
      );
    } else if (forma_venda === 'Troca') {
      await client.query(
        `INSERT INTO veiculos (placa, marca, modelo, marca_id, modelo_id, tipo_veiculo, cor, ano_fabricacao, ano_modelo, valor_compra, data_compra, status, forma_compra, fornecedor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [troca_placa, troca_marca, troca_modelo, null, null, 'Carro', troca_cor || null, troca_ano_fab || null, troca_ano_mod || null, troca_valor, data_venda || new Date().toISOString().split('T')[0], 'Estoque', 'Troca', cliente_id]
      );
    }

    await client.query('COMMIT');
    res.json(vehicle);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao vender veículo:', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

export default router;
