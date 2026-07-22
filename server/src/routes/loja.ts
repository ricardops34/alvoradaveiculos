import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../db';
import { signClienteToken, clienteAuthMiddleware, ClienteAuthRequest } from '../middleware/auth-cliente';
import { grokEstaConfigurado, perguntarAoAssistente } from '../services/grok';

const router = Router();
const SALT_ROUNDS = 10;

// Loja pública (vitrine de veículos): sem autenticação, por isso só expõe campos seguros —
// nunca valor_compra (custo de aquisição), placa, chassi/renavam, dados de fornecedor/cliente/
// comissão ou qualquer coisa do RENAVE. Só aparece aqui o veículo com status Estoque/Preparação
// E marcado como `publicado` (opt-in explícito no cadastro de Veículos).
const CAMPOS_PUBLICOS = `
  v.id, v.tipo_veiculo, v.versao, v.ano_fabricacao, v.ano_modelo, v.cor, v.quilometragem,
  v.valor_avaliacao, v.valor_fipe, v.fotos, v.opcionais, v.observacoes, v.status,
  ma.nome as marca_nome, mo.nome as modelo_nome
`;

router.get('/veiculos', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 12, tipo_veiculo, marca_id, modelo_id, filter } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = `WHERE v.publicado = true AND v.status IN ('Estoque', 'Preparação')`;
    const params: any[] = [];

    if (tipo_veiculo) {
      params.push(tipo_veiculo);
      whereClause += ` AND v.tipo_veiculo = $${params.length}`;
    }
    if (marca_id) {
      params.push(marca_id);
      whereClause += ` AND v.marca_id = $${params.length}`;
    }
    if (modelo_id) {
      params.push(modelo_id);
      whereClause += ` AND v.modelo_id = $${params.length}`;
    }
    if (filter) {
      params.push(`%${filter}%`);
      whereClause += ` AND (ma.nome ILIKE $${params.length} OR mo.nome ILIKE $${params.length} OR v.versao ILIKE $${params.length})`;
    }

    const queryBase = `
      FROM veiculos v
      LEFT JOIN marcas ma ON v.marca_id = ma.id
      LEFT JOIN modelos mo ON v.modelo_id = mo.id
      ${whereClause}
    `;

    const totalResult = await pool.query(`SELECT COUNT(*) ${queryBase}`, params);
    const total = parseInt(totalResult.rows[0].count);

    const result = await pool.query(
      `SELECT ${CAMPOS_PUBLICOS} ${queryBase} ORDER BY v.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );

    res.json({
      items: result.rows,
      hasNext: offset + result.rows.length < total,
      total
    });
  } catch (err) {
    console.error('Erro ao listar veículos da loja:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Tabela de valores: maior/médio/menor preço anunciado no momento — referência rápida pro
// visitante, calculada só em cima do que está publicado.
router.get('/veiculos/estatisticas', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT MAX(COALESCE(valor_avaliacao, valor_fipe)) as maior,
             AVG(COALESCE(valor_avaliacao, valor_fipe)) as media,
             MIN(COALESCE(valor_avaliacao, valor_fipe)) as menor,
             COUNT(*) as total
      FROM veiculos
      WHERE publicado = true AND status IN ('Estoque', 'Preparação')
        AND COALESCE(valor_avaliacao, valor_fipe) IS NOT NULL
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao calcular estatísticas da loja:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/veiculos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ${CAMPOS_PUBLICOS},
              f.motor, f.potencia, f.torque, f.cambio, f.tracao, f.consumo_cidade, f.consumo_estrada, f.porta_malas, f.tanque
       FROM veiculos v
       LEFT JOIN marcas ma ON v.marca_id = ma.id
       LEFT JOIN modelos mo ON v.modelo_id = mo.id
       LEFT JOIN fichas_tecnicas f ON f.modelo_id = v.modelo_id
       WHERE v.id = $1 AND v.publicado = true AND v.status IN ('Estoque', 'Preparação')`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Veículo não encontrado ou não disponível.' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar veículo da loja:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Marcas usadas por pelo menos um veículo publicado — alimenta o filtro da loja (só mostra
// marcas que realmente têm algo à venda no momento, evitando opções vazias no combo).
router.get('/marcas', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ma.id, ma.nome, ma.tipo_veiculo
      FROM marcas ma
      JOIN veiculos v ON v.marca_id = ma.id
      WHERE v.publicado = true AND v.status IN ('Estoque', 'Preparação')
      ORDER BY ma.nome
    `);
    res.json({ items: result.rows });
  } catch (err) {
    console.error('Erro ao listar marcas da loja:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/modelos', async (req: Request, res: Response) => {
  try {
    const { marca_id } = req.query;
    const result = await pool.query(
      `SELECT DISTINCT mo.id, mo.nome
       FROM modelos mo
       JOIN veiculos v ON v.modelo_id = mo.id
       WHERE v.publicado = true AND v.status IN ('Estoque', 'Preparação') AND mo.marca_id = $1
       ORDER BY mo.nome`,
      [marca_id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error('Erro ao listar modelos da loja:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Publicidade e notícias exibidas na vitrine — cadastradas em Configurações > Publicidade/Notícias
router.get('/anuncios', async (req: Request, res: Response) => {
  try {
    const { posicao } = req.query;
    const params: any[] = [];
    let whereClause = 'WHERE ativo = true';
    if (posicao) {
      params.push(posicao);
      whereClause += ` AND posicao = $${params.length}`;
    }
    const result = await pool.query(`SELECT * FROM publicidade ${whereClause} ORDER BY ordem, id DESC`, params);
    res.json({ items: result.rows });
  } catch (err) {
    console.error('Erro ao listar anúncios da loja:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/noticias', async (req: Request, res: Response) => {
  try {
    const { limit = 6 } = req.query;
    const result = await pool.query(
      `SELECT * FROM noticias WHERE ativo = true ORDER BY publicado_em DESC, id DESC LIMIT $1`,
      [Number(limit)]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error('Erro ao listar notícias da loja:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// --- Clientes (cadastro básico para favoritar veículos) ---

router.post('/clientes/registrar', async (req: Request, res: Response) => {
  try {
    const { nome, cpf, data_nascimento, email, senha, telefone, telefone_secundario, estado_id, municipio_id } = req.body;
    if (!nome || !cpf || !email || !senha) {
      res.status(400).json({ error: 'Nome, CPF, e-mail e senha são obrigatórios.' });
      return;
    }

    const existente = await pool.query('SELECT id FROM clientes WHERE cpf = $1', [cpf]);
    if (existente.rows.length > 0) {
      res.status(409).json({ error: 'Já existe um cadastro com este CPF.' });
      return;
    }

    const hash = await bcrypt.hash(senha, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO clientes (nome, cpf, data_nascimento, email, senha, telefone, telefone_secundario, estado_id, municipio_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, nome, cpf, email`,
      [nome, cpf, data_nascimento || null, email, hash, telefone || null, telefone_secundario || null, estado_id || null, municipio_id || null]
    );
    const cliente = result.rows[0];
    const token = signClienteToken({ id: cliente.id, nome: cliente.nome, tipo: 'cliente' });
    res.status(201).json({ ...cliente, token });
  } catch (err) {
    console.error('Erro ao registrar cliente:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/clientes/login', async (req: Request, res: Response) => {
  try {
    const { cpf, senha } = req.body;
    if (!cpf || !senha) {
      res.status(400).json({ error: 'CPF e senha são obrigatórios.' });
      return;
    }

    const result = await pool.query('SELECT id, nome, cpf, email, senha FROM clientes WHERE cpf = $1', [cpf]);
    const cliente = result.rows[0];
    if (!cliente || !(await bcrypt.compare(senha, cliente.senha))) {
      res.status(401).json({ error: 'CPF ou senha inválidos.' });
      return;
    }

    const token = signClienteToken({ id: cliente.id, nome: cliente.nome, tipo: 'cliente' });
    res.json({ id: cliente.id, nome: cliente.nome, cpf: cliente.cpf, email: cliente.email, token });
  } catch (err) {
    console.error('Erro ao autenticar cliente:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.get('/clientes/me', clienteAuthMiddleware, async (req: ClienteAuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT id, nome, cpf, email, telefone FROM clientes WHERE id = $1', [req.cliente!.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar cliente:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// --- Favoritos ---

router.get('/favoritos', clienteAuthMiddleware, async (req: ClienteAuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT ${CAMPOS_PUBLICOS}, fav.id as favorito_id
       FROM favoritos fav
       JOIN veiculos v ON v.id = fav.veiculo_id
       LEFT JOIN marcas ma ON v.marca_id = ma.id
       LEFT JOIN modelos mo ON v.modelo_id = mo.id
       WHERE fav.cliente_id = $1
       ORDER BY fav.criado_em DESC`,
      [req.cliente!.id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error('Erro ao listar favoritos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/favoritos/:veiculoId', clienteAuthMiddleware, async (req: ClienteAuthRequest, res: Response) => {
  try {
    await pool.query(
      `INSERT INTO favoritos (cliente_id, veiculo_id) VALUES ($1, $2) ON CONFLICT (cliente_id, veiculo_id) DO NOTHING`,
      [req.cliente!.id, req.params.veiculoId]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Erro ao favoritar veículo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.delete('/favoritos/:veiculoId', clienteAuthMiddleware, async (req: ClienteAuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM favoritos WHERE cliente_id = $1 AND veiculo_id = $2', [req.cliente!.id, req.params.veiculoId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao remover favorito:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// --- Assistente de IA (Grok) ---

router.get('/assistente/status', async (_req: Request, res: Response) => {
  res.json({ ativo: await grokEstaConfigurado() });
});

router.post('/assistente', async (req: Request, res: Response) => {
  try {
    const { pergunta, historico } = req.body;
    if (!pergunta) {
      res.status(400).json({ error: 'Informe uma pergunta.' });
      return;
    }
    const resposta = await perguntarAoAssistente(pergunta, Array.isArray(historico) ? historico : []);
    res.json({ resposta });
  } catch (err: any) {
    console.error('Erro no assistente de IA:', err);
    res.status(500).json({ error: err?.message || 'Erro ao consultar o assistente.' });
  }
});

export default router;
