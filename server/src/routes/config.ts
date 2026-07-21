import { Router, Request, Response } from 'express';
import pool from '../db';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse';
import { authMiddleware, requireAdmin } from '../middleware/auth';
import { createPredictableUploadMiddleware, createPrivateUploadMiddleware } from '../uploads';
import { enviarEmail, testarSmtp } from '../services/email';

const router = Router();

// Nome de arquivo previsível (mesmo nome original, sanitizado): um novo upload de logo/favicon/fundo
// substitui o anterior. Gravado na pasta persistente de uploads (ver server/src/uploads.ts).
const upload = createPredictableUploadMiddleware('config');

// Certificado digital do RENAVE (.p12/.pfx): segredo, gravado fora da pasta pública de uploads
// (ver server/src/uploads.ts) — nunca acessível via HTTP.
const uploadCertificado = createPrivateUploadMiddleware('renave', 'certificado.p12');

// POST - Upload de arquivos de imagem
router.post('/upload', authMiddleware, requireAdmin, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  res.json({
    url: `/uploads/config/${req.file.filename}`,
    filename: req.file.filename
  });
});

// GET - Download de modelos CSV (público: são apenas catálogos genéricos de marca/modelo,
// e o botão de download do frontend abre a URL direto no navegador, sem enviar o token)
router.get('/modelos-csv/:tipo', (req: Request, res: Response) => {
  const { tipo } = req.params;
  const basePath = path.join(__dirname, '..', 'base', 'marcas-e-modelos');
  
  const files: any = {
    'marcas-carros': 'marcas-carros.csv',
    'modelos-carro': 'modelos-carro.csv',
    'marcas-motos': 'marcas-motos.csv',
    'modelos-moto': 'modelos-moto.csv'
  };

  const fileName = files[tipo as string];
  if (!fileName) return res.status(404).send('Modelo não encontrado');

  const filePath = path.join(basePath, fileName);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('Arquivo não encontrado no servidor');
  }
});

// POST - Upload de CSV customizado
router.post('/upload-csv', authMiddleware, requireAdmin, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  // Mover o arquivo da pasta public para a pasta base/marcas-e-modelos.
  // path.basename evita path traversal vindo do nome original do arquivo.
  const srcPath = req.file.path;
  const destPath = path.join(__dirname, '..', 'base', 'marcas-e-modelos', path.basename(req.file.originalname));

  try {
    fs.renameSync(srcPath, destPath);
    res.json({ message: 'Arquivo de modelo atualizado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao mover arquivo para pasta de base.' });
  }
});

router.post('/importar-marcas-modelos', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    // 1. Verificar se já existem dados
    const checkCount = await client.query('SELECT COUNT(*) FROM marcas');
    if (parseInt(checkCount.rows[0].count) > 0) {
      res.status(400).json({ error: 'Os dados de Marcas/Modelos já foram importados anteriormente.' });
      return;
    }

    console.log('🚀 Iniciando importação manual de Marcas e Modelos...');
    
    const categories = [
      { type: 'Carro', marcas: 'marcas-carros.csv', modelos: 'modelos-carro.csv' },
      { type: 'Moto', marcas: 'marcas-motos.csv', modelos: 'modelos-moto.csv' },
      { type: 'Caminhão', marcas: 'marcas-caminhao.csv', modelos: 'modelos-caminhao.csv' },
      { type: 'Náutica', marcas: 'marcas-nautica.csv', modelos: 'modelos-nautica.csv' }
    ];

    const basePath = path.join(__dirname, '..', 'base', 'marcas-e-modelos');
    const globalMarcasMap = new Map<string, number>();

    await client.query('BEGIN');

    for (const cat of categories) {
      const marcasFile = path.join(basePath, cat.marcas);
      const modelosFile = path.join(basePath, cat.modelos);

      if (!fs.existsSync(marcasFile)) continue;

      // Importar Marcas
      const marcasContent = fs.readFileSync(marcasFile, 'utf-8');
      const marcasRecords: any[] = await new Promise((resolve) => {
        parse(marcasContent, { columns: true, skip_empty_lines: true }, (err: Error | undefined, records: any[]) => resolve(records));
      });

      for (const record of marcasRecords) {
        const nome = record.Marca || record.marca || record.nome;
        if (!nome) continue;
        
        const resMarca = await client.query(
          'INSERT INTO marcas (nome, tipo_veiculo) VALUES ($1, $2) ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id',
          [nome.trim().toUpperCase(), cat.type]
        );
        globalMarcasMap.set(`${cat.type}_${nome.trim().toUpperCase()}`, resMarca.rows[0].id);
      }

      // Importar Modelos
      if (!fs.existsSync(modelosFile)) continue;
      const modelosContent = fs.readFileSync(modelosFile, 'utf-8');
      const modelosRecords: any[] = await new Promise((resolve) => {
        parse(modelosContent, { columns: true, skip_empty_lines: true }, (err: Error | undefined, records: any[]) => resolve(records));
      });

      for (const record of modelosRecords) {
        const marcaNome = record.Marca || record.marca;
        const nome = record.Modelo || record.modelo || record.nome;
        if (!marcaNome || !nome) continue;

        const dbMarcaId = globalMarcasMap.get(`${cat.type}_${marcaNome.trim().toUpperCase()}`);
        if (dbMarcaId) {
          await client.query(
            `INSERT INTO modelos (marca_id, nome, tipo_veiculo) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (marca_id, nome, tipo_veiculo) DO NOTHING`,
            [dbMarcaId, nome.trim().toUpperCase(), cat.type]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Importação concluída com sucesso!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro na importação manual:', err);
    res.status(500).json({ error: 'Erro durante a importação.' });
  } finally {
    client.release();
  }
});

// GET - Buscar parâmetros públicos (usado pela tela de login, sem autenticação — por isso só
// expõe o estritamente necessário para montar a tela: nunca dados da empresa/RENAVE ou segredos).
router.get('/parametros', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT empresa_nome, favicon_url, logo_url, background_url FROM parametros WHERE id = 1'
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar parâmetros:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET - Parâmetros completos (tela de Configurações, admin). Segredos (senha do certificado)
// nunca são devolvidos — só um indicador booleano de que já foram configurados.
router.get('/parametros/completo', authMiddleware, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, empresa_nome, favicon_url, logo_url, background_url,
             cnpj, cep, logradouro, numero, complemento, bairro, pais_id, estado_id, municipio_id,
             renave_responsavel_nome, renave_responsavel_cpf, renave_certificado_nome_arquivo,
             (renave_certificado_senha IS NOT NULL AND renave_certificado_senha <> '') as renave_certificado_senha_definida,
             smtp_host, smtp_port, smtp_user, smtp_from,
             (smtp_pass IS NOT NULL AND smtp_pass <> '') as smtp_pass_definida
      FROM parametros WHERE id = 1
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar parâmetros completos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT - Atualizar parâmetros
router.put('/parametros', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      empresa_nome, favicon_url, logo_url, background_url,
      cnpj, cep, logradouro, numero, complemento, bairro, pais_id, estado_id, municipio_id,
      renave_responsavel_nome, renave_responsavel_cpf, renave_certificado_senha,
      smtp_host, smtp_port, smtp_user, smtp_from, smtp_pass
    } = req.body;
    const result = await pool.query(
      `UPDATE parametros
       SET empresa_nome = $1, favicon_url = $2, logo_url = $3, background_url = $4,
           cnpj = $5, cep = $6, logradouro = $7, numero = $8, complemento = $9, bairro = $10, pais_id = $11, estado_id = $12, municipio_id = $13,
           renave_responsavel_nome = $14, renave_responsavel_cpf = $15,
           renave_certificado_senha = COALESCE(NULLIF($16, ''), renave_certificado_senha),
           smtp_host = $17, smtp_port = $18, smtp_user = $19, smtp_from = $20,
           smtp_pass = COALESCE(NULLIF($21, ''), smtp_pass),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1
       RETURNING id, empresa_nome, favicon_url, logo_url, background_url, cnpj, cep, logradouro, numero, complemento, bairro, pais_id, estado_id, municipio_id, renave_responsavel_nome, renave_responsavel_cpf, renave_certificado_nome_arquivo, smtp_host, smtp_port, smtp_user, smtp_from`,
      [empresa_nome, favicon_url, logo_url, background_url,
       cnpj || null, cep || null, logradouro || null, numero || null, complemento || null, bairro || null, pais_id || null, estado_id || null, municipio_id || null,
       renave_responsavel_nome || null, renave_responsavel_cpf || null, renave_certificado_senha || '',
       smtp_host || null, smtp_port || null, smtp_user || null, smtp_from || null, smtp_pass || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar parâmetros:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST - Upload do certificado digital do RENAVE (.p12/.pfx). Gravado em armazenamento privado
// (nunca servido via HTTP) — só o nome original fica registrado, para exibição na tela.
router.post('/parametros/renave-certificado', authMiddleware, requireAdmin, uploadCertificado.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    return;
  }
  try {
    await pool.query(
      'UPDATE parametros SET renave_certificado_nome_arquivo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [req.file.originalname]
    );
    res.json({ nome_arquivo: req.file.originalname });
  } catch (err) {
    console.error('Erro ao registrar certificado RENAVE:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST - Envia um e-mail de teste para validar as credenciais de SMTP configuradas (admin,
// tela de Configurações > E-mail).
router.post('/testar-email', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { destinatario } = req.body;
    if (!destinatario) {
      res.status(400).json({ error: 'Informe um e-mail de destino para o teste.' });
      return;
    }
    await testarSmtp(destinatario);
    res.json({ message: `E-mail de teste enviado para ${destinatario}!` });
  } catch (err: any) {
    console.error('Erro ao testar SMTP:', err);
    res.status(500).json({ error: err?.message || 'Erro ao enviar e-mail de teste. Verifique as credenciais SMTP.' });
  }
});

// POST - Envia um documento (Proposta Comercial, Recibo de Compra/Venda) por e-mail, reaproveitando
// o PDF já gerado no navegador (jsPDF) como anexo. Usa o SMTP configurado pelo Administrador;
// qualquer usuário autenticado pode enviar (é uma ação de venda do dia a dia, não administrativa).
router.post('/enviar-email', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { destinatario, assunto, corpo, anexo_base64, anexo_nome } = req.body;
    if (!destinatario || !assunto || !anexo_base64) {
      res.status(400).json({ error: 'Destinatário, assunto e anexo são obrigatórios.' });
      return;
    }
    await enviarEmail({
      destinatario,
      assunto,
      corpo: corpo || '',
      anexo: { filename: anexo_nome || 'documento.pdf', contentBase64: anexo_base64 }
    });
    res.json({ message: `E-mail enviado para ${destinatario}!` });
  } catch (err: any) {
    console.error('Erro ao enviar e-mail:', err);
    res.status(500).json({ error: err?.message || 'Erro ao enviar e-mail.' });
  }
});

export default router;
