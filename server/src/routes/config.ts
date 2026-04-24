import { Router, Request, Response } from 'express';
import pool from '../db';
import path from 'path';
import fs from 'fs';
import { parse } from 'csv-parse';
import multer from 'multer';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', '..', '..', 'public'));
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// POST - Upload de arquivos de imagem
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  res.json({ 
    url: `/${req.file.filename}`,
    filename: req.file.filename 
  });
});

// GET - Download de modelos CSV
router.get('/modelos-csv/:tipo', (req: Request, res: Response) => {
  const { tipo } = req.params;
  const basePath = path.join(__dirname, '..', '..', '..', 'base', 'marcas-e-modelos');
  
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
router.post('/upload-csv', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  
  // Mover o arquivo da pasta public para a pasta base/marcas-e-modelos
  const srcPath = req.file.path;
  const destPath = path.join(__dirname, '..', '..', '..', 'base', 'marcas-e-modelos', req.file.originalname);
  
  try {
    fs.renameSync(srcPath, destPath);
    res.json({ message: 'Arquivo de modelo atualizado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao mover arquivo para pasta de base.' });
  }
});

router.post('/importar-marcas-modelos', async (req: Request, res: Response) => {
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

// GET - Buscar parâmetros atuais
router.get('/parametros', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM parametros WHERE id = 1');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar parâmetros:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT - Atualizar parâmetros
router.put('/parametros', async (req: Request, res: Response) => {
  try {
    const { empresa_nome, favicon_url, logo_url, background_url } = req.body;
    const result = await pool.query(
      `UPDATE parametros 
       SET empresa_nome = $1, favicon_url = $2, logo_url = $3, background_url = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1 
       RETURNING *`,
      [empresa_nome, favicon_url, logo_url, background_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar parâmetros:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
