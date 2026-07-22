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

      -- Cadastros básicos de localização (País/UF/Município), usados como referência em
      -- Pessoas e Empresa (Configurações) em vez de texto livre. UF e Município são
      -- populados via sincronização com a API do IBGE (ver server/src/routes/localizacao.ts);
      -- País por enquanto só tem o Brasil (pré-cadastrado abaixo).
      CREATE TABLE IF NOT EXISTS paises (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        sigla VARCHAR(5)
      );

      CREATE TABLE IF NOT EXISTS estados (
        id SERIAL PRIMARY KEY,
        pais_id INTEGER REFERENCES paises(id) ON DELETE SET NULL,
        nome VARCHAR(100) NOT NULL,
        sigla VARCHAR(2) NOT NULL,
        codigo_ibge VARCHAR(2) UNIQUE
      );

      CREATE TABLE IF NOT EXISTS municipios (
        id SERIAL PRIMARY KEY,
        estado_id INTEGER REFERENCES estados(id) ON DELETE CASCADE,
        nome VARCHAR(150) NOT NULL,
        codigo_ibge VARCHAR(7) UNIQUE
      );

      -- Cache de CEPs já consultados (ViaCEP), alimentado incrementalmente a cada busca
      -- feita pelas telas de Pessoas/Configurações — evita repetir a chamada externa.
      CREATE TABLE IF NOT EXISTS ceps (
        cep VARCHAR(9) PRIMARY KEY,
        logradouro VARCHAR(200),
        bairro VARCHAR(100),
        municipio_id INTEGER REFERENCES municipios(id) ON DELETE SET NULL,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Catálogo de opcionais de veículo (antes uma lista fixa no código do frontend, sem tela de admin)
      CREATE TABLE IF NOT EXISTS opcionais (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL UNIQUE
      );

      -- Loja pública: anúncios/banners de publicidade exibidos na vitrine (ex: bloco lateral,
      -- como em portais de veículos). 'posicao' permite ter mais de um slot no layout.
      CREATE TABLE IF NOT EXISTS publicidade (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(150) NOT NULL,
        imagem_url VARCHAR(255),
        link_url VARCHAR(255),
        posicao VARCHAR(30) NOT NULL DEFAULT 'lateral',
        ativo BOOLEAN DEFAULT true,
        ordem INTEGER DEFAULT 0
      );

      -- Loja pública: notícias/artigos exibidos na vitrine (ex: "Notícias em destaque")
      CREATE TABLE IF NOT EXISTS noticias (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(200) NOT NULL,
        resumo TEXT,
        conteudo TEXT,
        imagem_url VARCHAR(255),
        ativo BOOLEAN DEFAULT true,
        publicado_em DATE NOT NULL DEFAULT CURRENT_DATE
      );

      -- Ficha técnica: dados de fábrica do Modelo (motor, potência, câmbio, consumo etc.), distinto
      -- do veículo específico em estoque — um Modelo (ex: "Onix LT") tem uma ficha só, reaproveitada
      -- por todos os veículos daquele modelo. Exibida na página pública do veículo.
      CREATE TABLE IF NOT EXISTS fichas_tecnicas (
        id SERIAL PRIMARY KEY,
        modelo_id INTEGER REFERENCES modelos(id) ON DELETE CASCADE UNIQUE,
        motor VARCHAR(100),
        potencia VARCHAR(50),
        torque VARCHAR(50),
        cambio VARCHAR(50),
        tracao VARCHAR(50),
        consumo_cidade VARCHAR(30),
        consumo_estrada VARCHAR(30),
        porta_malas VARCHAR(30),
        tanque VARCHAR(30),
        observacoes TEXT
      );

      -- Clientes: cadastro básico de quem acessa a loja pública (não é 'usuarios', que é da equipe
      -- da loja) — usado para favoritar veículos e falar com o assistente. Login é por CPF (não
      -- e-mail), autenticação própria e separada do CRM.
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        cpf VARCHAR(14) NOT NULL UNIQUE,
        data_nascimento DATE,
        email VARCHAR(255) NOT NULL,
        senha VARCHAR(255) NOT NULL,
        telefone VARCHAR(20),
        telefone_secundario VARCHAR(20),
        estado_id INTEGER REFERENCES estados(id) ON DELETE SET NULL,
        municipio_id INTEGER REFERENCES municipios(id) ON DELETE SET NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favoritos (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
        veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE CASCADE,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (cliente_id, veiculo_id)
      );

      CREATE INDEX IF NOT EXISTS idx_estados_pais ON estados(pais_id);
      CREATE INDEX IF NOT EXISTS idx_municipios_estado ON municipios(estado_id);
      CREATE INDEX IF NOT EXISTS idx_km_historico_veiculo ON veiculo_km_historico(veiculo_id);
      CREATE INDEX IF NOT EXISTS idx_cautelares_veiculo ON cautelares(veiculo_id);
      CREATE INDEX IF NOT EXISTS idx_publicidade_posicao ON publicidade(posicao);
      CREATE INDEX IF NOT EXISTS idx_favoritos_cliente ON favoritos(cliente_id);

      INSERT INTO parametros (id, empresa_nome, favicon_url, logo_url, background_url)
      VALUES (1, 'Alvorada Veículos', 'favicon.ico', 'logo-alvorada-horizontal.png', 'fachada-alvorada-login-v2.png')
      ON CONFLICT (id) DO NOTHING;

      -- Instalações já existentes (banco provisionado antes do redesign da tela de login) ainda têm
      -- os valores antigos ('icone.png'/'fundologin.png') gravados — atualiza só quem nunca foi
      -- customizado pelo Administrador, pra não sobrescrever um logo/fundo que já foi trocado.
      UPDATE parametros SET logo_url = 'logo-alvorada-horizontal.png' WHERE id = 1 AND logo_url = 'icone.png';
      UPDATE parametros SET background_url = 'fachada-alvorada-login-v2.png' WHERE id = 1 AND background_url = 'fundologin.png';

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

      -- Loja pública (vitrine): veículo só aparece no site público se marcado como publicado
      -- (além de precisar estar com status Estoque/Preparação — ver server/src/routes/loja.ts).
      ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS publicado BOOLEAN DEFAULT false;
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

      -- Endereço por lookup (País/UF/Município) em vez de texto livre. Os campos antigos
      -- (cidade, estado, codigo_municipio_ibge) permanecem na tabela só para não perder dados
      -- já digitados antes desta versão; a tela não os usa mais.
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS pais_id INTEGER REFERENCES paises(id) ON DELETE SET NULL;
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS estado_id INTEGER REFERENCES estados(id) ON DELETE SET NULL;
      ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS municipio_id INTEGER REFERENCES municipios(id) ON DELETE SET NULL;

      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS pais_id INTEGER REFERENCES paises(id) ON DELETE SET NULL;
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS estado_id INTEGER REFERENCES estados(id) ON DELETE SET NULL;
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS municipio_id INTEGER REFERENCES municipios(id) ON DELETE SET NULL;

      -- Envio de e-mail (Proposta Comercial / Recibos) via SMTP configurado pelo Administrador.
      -- smtp_pass é write-only, mesmo padrão da senha do certificado do RENAVE.
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS smtp_port INTEGER;
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS smtp_pass VARCHAR(255);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS smtp_from VARCHAR(255);

      -- Loja pública (vitrine de veículos): telefone de contato (WhatsApp) exibido no site, e
      -- interruptor que decide se a raiz do sistema ('/') abre a loja pública ou vai direto pro
      -- login. Desligado por padrão — instalações existentes não ganham uma vitrine pública sem
      -- o Administrador optar por isso.
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS loja_ativa BOOLEAN DEFAULT false;

      -- Assistente de IA (Grok/xAI) da loja pública: chave por instalação (tenant), não variável
      -- de ambiente global — cada loja usa sua própria conta/custo na xAI. Write-only como as
      -- outras credenciais (certificado RENAVE, senha SMTP). O ícone de assistente só aparece no
      -- site se 'grok_ativo' E a chave estiverem configurados.
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS grok_api_key VARCHAR(255);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS grok_ativo BOOLEAN DEFAULT false;

      -- Token da API Invertexto (tabela FIPE) — usado no cadastro de Veículos para buscar o
      -- Valor FIPE automaticamente por marca/modelo/ano em vez de digitar manualmente.
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS invertexto_token VARCHAR(255);

      -- Personalização visual da loja pública (vitrine): cor de destaque, textos do
      -- hero/rodapé, grid ou lista na listagem, e marca d'água sobre as fotos dos veículos
      -- (aplicada só visualmente no site — não altera os arquivos/URLs de foto originais).
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS loja_cor_primaria VARCHAR(7) DEFAULT '#f5c400';
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS loja_hero_titulo VARCHAR(200) DEFAULT 'Encontre o veículo ideal na Alvorada Veículos';
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS loja_hero_subtitulo VARCHAR(200) DEFAULT 'Estoque atualizado, direto da loja.';
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS loja_rodape_texto VARCHAR(200) DEFAULT 'Alvorada Veículos — Sistema de Gestão Alvorada';
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS loja_estilo_lista VARCHAR(10) DEFAULT 'grid';
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS loja_marca_dagua_ativa BOOLEAN DEFAULT false;
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS loja_marca_dagua_url VARCHAR(255);
      ALTER TABLE parametros ADD COLUMN IF NOT EXISTS loja_marca_dagua_opacidade INTEGER DEFAULT 30;

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
      (1, 'Administrador', '{dashboard,veiculos,bancos,pessoas,centros_custo,movimentos,extrato_bancario,extrato_veiculo,relatorio_despesas,usuarios,perfis,contas,localizacao}'),
      (2, 'Vendedor', '{dashboard,veiculos,pessoas}'),
      (3, 'Financeiro', '{dashboard,bancos,movimentos,extrato_bancario,extrato_veiculo,relatorio_despesas,contas}')
      ON CONFLICT (id) DO NOTHING
    `);

    // Garante a rotina 'contas' nos perfis Administrador e Financeiro mesmo se o perfil já existia antes desta versão
    await client.query(`
      UPDATE perfis SET rotinas = array_append(rotinas, 'contas')
      WHERE id IN (1, 3) AND NOT ('contas' = ANY(rotinas));
    `);

    // Opcionais é sub-recurso de Veículos (mesma rotina de Marcas/Modelos). 'localizacao' só
    // controla a visibilidade do menu de Estados/Municípios (tela restrita a Administrador);
    // a leitura de país/UF/município/CEP fica liberada pra qualquer usuário autenticado, pois
    // é usada nos formulários de Pessoas e Configurações independente do perfil.
    await client.query(`
      UPDATE perfis SET rotinas = array_append(rotinas, 'localizacao')
      WHERE id = 1 AND NOT ('localizacao' = ANY(rotinas));
    `);

    const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
    await client.query(`
      INSERT INTO usuarios (id, nome, email, senha, perfil_id, theme) VALUES
      (1, 'Administrador', 'admin@alvorada.com', $1, 1, 'dark')
      ON CONFLICT (id) DO NOTHING
    `, [adminHash]);

    await client.query(`
      INSERT INTO centros_custo (id, codigo, nome, tipo) VALUES
      (1, 'VND', 'Venda de Veículos', 'Receita'),
      (2, 'MNT', 'Manutenção de Estoque', 'Despesa'),
      (3, 'COM', 'Comissão de Vendas', 'Despesa')
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO bancos (id, nome, tipo, saldo_inicial) VALUES
      (1, 'Caixa', 'Caixa', 0)
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO paises (id, nome, sigla) VALUES (1, 'Brasil', 'BRA')
      ON CONFLICT (id) DO NOTHING
    `);

    // Catálogo inicial de opcionais — mesma lista que antes ficava fixa no código do
    // formulário de Veículos, agora administrável pela tela de Opcionais.
    await client.query(`
      INSERT INTO opcionais (nome) VALUES
      ('Ar Condicionado'), ('Direção Hidráulica'), ('Vidro Elétrico'), ('Trava Elétrica'),
      ('Alarme'), ('Som/Multimídia'), ('Bancos de Couro'), ('Teto Solar'), ('Câmera de Ré'),
      ('Sensor de Estacionamento'), ('Airbag'), ('ABS'), ('Piloto Automático'),
      ('Rodas de Liga Leve'), ('GNV')
      ON CONFLICT (nome) DO NOTHING
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
      SELECT setval('paises_id_seq', (SELECT COALESCE(MAX(id), 1) FROM paises));
      SELECT setval('opcionais_id_seq', (SELECT COALESCE(MAX(id), 1) FROM opcionais));
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
