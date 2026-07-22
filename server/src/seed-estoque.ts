import fs from 'fs';
import path from 'path';
import pool from './db';
import { PoolClient } from 'pg';
import { ensureUploadsDir } from './uploads';

// Importa o estoque real da loja (extraído do site antigo, ver server/src/base/estoque/alvorada.json)
// pra usarmos como base de demonstração na VPS: substitui os veículos fictícios do seed-teste
// por veículos reais, com marca/modelo, opcionais e fotos. As fotos são copiadas de
// server/src/base/estoque/imagens (arquivos locais, nomeados "<id-de-origem>_NN.jpg") para o
// storage próprio de uploads — não usamos mais os links do CDN do site antigo.

interface VeiculoOrigem {
  id: string;
  url: string;
  marca: string;
  categoria: string;
  modelo: string;
  ano_fabricacao?: number;
  ano_modelo?: number;
  cor?: string;
  combustivel?: string;
  cambio?: string;
  km?: number;
  preco?: number;
  opcionais?: string[];
  mais_opcionais?: string;
  descricao?: string;
  observacoes?: string;
  fotos?: string[];
}

// Emails fictícios inseridos pelo seed-teste (ver seed-teste.ts) — usados aqui só pra identificar
// e remover esses dados de demonstração antigos, sem mexer em pessoas reais.
const MARCADOR_EMAIL_SEED_TESTE = 'joao.fornecedor@seedteste.alvorada.com';

async function upsertMarca(client: PoolClient, nome: string, tipo: string): Promise<number> {
  const r = await client.query(
    `INSERT INTO marcas (nome, tipo_veiculo) VALUES ($1,$2)
     ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
    [nome, tipo]
  );
  return r.rows[0].id;
}

async function upsertModelo(client: PoolClient, marcaId: number, nome: string, tipo: string): Promise<number> {
  const r = await client.query(
    `INSERT INTO modelos (marca_id, nome, tipo_veiculo) VALUES ($1,$2,$3)
     ON CONFLICT (marca_id, nome, tipo_veiculo) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
    [marcaId, nome, tipo]
  );
  return r.rows[0].id;
}

async function upsertOpcional(client: PoolClient, nome: string): Promise<void> {
  await client.query(`INSERT INTO opcionais (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING`, [nome]);
}

// A fonte usa marcas compostas ("VW - VOLKSWAGEN", "GM - CHEVROLET") — normaliza pro mesmo
// formato do catálogo de marcas/modelos já usado no cadastro manual (ver base/marcas-e-modelos/*.csv).
function normalizarMarca(nome: string): string {
  const partes = nome.split(' - ');
  return (partes.length > 1 ? partes[1] : partes[0]).trim().toUpperCase();
}

// Copia as fotos locais do veículo (server/src/base/estoque/imagens/<id>_NN.jpg) para o storage
// de uploads da aplicação e devolve as URLs públicas (/uploads/veiculos/...) — mesmo local onde
// vão as fotos enviadas manualmente pelo cadastro de Veículos.
function copiarFotosLocais(origemId: string): string[] {
  const dirOrigem = path.join(__dirname, 'base', 'estoque', 'imagens');
  const dirDestino = ensureUploadsDir('veiculos');

  if (!fs.existsSync(dirOrigem)) return [];

  const arquivos = fs.readdirSync(dirOrigem)
    .filter(nome => nome.startsWith(`${origemId}_`))
    .sort();

  const urls: string[] = [];
  for (const nome of arquivos) {
    const nomeDestino = `estoque-${nome}`;
    fs.copyFileSync(path.join(dirOrigem, nome), path.join(dirDestino, nomeDestino));
    urls.push(`/uploads/veiculos/${nomeDestino}`);
  }
  return urls;
}

function montarObservacoes(v: VeiculoOrigem): string | null {
  const partes: string[] = [];

  const caracteristicas = [
    v.combustivel ? `Combustível: ${v.combustivel}` : null,
    v.cambio ? `Câmbio: ${v.cambio}` : null
  ].filter(Boolean);
  if (caracteristicas.length > 0) partes.push(caracteristicas.join(' · '));

  if (v.descricao) partes.push(v.descricao.trim());
  if (v.mais_opcionais) partes.push(v.mais_opcionais.trim());
  if (v.observacoes) partes.push(v.observacoes.trim());

  return partes.length > 0 ? partes.join('\n\n') : null;
}

// Remove os dados fictícios do seed-teste. Como a tabela de veículos é sempre totalmente
// substituída pelo estoque real a cada execução, isso também limpa movimentos/contas ligados a
// QUALQUER veículo (não só os de teste) — não rode isto num banco com vendas/lançamentos reais
// que precisem ser preservados.

async function limparSeedTeste(client: PoolClient): Promise<void> {
  console.log('🧹 Limpando dados de demonstração anteriores (seed-teste)...');

  const pessoasTeste = await client.query(
    `SELECT id FROM pessoas WHERE email = $1 OR email LIKE '%teste.com'`,
    [MARCADOR_EMAIL_SEED_TESTE]
  );
  const pessoaIds = pessoasTeste.rows.map(r => r.id);

  // Movimentos/contas ligados aos veículos de teste (via veiculo_id) ou diretamente às
  // pessoas fictícias (ex: a "Diferença a receber" do seed-teste não tem veiculo_id).
  await client.query(`DELETE FROM movimentos WHERE veiculo_id IS NOT NULL OR pessoa_id = ANY($1::int[])`, [pessoaIds]);
  await client.query(`DELETE FROM contas WHERE veiculo_id IS NOT NULL OR pessoa_id = ANY($1::int[])`, [pessoaIds]);
  // veiculo_km_historico e cautelares têm ON DELETE CASCADE a partir de veiculos
  const veiculosRemovidos = await client.query(`DELETE FROM veiculos RETURNING id`);
  console.log(`   ${veiculosRemovidos.rowCount} veículo(s) removido(s).`);

  await client.query(
    `DELETE FROM usuarios WHERE email IN ('vendedor@teste.alvorada.com', 'financeiro@teste.alvorada.com')`
  );
  const pessoasRemovidas = await client.query(`DELETE FROM pessoas WHERE id = ANY($1::int[]) RETURNING id`, [pessoaIds]);
  console.log(`   ${pessoasRemovidas.rowCount} pessoa(s) fictícia(s) removida(s).`);

  await client.query(`DELETE FROM bancos WHERE nome IN ('Banco do Brasil', 'Bradesco') AND codigo IN ('001', '237')`);
  await client.query(`DELETE FROM centros_custo WHERE codigo IN ('CPV', 'ADM', 'DOC')`);
}

async function seedEstoque() {
  const client = await pool.connect();
  try {
    const arquivoPath = path.join(__dirname, 'base', 'estoque', 'alvorada.json');
    const json = JSON.parse(fs.readFileSync(arquivoPath, 'utf-8'));
    const veiculos: VeiculoOrigem[] = json.veiculos || [];

    if (veiculos.length === 0) {
      console.log('⚠️  Nenhum veículo encontrado no arquivo de origem.');
      return;
    }

    await client.query('BEGIN');

    await limparSeedTeste(client);

    console.log(`🌱 Importando ${veiculos.length} veículos reais...`);
    for (const v of veiculos) {
      const marcaNome = normalizarMarca(v.marca);
      const modeloNome = (v.modelo || '').trim();
      if (!modeloNome) continue;

      const marcaId = await upsertMarca(client, marcaNome, 'Carro');
      const modeloId = await upsertModelo(client, marcaId, modeloNome, 'Carro');

      for (const opcional of v.opcionais || []) {
        await upsertOpcional(client, opcional);
      }

      const fotos = copiarFotosLocais(v.id);

      const vehicle = await client.query(
        `INSERT INTO veiculos
          (tipo_veiculo, marca, modelo, marca_id, modelo_id, ano_fabricacao, ano_modelo, cor,
           quilometragem, valor_avaliacao, status, fotos, opcionais, observacoes, publicado)
         VALUES ('Carro', $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Estoque', $10, $11, $12, true)
         RETURNING id`,
        [
          marcaNome, modeloNome, marcaId, modeloId,
          v.ano_fabricacao || null, v.ano_modelo || null, v.cor || null,
          v.km ?? null, v.preco ?? null,
          fotos, v.opcionais || [], montarObservacoes(v)
        ]
      );

      if (v.km !== undefined && v.km !== null) {
        await client.query(
          `INSERT INTO veiculo_km_historico (veiculo_id, data, quilometragem, origem) VALUES ($1, CURRENT_DATE, $2, 'Cadastro')`,
          [vehicle.rows[0].id, v.km]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✅ Estoque real importado com sucesso!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao importar estoque real:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedEstoque().then(() => {
    console.log('Seed de estoque finalizado.');
    process.exit(0);
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export default seedEstoque;
