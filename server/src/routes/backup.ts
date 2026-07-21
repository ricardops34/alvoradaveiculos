import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../db';
import { ensureBackupsDir } from '../uploads';

const router = Router();

// Ordem respeita as dependências de chave estrangeira entre as tabelas. As colunas de cada
// tabela são descobertas em tempo de execução via information_schema (em vez de uma lista
// fixa no código) — isso evita que o backup fique defasado sempre que uma coluna nova é
// adicionada ao schema (já aconteceu: esta lista de tabelas ficou tempo sem `cautelares`,
// `veiculo_km_historico` e sem os campos do RENAVE/Localização adicionados depois dela).
const TABLES = [
  'perfis', 'usuarios', 'paises', 'estados', 'municipios', 'bancos', 'pessoas',
  'centros_custo', 'marcas', 'modelos', 'opcionais', 'veiculos', 'veiculo_km_historico',
  'cautelares', 'movimentos', 'contas', 'ceps', 'parametros'
];

async function getColumns(table: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
    [table]
  );
  return result.rows.map(r => r.column_name);
}

// Usado tanto pela rota GET /export (download manual) quanto pelo backup automático agendado
// (server/src/backup-scheduler.ts) — mesmo formato de arquivo nos dois casos.
export async function buildBackupSnapshot() {
  const data: Record<string, any[]> = {};
  for (const table of TABLES) {
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY 1`);
    data[table] = result.rows;
  }
  return {
    version: 2,
    exported_at: new Date().toISOString(),
    data
  };
}

// Faz UPSERT pela chave primária (não apaga registros existentes) — seguro rodar mais de uma
// vez, nunca perde dados que já estão no banco. Aceita tanto backups no formato antigo (que
// tinham menos tabelas/colunas) quanto o atual: colunas que não existem mais na tabela de
// destino são ignoradas. Compartilhado entre POST /import (upload manual) e a restauração de
// um backup automático a partir do disco.
export async function restoreSnapshot(snapshot: any): Promise<Record<string, number>> {
  const data = snapshot?.data;
  if (!data || typeof data !== 'object') {
    throw new Error('Arquivo de backup inválido.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resumo: Record<string, number> = {};

    for (const table of TABLES) {
      const rows: any[] = Array.isArray(data[table]) ? data[table] : [];
      resumo[table] = 0;
      if (rows.length === 0) continue;

      const validColumns = await getColumns(table);
      const pk = table === 'ceps' ? 'cep' : 'id';

      for (const row of rows) {
        if (row[pk] == null) continue;

        const cols = Object.keys(row).filter(c => validColumns.includes(c));
        if (!cols.includes(pk)) cols.unshift(pk);

        const values = cols.map(c => row[c] === undefined ? null : row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const updates = cols.filter(c => c !== pk).map(c => `${c} = EXCLUDED.${c}`).join(', ');

        await client.query(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
           ON CONFLICT (${pk}) DO UPDATE SET ${updates || `${pk} = EXCLUDED.${pk}`}`,
          values
        );
        resumo[table]++;
      }

      if (pk === 'id' && rows.length > 0) {
        await client.query(`SELECT setval('${table}_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ${table}))`);
      }
    }

    await client.query('COMMIT');
    return resumo;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// GET - Exporta todas as tabelas em um único JSON para download
router.get('/export', async (_req: Request, res: Response) => {
  try {
    const snapshot = await buildBackupSnapshot();
    res.setHeader('Content-Disposition', `attachment; filename="alvorada_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(snapshot);
  } catch (err) {
    console.error('Erro ao exportar backup:', err);
    res.status(500).json({ error: 'Erro interno ao exportar backup' });
  }
});

// POST - Importa um backup previamente exportado (upload manual pela tela de Configurações)
router.post('/import', async (req: Request, res: Response) => {
  try {
    const resumo = await restoreSnapshot(req.body);
    res.json({ message: 'Backup importado com sucesso!', resumo });
  } catch (err) {
    console.error('Erro ao importar backup:', err);
    res.status(500).json({ error: 'Erro ao importar backup. Nenhuma alteração foi salva.' });
  }
});

// GET - Lista os backups automáticos diários salvos em disco (ver backup-scheduler.ts)
router.get('/automaticos', async (_req: Request, res: Response) => {
  try {
    const dir = ensureBackupsDir();
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('auto_') && f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(dir, f));
        return { filename: f, tamanho: stat.size, criado_em: stat.mtime };
      })
      .sort((a, b) => b.criado_em.getTime() - a.criado_em.getTime());
    res.json({ items: files });
  } catch (err) {
    console.error('Erro ao listar backups automáticos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST - Restaura um backup automático diretamente do disco (sem precisar baixar/reenviar)
router.post('/automaticos/:filename/restaurar', async (req: Request, res: Response) => {
  try {
    const dir = ensureBackupsDir();
    const filename = path.basename(String(req.params.filename));
    const filePath = path.join(dir, filename);
    if (!filename.startsWith('auto_') || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Backup não encontrado.' });
      return;
    }

    const snapshot = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const resumo = await restoreSnapshot(snapshot);
    res.json({ message: `Backup "${filename}" restaurado com sucesso!`, resumo });
  } catch (err) {
    console.error('Erro ao restaurar backup automático:', err);
    res.status(500).json({ error: 'Erro ao restaurar backup. Nenhuma alteração foi salva.' });
  }
});

export default router;
