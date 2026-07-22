import { Router, Request, Response } from 'express';
import pool from '../db';
import { createUploadMiddleware, deleteUploadedFile } from '../uploads';
import { solicitarEntradaEstoque, solicitarSaidaEstoque, renaveEstaConfigurado } from '../services/renave';
import { buscarMarcasFipe, buscarModelosFipe, buscarAnosFipe, buscarPrecoFipe } from '../services/fipe';

const router = Router();

const uploadFoto = createUploadMiddleware('veiculos');

// Tabela FIPE (Invertexto) — busca assistida por marca/modelo/ano pra preencher o Valor FIPE no
// cadastro sem digitar manualmente. Ver ATENÇÃO em services/fipe.ts sobre o contrato não testado.
router.get('/fipe/marcas', async (req: Request, res: Response) => {
  try {
    const dados = await buscarMarcasFipe(String(req.query.tipo_veiculo || 'Carro'));
    res.json(dados);
  } catch (err: any) {
    console.error('Erro ao buscar marcas FIPE:', err);
    res.status(500).json({ error: err?.message || 'Erro ao buscar marcas na tabela FIPE.' });
  }
});

router.get('/fipe/modelos', async (req: Request, res: Response) => {
  try {
    const { tipo_veiculo, marca_fipe_id } = req.query;
    const dados = await buscarModelosFipe(String(tipo_veiculo || 'Carro'), String(marca_fipe_id));
    res.json(dados);
  } catch (err: any) {
    console.error('Erro ao buscar modelos FIPE:', err);
    res.status(500).json({ error: err?.message || 'Erro ao buscar modelos na tabela FIPE.' });
  }
});

router.get('/fipe/anos', async (req: Request, res: Response) => {
  try {
    const { tipo_veiculo, marca_fipe_id, modelo_fipe_id } = req.query;
    const dados = await buscarAnosFipe(String(tipo_veiculo || 'Carro'), String(marca_fipe_id), String(modelo_fipe_id));
    res.json(dados);
  } catch (err: any) {
    console.error('Erro ao buscar anos FIPE:', err);
    res.status(500).json({ error: err?.message || 'Erro ao buscar anos na tabela FIPE.' });
  }
});

router.get('/fipe/preco', async (req: Request, res: Response) => {
  try {
    const { tipo_veiculo, marca_fipe_id, modelo_fipe_id, ano_fipe_id } = req.query;
    const dados = await buscarPrecoFipe(String(tipo_veiculo || 'Carro'), String(marca_fipe_id), String(modelo_fipe_id), String(ano_fipe_id));
    res.json(dados);
  } catch (err: any) {
    console.error('Erro ao buscar preço FIPE:', err);
    res.status(500).json({ error: err?.message || 'Erro ao buscar preço na tabela FIPE.' });
  }
});

async function getPessoaRenave(pessoaId: number | null) {
  if (!pessoaId) return null;
  const result = await pool.query(
    `SELECT p.documento, p.nome, p.cep, p.logradouro, p.numero, p.complemento, p.bairro,
            m.codigo_ibge as municipio_codigo_ibge, e.sigla as estado_sigla
     FROM pessoas p
     LEFT JOIN municipios m ON p.municipio_id = m.id
     LEFT JOIN estados e ON p.estado_id = e.id
     WHERE p.id = $1`,
    [pessoaId]
  );
  return result.rows[0] || null;
}

// Dispara a solicitação de entrada/saída de estoque no RENAVE de forma assíncrona (não bloqueia
// a resposta da compra/venda — um problema de rede ou indisponibilidade do RENAVE não pode travar
// uma venda real). O resultado (protocolo/erro) fica registrado em `renave_status`/`renave_id_estoque`
// e pode ser consultado/reenviado depois pela tela de Veículos.
async function processarEntradaEstoqueRenave(veiculoId: number) {
  try {
    if (!(await renaveEstaConfigurado())) return;

    const veiculoResult = await pool.query('SELECT * FROM veiculos WHERE id = $1', [veiculoId]);
    const veiculo = veiculoResult.rows[0];
    if (!veiculo || !veiculo.chassi) return; // RENAVE exige chassi — sem ele, não há o que enviar

    const vendedor = await getPessoaRenave(veiculo.fornecedor_id);
    const resultado = await solicitarEntradaEstoque(veiculo, vendedor);
    await pool.query('UPDATE veiculos SET renave_id_estoque = $1, renave_status = $2 WHERE id = $3', [resultado.protocolo, resultado.status, veiculoId]);
  } catch (err: any) {
    console.error('Erro ao solicitar entrada de estoque no RENAVE:', err);
    await pool.query('UPDATE veiculos SET renave_status = $1 WHERE id = $2', [`Erro: ${String(err?.message || err).slice(0, 250)}`, veiculoId]).catch(() => {});
  }
}

async function processarSaidaEstoqueRenave(veiculoId: number) {
  try {
    if (!(await renaveEstaConfigurado())) return;

    const veiculoResult = await pool.query('SELECT * FROM veiculos WHERE id = $1', [veiculoId]);
    const veiculo = veiculoResult.rows[0];
    if (!veiculo || !veiculo.chassi) return;

    const comprador = await getPessoaRenave(veiculo.cliente_id);
    const resultado = await solicitarSaidaEstoque(veiculo, comprador);
    await pool.query('UPDATE veiculos SET renave_status = $1 WHERE id = $2', [resultado.status, veiculoId]);
  } catch (err: any) {
    console.error('Erro ao solicitar saída de estoque no RENAVE:', err);
    await pool.query('UPDATE veiculos SET renave_status = $1 WHERE id = $2', [`Erro: ${String(err?.message || err).slice(0, 250)}`, veiculoId]).catch(() => {});
  }
}

// POST - Upload de uma foto de veículo (armazenada em disco, não mais em Base64 no banco)
router.post('/upload-foto', uploadFoto.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    return;
  }
  res.json({
    url: `/uploads/veiculos/${req.file.filename}`,
    filename: req.file.filename
  });
});

// DELETE - Remove uma foto do disco (chamado quando o usuário retira a foto da galeria)
router.delete('/upload-foto/:filename', (req: Request, res: Response) => {
  try {
    deleteUploadedFile('veiculos', String(req.params.filename));
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir foto:', err);
    res.status(500).json({ error: 'Erro ao excluir foto.' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, marca_id, modelo_id, tipo_veiculo, opcionais, filter } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (status && status !== 'Todos') {
      const statusList = (status as string).split(',');
      if (statusList.length === 1) {
        params.push(statusList[0]);
        whereClause += ` AND v.status = $${params.length}`;
      } else {
        const placeholders = statusList.map((_, i) => {
          params.push(statusList[i]);
          return `$${params.length}`;
        }).join(',');
        whereClause += ` AND v.status IN (${placeholders})`;
      }
    }

    if (tipo_veiculo) {
      const tipoList = (tipo_veiculo as string).split(',');
      if (tipoList.length === 1) {
        params.push(tipoList[0]);
        whereClause += ` AND v.tipo_veiculo = $${params.length}`;
      } else {
        const placeholders = tipoList.map((_, i) => {
          params.push(tipoList[i]);
          return `$${params.length}`;
        }).join(',');
        whereClause += ` AND v.tipo_veiculo IN (${placeholders})`;
      }
    }

    if (marca_id) {
      params.push(marca_id);
      whereClause += ` AND v.marca_id = $${params.length}`;
    }

    if (modelo_id) {
      params.push(modelo_id);
      whereClause += ` AND v.modelo_id = $${params.length}`;
    }

    if (opcionais) {
      params.push((opcionais as string).split(','));
      whereClause += ` AND v.opcionais && $${params.length}`;
    }

    if (filter) {
      params.push(`%${filter}%`);
      whereClause += ` AND (v.placa ILIKE $${params.length} OR v.chassi ILIKE $${params.length})`;
    }

    const queryBase = `
      FROM veiculos v
      LEFT JOIN marcas ma ON v.marca_id = ma.id
      LEFT JOIN modelos mo ON v.modelo_id = mo.id
      LEFT JOIN pessoas f ON v.fornecedor_id = f.id
      LEFT JOIN pessoas c ON v.cliente_id = c.id
      LEFT JOIN pessoas vd ON v.vendedor_id = vd.id
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
             c.nome as cliente_nome,
             vd.nome as vendedor_nome
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

// GET - Histórico completo do veículo pelo chassi: todas as passagens dele pela loja
// (compras/vendas), histórico de quilometragem e cautelares/vistorias — usado tanto para
// detectar recompra ao cadastrar quanto para a tela de Histórico do Veículo.
router.get('/historico/:chassi', async (req: Request, res: Response) => {
  try {
    const { chassi } = req.params;

    const estadiasResult = await pool.query(`
      SELECT v.*,
             COALESCE(ma.nome, v.marca) as marca_nome,
             COALESCE(mo.nome, v.modelo) as modelo_nome,
             f.nome as fornecedor_nome,
             c.nome as cliente_nome
      FROM veiculos v
      LEFT JOIN marcas ma ON v.marca_id = ma.id
      LEFT JOIN modelos mo ON v.modelo_id = mo.id
      LEFT JOIN pessoas f ON v.fornecedor_id = f.id
      LEFT JOIN pessoas c ON v.cliente_id = c.id
      WHERE v.chassi = $1
      ORDER BY v.data_compra ASC NULLS LAST, v.id ASC
    `, [chassi]);

    const veiculoIds = estadiasResult.rows.map(v => v.id);
    if (veiculoIds.length === 0) {
      res.json({ estadias: [], km_historico: [], cautelares: [] });
      return;
    }

    const kmResult = await pool.query(
      `SELECT * FROM veiculo_km_historico WHERE veiculo_id = ANY($1::int[]) ORDER BY data ASC, id ASC`,
      [veiculoIds]
    );
    const cautelaresResult = await pool.query(
      `SELECT ca.*, cc.nome as centro_custo_nome, v.placa as veiculo_placa
       FROM cautelares ca
       LEFT JOIN centros_custo cc ON ca.centro_custo_id = cc.id
       LEFT JOIN veiculos v ON ca.veiculo_id = v.id
       WHERE ca.veiculo_id = ANY($1::int[]) ORDER BY ca.data ASC, ca.id ASC`,
      [veiculoIds]
    );

    res.json({
      estadias: estadiasResult.rows,
      km_historico: kmResult.rows,
      cautelares: cautelaresResult.rows
    });
  } catch (err) {
    console.error('Erro ao buscar histórico do veículo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT v.*,
             COALESCE(ma.nome, v.marca) as marca_nome,
             COALESCE(mo.nome, v.modelo) as modelo_nome,
             f.nome as fornecedor_nome,
             c.nome as cliente_nome,
             vd.nome as vendedor_nome
      FROM veiculos v
      LEFT JOIN marcas ma ON v.marca_id = ma.id
      LEFT JOIN modelos mo ON v.modelo_id = mo.id
      LEFT JOIN pessoas f ON v.fornecedor_id = f.id
      LEFT JOIN pessoas c ON v.cliente_id = c.id
      LEFT JOIN pessoas vd ON v.vendedor_id = vd.id
      WHERE v.id = $1
    `, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Veículo não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar veículo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      placa, marca, modelo, marca_id, modelo_id, tipo_veiculo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda, data_compra, status, forma_compra, banco_id, centro_custo_id, fornecedor_id, cliente_id, fotos, chassi, renavam, valor_fipe, observacoes, opcionais,
      tipo_crv, numero_crv, codigo_seguranca_crv, data_medicao_hodometro, nota_fiscal_compra_chave, nota_fiscal_venda_chave, publicado
    } = req.body;

    const result = await client.query(
      `INSERT INTO veiculos (placa, marca, modelo, marca_id, modelo_id, tipo_veiculo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda, data_compra, status, forma_compra, banco_id, fornecedor_id, cliente_id, fotos, chassi, renavam, valor_fipe, observacoes, opcionais, tipo_crv, numero_crv, codigo_seguranca_crv, data_medicao_hodometro, nota_fiscal_compra_chave, nota_fiscal_venda_chave, publicado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33) RETURNING *`,
      [placa, marca, modelo, marca_id||null, modelo_id||null, tipo_veiculo||'Carro', versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda||null, data_compra, status||'Estoque', forma_compra||'Troca', banco_id||null, fornecedor_id||null, cliente_id||null, fotos||[], chassi||null, renavam||null, valor_fipe||null, observacoes||null, opcionais||[],
       tipo_crv||null, numero_crv||null, codigo_seguranca_crv||null, data_medicao_hodometro||null, nota_fiscal_compra_chave||null, nota_fiscal_venda_chave||null, !!publicado]
    );

    const vehicle = result.rows[0];

    if (quilometragem !== undefined && quilometragem !== null) {
      await client.query(
        `INSERT INTO veiculo_km_historico (veiculo_id, data, quilometragem, origem) VALUES ($1, $2, $3, 'Cadastro')`,
        [vehicle.id, data_compra || new Date().toISOString().split('T')[0], quilometragem]
      );
    }

    if (forma_compra === 'Banco' && banco_id && centro_custo_id && valor_compra) {
      await client.query(
        `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [data_compra || new Date().toISOString().split('T')[0], banco_id, 'Débito', `Compra Veículo ${marca} ${modelo} (${placa})`, -Math.abs(valor_compra), vehicle.id, fornecedor_id || null, centro_custo_id]
      );
    }

    await client.query('COMMIT');
    processarEntradaEstoqueRenave(vehicle.id).catch(() => {});
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const {
      placa, marca, modelo, marca_id, modelo_id, tipo_veiculo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda, data_compra, status, forma_compra, banco_id, fornecedor_id, cliente_id, fotos, chassi, renavam, valor_fipe, observacoes, opcionais,
      tipo_crv, numero_crv, codigo_seguranca_crv, data_medicao_hodometro, nota_fiscal_compra_chave, nota_fiscal_venda_chave, publicado
    } = req.body;

    const oldResult = await client.query('SELECT quilometragem FROM veiculos WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Veículo não encontrado' });
      return;
    }
    const oldKm = oldResult.rows[0].quilometragem;

    const result = await client.query(
      `UPDATE veiculos SET placa=$1, marca=$2, modelo=$3, marca_id=$4, modelo_id=$5, tipo_veiculo=$6, versao=$7, ano_fabricacao=$8, ano_modelo=$9, cor=$10, quilometragem=$11, valor_compra=$12, valor_avaliacao=$13, valor_venda=$14, data_compra=$15, status=$16, forma_compra=$17, banco_id=$18, fornecedor_id=$19, cliente_id=$20, fotos=$21, chassi=$22, renavam=$23, valor_fipe=$24, observacoes=$25, opcionais=$26,
       tipo_crv=$27, numero_crv=$28, codigo_seguranca_crv=$29, data_medicao_hodometro=$30, nota_fiscal_compra_chave=$31, nota_fiscal_venda_chave=$32, publicado=$33
       WHERE id=$34 RETURNING *`,
      [placa, marca, modelo, marca_id||null, modelo_id||null, tipo_veiculo||'Carro', versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda||null, data_compra, status||'Estoque', forma_compra||'Troca', banco_id||null, fornecedor_id||null, cliente_id||null, fotos||[], chassi||null, renavam||null, valor_fipe||null, observacoes||null, opcionais||[],
       tipo_crv||null, numero_crv||null, codigo_seguranca_crv||null, data_medicao_hodometro||null, nota_fiscal_compra_chave||null, nota_fiscal_venda_chave||null, !!publicado, id]
    );

    if (quilometragem !== undefined && quilometragem !== null && Number(quilometragem) !== Number(oldKm)) {
      await client.query(
        `INSERT INTO veiculo_km_historico (veiculo_id, data, quilometragem, origem) VALUES ($1, CURRENT_DATE, $2, 'Manual')`,
        [id, quilometragem]
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar veículo:', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
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
    const {
      cliente_id, data_venda, valor_venda, forma_venda, banco_id, centro_custo_id, vendedor_id,
      troca_placa, troca_marca_id, troca_modelo_id, troca_tipo_veiculo, troca_cor, troca_ano_fab, troca_ano_mod, troca_valor,
      troca_chassi, troca_quilometragem, troca_valor_fipe, troca_observacoes,
      nota_fiscal_venda_chave, quilometragem
    } = req.body;

    await client.query('BEGIN');

    // Calcula a comissão do vendedor (se informado e com percentual configurado)
    let comissaoValor: number | null = null;
    if (vendedor_id) {
      const vendedorResult = await client.query('SELECT comissao_percentual FROM pessoas WHERE id = $1', [vendedor_id]);
      const percentual = Number(vendedorResult.rows[0]?.comissao_percentual || 0);
      if (percentual > 0) {
        comissaoValor = Math.round(Number(valor_venda) * (percentual / 100) * 100) / 100;
      }
    }

    const result = await client.query(
      `UPDATE veiculos SET status = 'Vendido', cliente_id = $1, valor_venda = $2, data_venda = $3, vendedor_id = $4, comissao_valor = $5, nota_fiscal_venda_chave = $6, quilometragem = COALESCE($7, quilometragem)
       WHERE id = $8 RETURNING *`,
      [cliente_id, valor_venda, data_venda, vendedor_id || null, comissaoValor, nota_fiscal_venda_chave || null, quilometragem || null, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Veículo não encontrado' });
      return;
    }

    const vehicle = result.rows[0];
    const dataMov = data_venda || new Date().toISOString().split('T')[0];

    if (quilometragem !== undefined && quilometragem !== null) {
      await client.query(
        `INSERT INTO veiculo_km_historico (veiculo_id, data, quilometragem, origem) VALUES ($1, $2, $3, 'Venda')`,
        [vehicle.id, dataMov, quilometragem]
      );
    }

    async function getComissaoCentroId(): Promise<number> {
      const existente = await client.query(`SELECT id FROM centros_custo WHERE nome = 'Comissão de Vendas'`);
      if (existente.rows[0]?.id) return existente.rows[0].id;
      const novo = await client.query(`INSERT INTO centros_custo (nome, tipo) VALUES ('Comissão de Vendas', 'Despesa') RETURNING id`);
      return novo.rows[0].id;
    }

    async function getCaixaBancoId(): Promise<number> {
      const existente = await client.query(`SELECT id FROM bancos WHERE tipo = 'Caixa' ORDER BY id LIMIT 1`);
      if (existente.rows[0]?.id) return existente.rows[0].id;
      const novo = await client.query(`INSERT INTO bancos (nome, tipo) VALUES ('Caixa', 'Caixa') RETURNING id`);
      return novo.rows[0].id;
    }

    if (forma_venda === 'Banco' && banco_id && centro_custo_id) {
      await client.query(
        `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [dataMov, banco_id, 'Crédito', `Venda Veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa})`, Math.abs(valor_venda), vehicle.id, cliente_id, centro_custo_id]
      );
    } else if (forma_venda === 'Troca') {
      if (!troca_placa || !troca_valor) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Informe ao menos a placa e o valor do veículo recebido na troca.' });
        return;
      }
      if (!centro_custo_id) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Venda com troca exige um Centro de Custo.' });
        return;
      }

      const caixaId = await getCaixaBancoId();

      // Veículo recebido em troca entra no estoque
      const trocaResult = await client.query(
        `INSERT INTO veiculos (placa, marca_id, modelo_id, tipo_veiculo, cor, ano_fabricacao, ano_modelo, valor_compra, data_compra, status, forma_compra, fornecedor_id, chassi, quilometragem, valor_fipe, observacoes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Estoque', 'Troca', $10, $11, $12, $13, $14) RETURNING *`,
        [troca_placa, troca_marca_id || null, troca_modelo_id || null, troca_tipo_veiculo || 'Carro', troca_cor || null, troca_ano_fab || null, troca_ano_mod || null, troca_valor, dataMov, cliente_id, troca_chassi || null, troca_quilometragem || null, troca_valor_fipe || null, troca_observacoes || null]
      );
      const veiculoTroca = trocaResult.rows[0];

      if (troca_quilometragem !== undefined && troca_quilometragem !== null) {
        await client.query(
          `INSERT INTO veiculo_km_historico (veiculo_id, data, quilometragem, origem) VALUES ($1, $2, $3, 'Cadastro')`,
          [veiculoTroca.id, dataMov, troca_quilometragem]
        );
      }

      // Lançamentos internos pela conta Caixa: registram a troca sem afetar o saldo bancário real
      await client.query(
        `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
         VALUES ($1, $2, 'Débito', $3, $4, $5, $6, $7)`,
        [dataMov, caixaId, `Entrada por Troca - Veículo recebido (${troca_placa})`, -Math.abs(troca_valor), veiculoTroca.id, cliente_id, centro_custo_id]
      );
      await client.query(
        `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
         VALUES ($1, $2, 'Crédito', $3, $4, $5, $6, $7)`,
        [dataMov, caixaId, `Baixa por Troca - Veículo vendido (${vehicle.placa})`, Math.abs(troca_valor), vehicle.id, cliente_id, centro_custo_id]
      );

      // Diferença de valor vira Conta a Pagar/Receber em aberto (só movimenta banco/caixa quando for dada baixa)
      const diferenca = Math.round((Number(valor_venda) - Number(troca_valor)) * 100) / 100;
      if (Math.abs(diferenca) > 0.01) {
        const tipoConta = diferenca > 0 ? 'Receber' : 'Pagar';
        const descricao = diferenca > 0
          ? `Diferença a receber - Venda com Troca - Veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa})`
          : `Diferença a pagar - Venda com Troca - Veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa})`;

        await client.query(
          `INSERT INTO contas (tipo, descricao, valor, data_emissao, pessoa_id, veiculo_id, centro_custo_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pendente')`,
          [tipoConta, descricao, Math.abs(diferenca), dataMov, cliente_id, vehicle.id, centro_custo_id]
        );
      }
    }

    // Comissão do vendedor: lançada na hora, sempre que houver um banco (o escolhido pelo usuário,
    // ou o Caixa como fallback quando a troca não envolveu nenhuma conta bancária real)
    if (comissaoValor && comissaoValor > 0) {
      const comissaoBancoId = banco_id || (forma_venda === 'Troca' ? await getCaixaBancoId() : null);
      if (comissaoBancoId) {
        const comissaoCentroId = await getComissaoCentroId();
        await client.query(
          `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [dataMov, comissaoBancoId, 'Débito', `Comissão - Venda Veículo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa})`, -Math.abs(comissaoValor), vehicle.id, vendedor_id, comissaoCentroId]
        );
      }
    }

    await client.query('COMMIT');
    processarSaidaEstoqueRenave(vehicle.id).catch(() => {});
    res.json(vehicle);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao vender veículo:', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

// POST - Reenvia manualmente a solicitação ao RENAVE (retry após erro/pendência, ou primeiro
// envio caso a integração tenha sido configurada depois da compra/venda já ter sido registrada).
router.post('/:id/renave/reenviar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const veiculoResult = await pool.query('SELECT status FROM veiculos WHERE id = $1', [id]);
    if (veiculoResult.rows.length === 0) {
      res.status(404).json({ error: 'Veículo não encontrado' });
      return;
    }

    if (veiculoResult.rows[0].status === 'Vendido') {
      await processarSaidaEstoqueRenave(Number(id));
    } else {
      await processarEntradaEstoqueRenave(Number(id));
    }

    const atualizado = await pool.query('SELECT renave_id_estoque, renave_status FROM veiculos WHERE id = $1', [id]);
    res.json(atualizado.rows[0]);
  } catch (err) {
    console.error('Erro ao reenviar ao RENAVE:', err);
    res.status(500).json({ error: 'Erro ao reenviar ao RENAVE.' });
  }
});

export default router;
