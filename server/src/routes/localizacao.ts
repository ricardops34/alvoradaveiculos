import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

router.get('/paises', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM paises ORDER BY nome');
    res.json({ items: result.rows, hasNext: false, total: result.rows.length });
  } catch (err) {
    console.error('Erro ao listar países:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/estados', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM estados ORDER BY nome');
    res.json({ items: result.rows, hasNext: false, total: result.rows.length });
  } catch (err) {
    console.error('Erro ao listar estados:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/municipios', async (req: Request, res: Response) => {
  try {
    const { estado_id, codigo_ibge, filter, page = 1, limit = 1000000 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    if (estado_id) {
      params.push(estado_id);
      whereClause += ` AND m.estado_id = $${params.length}`;
    }
    if (codigo_ibge) {
      params.push(codigo_ibge);
      whereClause += ` AND m.codigo_ibge = $${params.length}`;
    }
    if (filter) {
      params.push(`%${filter}%`);
      whereClause += ` AND m.nome ILIKE $${params.length}`;
    }

    const totalResult = await pool.query(`SELECT COUNT(*) FROM municipios m ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(
      `SELECT m.*, e.sigla as estado_sigla FROM municipios m
       LEFT JOIN estados e ON m.estado_id = e.id
       ${whereClause}
       ORDER BY m.nome LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );
    res.json({ items: result.rows, hasNext: offset + result.rows.length < total, total });
  } catch (err) {
    console.error('Erro ao listar municípios:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/municipios/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT m.*, e.sigla as estado_sigla FROM municipios m
       LEFT JOIN estados e ON m.estado_id = e.id
       WHERE m.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Município não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar município:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Sincroniza Estados e Municípios com a API do IBGE (admin). Idempotente — pode ser
// executado de novo a qualquer momento para atualizar nomes/códigos.
router.post('/sincronizar-ibge', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const estadosResp = await fetch(`${IBGE_BASE}/estados`);
    if (!estadosResp.ok) throw new Error(`IBGE /estados retornou ${estadosResp.status}`);
    const estadosIbge = await estadosResp.json() as any[];

    let estadosSincronizados = 0;
    for (const e of estadosIbge) {
      await pool.query(
        `INSERT INTO estados (pais_id, nome, sigla, codigo_ibge) VALUES (1, $1, $2, $3)
         ON CONFLICT (codigo_ibge) DO UPDATE SET nome = $1, sigla = $2`,
        [e.nome, e.sigla, String(e.id)]
      );
      estadosSincronizados++;
    }

    const estadosRows = (await pool.query('SELECT id, sigla FROM estados')).rows;

    let municipiosSincronizados = 0;
    for (const estado of estadosRows) {
      const municipiosResp = await fetch(`${IBGE_BASE}/estados/${estado.sigla}/municipios`);
      if (!municipiosResp.ok) continue;
      const municipiosIbge = await municipiosResp.json() as any[];

      for (const m of municipiosIbge) {
        await pool.query(
          `INSERT INTO municipios (estado_id, nome, codigo_ibge) VALUES ($1, $2, $3)
           ON CONFLICT (codigo_ibge) DO UPDATE SET nome = $2, estado_id = $1`,
          [estado.id, m.nome, String(m.id)]
        );
        municipiosSincronizados++;
      }
    }

    res.json({
      message: `Sincronização concluída: ${estadosSincronizados} estados e ${municipiosSincronizados} municípios.`,
      estados: estadosSincronizados,
      municipios: municipiosSincronizados
    });
  } catch (err) {
    console.error('Erro ao sincronizar com o IBGE:', err);
    res.status(500).json({ error: 'Erro ao sincronizar com a API do IBGE. Tente novamente em alguns instantes.' });
  }
});

// Consulta de CEP com cache local: primeiro tenta o cache (tabela `ceps`), populada
// incrementalmente a cada consulta feita nas telas de Pessoas/Configurações; se não
// encontrar, consulta o ViaCEP, casa o município pelo código IBGE devolvido e grava no cache.
router.get('/cep/:cep', async (req: Request, res: Response) => {
  try {
    const cep = String(req.params.cep).replace(/\D/g, '');
    if (cep.length !== 8) {
      res.status(400).json({ error: 'CEP inválido' });
      return;
    }

    const cached = await pool.query(
      `SELECT c.cep, c.logradouro, c.bairro, c.municipio_id,
              m.nome as municipio_nome, m.codigo_ibge, e.id as estado_id, e.sigla as estado_sigla
       FROM ceps c
       LEFT JOIN municipios m ON c.municipio_id = m.id
       LEFT JOIN estados e ON m.estado_id = e.id
       WHERE c.cep = $1`,
      [cep]
    );
    if (cached.rows.length > 0) {
      res.json(cached.rows[0]);
      return;
    }

    const viaCepResp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!viaCepResp.ok) throw new Error(`ViaCEP retornou ${viaCepResp.status}`);
    const dados: any = await viaCepResp.json();
    if (dados.erro) {
      res.status(404).json({ error: 'CEP não encontrado' });
      return;
    }

    const municipioResult = await pool.query('SELECT id, estado_id FROM municipios WHERE codigo_ibge = $1', [dados.ibge]);
    const municipio = municipioResult.rows[0];
    const estadoResult = municipio
      ? await pool.query('SELECT id, sigla FROM estados WHERE id = $1', [municipio.estado_id])
      : { rows: [] as any[] };
    const estado = estadoResult.rows[0];

    await pool.query(
      `INSERT INTO ceps (cep, logradouro, bairro, municipio_id) VALUES ($1, $2, $3, $4)
       ON CONFLICT (cep) DO UPDATE SET logradouro = $2, bairro = $3, municipio_id = $4, atualizado_em = CURRENT_TIMESTAMP`,
      [cep, dados.logradouro, dados.bairro, municipio?.id || null]
    );

    res.json({
      cep,
      logradouro: dados.logradouro,
      bairro: dados.bairro,
      municipio_id: municipio?.id || null,
      municipio_nome: dados.localidade,
      codigo_ibge: dados.ibge,
      estado_id: estado?.id || null,
      estado_sigla: estado?.sigla || dados.uf
    });
  } catch (err) {
    console.error('Erro ao consultar CEP:', err);
    res.status(500).json({ error: 'Erro ao consultar o CEP.' });
  }
});

export default router;
