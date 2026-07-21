import { Router, Request, Response } from 'express';
import pool from '../db';

const router = Router();

// Ordem respeita as dependências de chave estrangeira entre as tabelas
const TABLES: { name: string; columns: string[] }[] = [
  { name: 'perfis', columns: ['id', 'nome', 'rotinas'] },
  { name: 'bancos', columns: ['id', 'codigo', 'nome', 'agencia', 'conta', 'tipo', 'limite_credito', 'saldo_inicial'] },
  { name: 'pessoas', columns: ['id', 'nome', 'documento', 'tipo_pessoa', 'is_cliente', 'is_fornecedor', 'is_vendedor', 'is_socio', 'telefone', 'email', 'cidade', 'estado', 'lead_status', 'comissao_percentual'] },
  { name: 'centros_custo', columns: ['id', 'codigo', 'nome', 'tipo'] },
  { name: 'marcas', columns: ['id', 'nome', 'tipo_veiculo'] },
  { name: 'modelos', columns: ['id', 'marca_id', 'nome', 'tipo_veiculo', 'ano_inicial', 'ano_final', 'descricao_detalhada'] },
  { name: 'usuarios', columns: ['id', 'nome', 'email', 'senha', 'perfil_id', 'theme'] },
  { name: 'veiculos', columns: ['id', 'tipo_veiculo', 'placa', 'marca', 'modelo', 'marca_id', 'modelo_id', 'versao', 'ano_fabricacao', 'ano_modelo', 'cor', 'quilometragem', 'valor_compra', 'valor_avaliacao', 'valor_venda', 'data_compra', 'data_venda', 'status', 'forma_compra', 'banco_id', 'fornecedor_id', 'cliente_id', 'fotos', 'vendedor_id', 'comissao_valor'] },
  { name: 'movimentos', columns: ['id', 'data', 'banco_id', 'tipo', 'historico', 'valor', 'centro_custo_id', 'veiculo_id', 'pessoa_id'] },
  { name: 'contas', columns: ['id', 'tipo', 'descricao', 'valor', 'data_emissao', 'data_vencimento', 'status', 'pessoa_id', 'veiculo_id', 'centro_custo_id', 'banco_id', 'data_pagamento', 'movimento_id'] },
  { name: 'parametros', columns: ['id', 'empresa_nome', 'favicon_url', 'logo_url', 'background_url'] }
];

// GET - Exporta todas as tabelas em um único JSON para download
router.get('/export', async (_req: Request, res: Response) => {
  try {
    const data: Record<string, any[]> = {};
    for (const table of TABLES) {
      const result = await pool.query(`SELECT * FROM ${table.name} ORDER BY id`);
      data[table.name] = result.rows;
    }

    res.setHeader('Content-Disposition', `attachment; filename="alvorada_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json({
      version: 1,
      exported_at: new Date().toISOString(),
      data
    });
  } catch (err) {
    console.error('Erro ao exportar backup:', err);
    res.status(500).json({ error: 'Erro interno ao exportar backup' });
  }
});

// POST - Importa um backup previamente exportado. Faz UPSERT por id (não apaga registros existentes),
// então é seguro rodar mais de uma vez — nunca perde dados que já estão no banco.
router.post('/import', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'Arquivo de backup inválido.' });
      return;
    }

    await client.query('BEGIN');

    const resumo: Record<string, number> = {};

    for (const table of TABLES) {
      const rows: any[] = Array.isArray(data[table.name]) ? data[table.name] : [];
      resumo[table.name] = 0;

      for (const row of rows) {
        if (row.id == null) continue;

        const cols = table.columns;
        const values = cols.map(c => row[c] === undefined ? null : row[c]);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const updates = cols.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ');

        await client.query(
          `INSERT INTO ${table.name} (${cols.join(', ')}) VALUES (${placeholders})
           ON CONFLICT (id) DO UPDATE SET ${updates}`,
          values
        );
        resumo[table.name]++;
      }

      if (rows.length > 0) {
        await client.query(`SELECT setval('${table.name}_id_seq', (SELECT COALESCE(MAX(id), 1) FROM ${table.name}))`);
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Backup importado com sucesso!', resumo });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao importar backup:', err);
    res.status(500).json({ error: 'Erro ao importar backup. Nenhuma alteração foi salva.' });
  } finally {
    client.release();
  }
});

export default router;
