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

      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        perfil_id INTEGER REFERENCES perfis(id) ON DELETE SET NULL,
        theme VARCHAR(20) DEFAULT 'light'
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
        marca VARCHAR(100),
        modelo VARCHAR(100),
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
        data_venda DATE,
        status VARCHAR(20) DEFAULT 'Estoque',
        forma_compra VARCHAR(20) DEFAULT 'Troca',
        banco_id INTEGER REFERENCES bancos(id) ON DELETE SET NULL,
        fornecedor_id INTEGER REFERENCES pessoas(id) ON DELETE SET NULL,
        cliente_id INTEGER REFERENCES pessoas(id) ON DELETE SET NULL,
        fotos TEXT[] DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS movimentos (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        banco_id INTEGER REFERENCES bancos(id) ON DELETE SET NULL,
        tipo VARCHAR(20) NOT NULL,
        historico TEXT,
        valor DECIMAL(15,2) NOT NULL DEFAULT 0,
        centro_custo_id INTEGER REFERENCES centros_custo(id) ON DELETE SET NULL,
        veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
        pessoa_id INTEGER REFERENCES pessoas(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS parametros (
        id SERIAL PRIMARY KEY,
        empresa_nome VARCHAR(255) DEFAULT 'Alvorada Veículos',
        favicon_url VARCHAR(255) DEFAULT 'favicon.ico',
        logo_url VARCHAR(255) DEFAULT 'icone.png',
        background_url VARCHAR(255) DEFAULT 'fundologin.png',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contas (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(10) NOT NULL, -- 'Pagar' ou 'Receber'
        descricao TEXT NOT NULL,
        valor DECIMAL(15,2) NOT NULL,
        data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
        data_vencimento DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'Pendente', -- 'Pendente', 'Pago', 'Cancelado'
        pessoa_id INTEGER REFERENCES pessoas(id) ON DELETE SET NULL,
        veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
        centro_custo_id INTEGER REFERENCES centros_custo(id) ON DELETE SET NULL,
        banco_id INTEGER REFERENCES bancos(id) ON DELETE SET NULL,
        data_pagamento DATE,
        movimento_id INTEGER REFERENCES movimentos(id) ON DELETE SET NULL
      );

      -- Histórico de quilometragem: cada leitura fica registrada (não sobrescreve),
      -- permitindo montar a timeline de KM de um veículo ao longo do tempo — inclusive
      -- entre passagens diferentes pela loja (compra, venda, recompra).
      CREATE TABLE IF NOT EXISTS veiculo_km_historico (
        id SERIAL PRIMARY KEY,
        veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE CASCADE,
        data DATE NOT NULL DEFAULT CURRENT_DATE,
        quilometragem INTEGER NOT NULL,
        origem VARCHAR(20) NOT NULL DEFAULT 'Manual', -- Cadastro, Venda, Cautelar, Manual
        observacao TEXT
      );

      -- Cautelar/Vistoria: laudo de terceiros que atesta a situação do veículo (furto,
      -- adulteração de chassi, restrição/gravame, sinistro), usado sobretudo em recompras.
      CREATE TABLE IF NOT EXISTS cautelares (
        id SERIAL PRIMARY KEY,
        veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE CASCADE,
        empresa_realizadora VARCHAR(200),
        data DATE NOT NULL DEFAULT CURRENT_DATE,
        resultado VARCHAR(20), -- Aprovado, Reprovado, Restrição
        laudo_url VARCHAR(255),
        custo DECIMAL(15,2),
        centro_custo_id INTEGER REFERENCES centros_custo(id) ON DELETE SET NULL,
        banco_id INTEGER REFERENCES bancos(id) ON DELETE SET NULL,
        movimento_id INTEGER REFERENCES movimentos(id) ON DELETE SET NULL,
        observacoes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_km_historico_veiculo ON veiculo_km_historico(veiculo_id);
      CREATE INDEX IF NOT EXISTS idx_cautelares_veiculo ON cautelares(veiculo_id);

      INSERT INTO parametros (id, empresa_nome, favicon_url, logo_url, background_url)
      VALUES (1, 'Alvorada Veículos', 'favicon.ico', 'icone.png', 'fundologin.png')
      ON CONFLICT (id) DO NOTHING;

      ALTER TABLE modelos ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(20) DEFAULT 'Carro';
      ALTER TABLE marcas ADD COLUMN IF NOT EXISTS tipo_veiculo VARCHAR(20) DEFAULT 'Carro';
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS modelo VARCHAR(100);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS data_venda DATE;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS vendedor_id INTEGER REFERENCES pessoas(id) ON DELETE SET NULL;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS comissao_valor DECIMAL(15,2);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS valor_fipe DECIMAL(15,2);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS observacoes TEXT;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS chassi VARCHAR(30);
      CREATE INDEX IF NOT EXISTS idx_veiculos_chassi ON veiculos(chassi);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS renavam VARCHAR(20);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS opcionais TEXT[] DEFAULT '{}';
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS lead_status VARCHAR(30) DEFAULT 'Novo';
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS comissao_percentual DECIMAL(5,2) DEFAULT 0;

      -- Endereço completo (exigido pelo RENAVE nos dados do comprador na saída de estoque)
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS cep VARCHAR(9);
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS logradouro VARCHAR(200);
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS codigo_municipio_ibge VARCHAR(7);

      -- Dados do CRV, hodômetro e controle de integração RENAVE
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS tipo_crv VARCHAR(10);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS numero_crv VARCHAR(20);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS codigo_seguranca_crv VARCHAR(20);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS data_medicao_hodometro DATE;
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS nota_fiscal_compra_chave VARCHAR(44);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS nota_fiscal_venda_chave VARCHAR(44);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS renave_id_estoque VARCHAR(50);
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS renave_status VARCHAR(30);

      -- Dados da empresa exigidos pelo RENAVE (CNPJ do estabelecimento + endereço)
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS cep VARCHAR(9);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS logradouro VARCHAR(200);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS estado VARCHAR(2);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS codigo_municipio_ibge VARCHAR(7);

      -- Responsável e credenciais RENAVE (o operador responsável é o dono/responsável legal da loja,
      -- não um usuário qualquer do sistema — exigido pelo RENAVE em toda solicitação de estoque).
      -- A senha do certificado nunca é devolvida pela API (campo write-only, como uma senha de usuário).
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS renave_responsavel_nome VARCHAR(200);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS renave_responsavel_cpf VARCHAR(14);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS renave_certificado_nome_arquivo VARCHAR(255);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS renave_certificado_senha VARCHAR(255);

      -- CPF do operador responsável (exigido pelo RENAVE em toda solicitação de entrada/saída de estoque)
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

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

    console.log('🌱 Verificando dados base (perfis, usuários, etc)...');

    await client.query(`
      INSERT INTO perfis (id, nome, rotinas) VALUES
      (1, 'Administrador', '{dashboard,veiculos,bancos,pessoas,centros_custo,movimentos,extrato_bancario,extrato_veiculo,relatorio_despesas,usuarios,perfis,contas}'),
      (2, 'Vendedor', '{dashboard,veiculos,pessoas}'),
      (3, 'Financeiro', '{dashboard,bancos,movimentos,extrato_bancario,extrato_veiculo,relatorio_despesas,contas}')
      ON CONFLICT (id) DO NOTHING
    `);

    // Garante a rotina 'contas' nos perfis Administrador e Financeiro mesmo se o perfil já existia antes desta versão
    await client.query(`
      UPDATE perfis SET rotinas = array_append(rotinas, 'contas')
      WHERE id IN (1, 3) AND NOT ('contas' = ANY(rotinas));
    `);

    const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
    await client.query(`
      INSERT INTO usuarios (id, nome, email, senha, perfil_id, theme) VALUES
      (1, 'Administrador', 'admin@alvorada.com', $1, 1, 'dark')
      ON CONFLICT (id) DO NOTHING
    `, [adminHash]);

    await client.query(`
      INSERT INTO centros_custo (id, nome, tipo) VALUES
      (1, 'Venda de Veículos', 'Receita'),
      (2, 'Manutenção de Estoque', 'Despesa'),
      (3, 'Comissão de Vendas', 'Despesa')
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO bancos (id, nome, tipo, saldo_inicial) VALUES
      (1, 'Caixa', 'Caixa', 0)
      ON CONFLICT (id) DO NOTHING
    `);

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
      SELECT setval('centros_custo_id_seq', (SELECT COALESCE(MAX(id), 1) FROM centros_custo));
      SELECT setval('bancos_id_seq', (SELECT COALESCE(MAX(id), 1) FROM bancos));
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
