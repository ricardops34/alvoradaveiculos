import pool from './db';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

const SALT_ROUNDS = 10;

async function seed() {
  const client = await pool.connect();
  
  try {
    // Verificar se já foi seed
    const check = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'perfis'
      )
    `);
    
    const tablesExist = check.rows[0].exists;
    
    // Criar tabelas
    await client.query(`
      CREATE TABLE IF NOT EXISTS perfis (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        rotinas TEXT[] DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS bancos (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(10),
        nome VARCHAR(100) NOT NULL,
        agencia VARCHAR(20),
        conta VARCHAR(20),
        tipo VARCHAR(20),
        limite_credito DECIMAL(15,2) DEFAULT 0,
        saldo_inicial DECIMAL(15,2) DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS pessoas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        documento VARCHAR(20),
        tipo_pessoa VARCHAR(20),
        is_cliente INTEGER DEFAULT 0,
        is_fornecedor INTEGER DEFAULT 0,
        is_vendedor INTEGER DEFAULT 0,
        is_socio INTEGER DEFAULT 0,
        telefone VARCHAR(20),
        email VARCHAR(100),
        cidade VARCHAR(100),
        estado VARCHAR(5)
      );

      CREATE TABLE IF NOT EXISTS centros_custo (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(10),
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(20)
      );

      CREATE TABLE IF NOT EXISTS marcas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL UNIQUE,
        tipo_veiculo VARCHAR(20) DEFAULT 'Carro'
      );

      CREATE TABLE IF NOT EXISTS modelos (
        id SERIAL PRIMARY KEY,
        marca_id INTEGER REFERENCES marcas(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        tipo_veiculo VARCHAR(20) DEFAULT 'Carro',
        ano_inicial INTEGER,
        ano_final INTEGER,
        descricao_detalhada TEXT,
        UNIQUE (marca_id, nome, tipo_veiculo)
      );

      CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        tipo_veiculo VARCHAR(20) DEFAULT 'Carro',
        placa VARCHAR(10),
        marca_id INTEGER REFERENCES marcas(id) ON DELETE SET NULL,
        modelo_id INTEGER REFERENCES modelos(id) ON DELETE SET NULL,
        versao VARCHAR(50),
        ano_fabricacao INTEGER,
        ano_modelo INTEGER,
        cor VARCHAR(30),
        quilometragem INTEGER,
        valor_compra DECIMAL(15,2),
        valor_avaliacao DECIMAL(15,2),
        valor_venda DECIMAL(15,2),
        data_compra DATE,
        status VARCHAR(20) DEFAULT 'Estoque',
        forma_compra VARCHAR(20) DEFAULT 'Troca',
        banco_id INTEGER REFERENCES bancos(id) ON DELETE SET NULL,
        fornecedor_id INTEGER REFERENCES pessoas(id) ON DELETE SET NULL,
        cliente_id INTEGER REFERENCES pessoas(id) ON DELETE SET NULL,
        fotos TEXT[] DEFAULT '{}'
      );

      ALTER TABLE modelos ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(20) DEFAULT 'Carro';
      ALTER TABLE marcas ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(20) DEFAULT 'Carro';

      CREATE INDEX IF NOT EXISTS idx_marcas_tipo ON marcas(tipo_veiculo);
      CREATE INDEX IF NOT EXISTS idx_modelos_tipo ON modelos(tipo_veiculo);
      CREATE INDEX IF NOT EXISTS idx_modelos_marca ON modelos(marca_id);
      
      -- Garantir UNIQUE constraints para o seed robusto
      DO $$ 
      BEGIN 
        -- Limpeza de duplicatas em marcas
        DELETE FROM marcas WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY nome ORDER BY id) as row_num 
            FROM marcas
          ) t WHERE t.row_num > 1
        );

        -- Ajuste de constraint para marcas (Unicidade por NOME)
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marcas_nome_key') THEN
          ALTER TABLE marcas DROP CONSTRAINT IF EXISTS marcas_nome_tipo_veiculo_key;
          ALTER TABLE marcas ADD CONSTRAINT marcas_nome_key UNIQUE (nome);
        END IF;

        -- Constraint para modelos
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modelos_marca_id_nome_tipo_veiculo_key') THEN
          ALTER TABLE modelos DROP CONSTRAINT IF EXISTS modelos_marca_id_nome_key;
          ALTER TABLE modelos ADD CONSTRAINT modelos_marca_id_nome_tipo_veiculo_key UNIQUE (marca_id, nome, tipo_veiculo);
        END IF;
      END $$;
    `);

    console.log('✅ Tabelas verificadas/criadas.');

    // Verificar se já tem dados de perfis para evitar re-seed básico
    const countCheck = await client.query('SELECT COUNT(*) FROM perfis');
    const hasData = parseInt(countCheck.rows[0].count) > 0;

    if (!hasData) {
      console.log('🌱 Inserindo dados base (perfis, usuários, etc)...');
      
      // Perfis
      await client.query(`
        INSERT INTO perfis (id, nome, rotinas) VALUES
        (1, 'Administrador', '{dashboard,veiculos,bancos,pessoas,centros_custo,movimentos,extrato_bancario,extrato_veiculo,relatorio_despesas,usuarios,perfis}'),
        (2, 'Vendedor', '{dashboard,veiculos,pessoas}'),
        (3, 'Financeiro', '{dashboard,bancos,movimentos,extrato_bancario,extrato_veiculo,relatorio_despesas}')
      `);

      // Usuários
      const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
      await client.query(`
        INSERT INTO usuarios (id, nome, email, senha, perfil_id, theme) VALUES
        (1, 'Administrador', 'admin@alvorada.com', $1, 1, 'dark')
      `, [adminHash]);

      // Centros de Custo Básicos
      await client.query(`
        INSERT INTO centros_custo (id, nome, tipo) VALUES
        (1, 'Venda de Veículos', 'Receita'),
        (2, 'Manutenção de Estoque', 'Despesa')
      `);
    }

    // A importação de Marcas e Modelos agora é feita manualmente via painel administrativo (Rota: /api/config/importar-marcas-modelos)


    console.log('✅ Importação concluída com sucesso!');

    // --- MIGRAÇÃO DE VÍNCULOS EM VEÍCULOS ---
    console.log('🔄 Sincronizando vínculos de Marcas/Modelos nos Veículos...');
    
    // Atualizar marca_id baseado no nome (caso esteja nulo)
    await client.query(`
      UPDATE veiculos v
      SET marca_id = m.id
      FROM marcas m
      WHERE v.marca_id IS NULL 
      AND UPPER(TRIM(v.marca)) = m.nome;
    `);

    // Atualizar modelo_id baseado no nome e marca_id (caso esteja nulo)
    await client.query(`
      UPDATE veiculos v
      SET modelo_id = mo.id
      FROM modelos mo
      WHERE v.modelo_id IS NULL 
      AND v.marca_id = mo.marca_id
      AND UPPER(TRIM(v.modelo)) = mo.nome;
    `);

    console.log('✅ Vínculos de veículos sincronizados!');
    
    // Resetar sequences
    await client.query(`
      SELECT setval('perfis_id_seq', (SELECT COALESCE(MAX(id), 1) FROM perfis));
      SELECT setval('usuarios_id_seq', (SELECT COALESCE(MAX(id), 1) FROM usuarios));
      SELECT setval('marcas_id_seq', (SELECT COALESCE(MAX(id), 1) FROM marcas));
      SELECT setval('modelos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM modelos));
    `);

  } catch (err) {
    console.error('❌ Erro no seed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed().then(() => {
    console.log('Seed finalizado.');
    process.exit(0);
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export default seed;
