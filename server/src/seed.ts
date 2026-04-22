import pool from './db';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function seed() {
  const client = await pool.connect();
  
  try {
    // Verificar se já foi seed (tabela perfis existe e tem dados)
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

      CREATE TABLE IF NOT EXISTS veiculos (
        id SERIAL PRIMARY KEY,
        placa VARCHAR(10),
        marca VARCHAR(50),
        modelo VARCHAR(50),
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

      CREATE TABLE IF NOT EXISTS movimentos (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        banco_id INTEGER REFERENCES bancos(id) ON DELETE SET NULL,
        tipo VARCHAR(20),
        historico TEXT,
        valor DECIMAL(15,2),
        centro_custo_id INTEGER REFERENCES centros_custo(id) ON DELETE SET NULL,
        veiculo_id INTEGER REFERENCES veiculos(id) ON DELETE SET NULL,
        pessoa_id INTEGER REFERENCES pessoas(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(200) NOT NULL,
        perfil_id INTEGER REFERENCES perfis(id) ON DELETE SET NULL,
        theme VARCHAR(10) DEFAULT 'light'
      );
    `);

    console.log('✅ Tabelas criadas com sucesso.');

    // Se tabelas já existiam com dados, não faz seed novamente
    if (tablesExist) {
      const countCheck = await client.query('SELECT COUNT(*) FROM perfis');
      if (parseInt(countCheck.rows[0].count) > 0) {
        console.log('ℹ️  Dados já existem. Seed ignorado.');
        return;
      }
    }

    console.log('🌱 Inserindo dados de teste...');

    // Perfis
    await client.query(`
      INSERT INTO perfis (id, nome, rotinas) VALUES
      (1, 'Administrador', '{dashboard,veiculos,bancos,pessoas,centros_custo,movimentos,extrato_bancario,extrato_veiculo,relatorio_despesas,usuarios,perfis}'),
      (2, 'Vendedor', '{dashboard,veiculos,pessoas}'),
      (3, 'Financeiro', '{dashboard,bancos,movimentos,extrato_bancario,extrato_veiculo,relatorio_despesas}'),
      (4, 'Gerente de Vendas', '{dashboard,veiculos,pessoas,extrato_veiculo}'),
      (5, 'Auxiliar Administrativo', '{dashboard,pessoas,centros_custo,bancos}'),
      (6, 'Consultor Externo', '{veiculos,pessoas}')
    `);

    // Bancos
    await client.query(`
      INSERT INTO bancos (id, codigo, nome, agencia, conta, tipo, limite_credito, saldo_inicial) VALUES
      (1, '001', 'Banco do Brasil', '1234', '12345-6', 'Corrente', 100000, 500000),
      (2, '104', 'Caixa Econômica', '5678', '98765-4', 'Poupança', 0, 150000),
      (3, '033', 'Santander', '9988', '11223-3', 'Corrente', 50000, 300000)
    `);

    // Pessoas
    await client.query(`
      INSERT INTO pessoas (id, nome, documento, tipo_pessoa, is_cliente, is_fornecedor, is_vendedor, is_socio, telefone, email, cidade, estado) VALUES
      (1, 'Ricardo Alvorada', '123.456.789-00', 'Física', 0, 0, 0, 1, '(11) 98888-8888', 'ricardo@alvorada.com', 'São Paulo', 'SP'),
      (2, 'Carlos Vendedor', '456.789.123-00', 'Física', 0, 0, 1, 0, '(11) 97777-7777', 'carlos@vendas.com', 'São Paulo', 'SP'),
      (3, 'Master Leilões S.A', '12.345.678/0001-90', 'Jurídica', 0, 1, 0, 0, '(11) 4444-4444', 'vendas@masterleiloes.com', 'São Bernardo', 'SP'),
      (4, 'José Cliente Silva', '789.123.456-00', 'Física', 1, 0, 0, 0, '(11) 96666-6666', 'jose@gmail.com', 'Santo André', 'SP'),
      (5, 'Maria Oliveira', '321.654.987-11', 'Física', 1, 0, 0, 0, '(11) 95555-5555', 'maria@uol.com.br', 'Mauá', 'SP'),
      (6, 'Auto Peças Express', '99.888.777/0001-66', 'Jurídica', 0, 1, 0, 0, '(11) 3333-3333', 'contato@pecas.com', 'São Paulo', 'SP')
    `);

    // Centros de Custo
    await client.query(`
      INSERT INTO centros_custo (id, codigo, nome, tipo) VALUES
      (1, '100', 'Venda de Veículos', 'Receita'),
      (2, '200', 'Manutenção de Estoque', 'Despesa'),
      (3, '300', 'Comissões', 'Despesa'),
      (4, '400', 'Custos Operacionais', 'Despesa'),
      (5, '500', 'Marketing e Anúncios', 'Despesa')
    `);

    // Veículos
    await client.query(`
      INSERT INTO veiculos (id, placa, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, valor_avaliacao, valor_venda, data_compra, status, fornecedor_id, cliente_id) VALUES
      (1, 'ALV0R22', 'Toyota', 'Corolla', 'Altis Hybrid', 2022, 2023, 'Branco', 15000, 145000, 150000, NULL, '2026-03-01', 'Estoque', 3, NULL),
      (2, 'CIV1C21', 'Honda', 'Civic', 'Touring', 2021, 2021, 'Cinza', 28000, 130000, 135000, 158000, '2026-03-05', 'Vendido', 3, 4),
      (3, 'JEE9P10', 'Jeep', 'Compass', 'Limited Diesel', 2023, 2023, 'Azul', 5000, 185000, 190000, NULL, '2026-04-10', 'Preparação', 3, NULL),
      (4, 'GOL1K44', 'VW', 'Gol', '1.0 MPI', 2019, 2020, 'Prata', 45000, 42000, 45000, 54000, '2026-04-12', 'Vendido', 5, 4),
      (5, 'BMW3I20', 'BMW', '320i', 'M Sport', 2023, 2024, 'Preto', 1200, 310000, 320000, NULL, '2026-04-15', 'Estoque', 3, NULL),
      (6, 'ONX5S88', 'Chevrolet', 'Onix', 'Premier', 2022, 2022, 'Vermelho', 22000, 78000, 82000, NULL, '2026-04-18', 'Estoque', 5, NULL),
      (7, 'SW4X999', 'Toyota', 'SW4', 'Diamond', 2021, 2021, 'Branco', 35000, 290000, 300000, 345000, '2026-03-20', 'Vendido', 3, 5)
    `);

    // Movimentos
    await client.query(`
      INSERT INTO movimentos (id, data, banco_id, tipo, historico, valor, centro_custo_id, veiculo_id, pessoa_id) VALUES
      (1, '2026-03-01', 1, 'Débito', 'Compra Toyota Corolla ALV0R22', -145000, 1, 1, 3),
      (2, '2026-03-02', 1, 'Débito', 'Revisão Corolla', -1500, 2, 1, NULL),
      (3, '2026-03-05', 1, 'Débito', 'Compra Honda Civic CIV1C21', -130000, 1, 2, 3),
      (4, '2026-03-20', 3, 'Débito', 'Compra Toyota SW4 SW4X999', -290000, 1, 7, 3),
      (5, '2026-04-01', 1, 'Crédito', 'Venda Honda Civic CIV1C21', 158000, 1, 2, 4),
      (6, '2026-04-02', 1, 'Débito', 'Comissão Venda Civic', -1580, 3, 2, 2),
      (7, '2026-04-05', 3, 'Crédito', 'Venda Toyota SW4 SW4X999', 345000, 1, 7, 5),
      (8, '2026-04-10', 1, 'Débito', 'Compra Jeep Compass JEE9P10', -185000, 1, 3, 3),
      (9, '2026-04-12', 2, 'Débito', 'Compra VW Gol GOL1K44', -42000, 1, 4, 5),
      (10, '2026-04-15', 2, 'Crédito', 'Venda VW Gol GOL1K44', 54000, 1, 4, 4),
      (11, '2026-04-16', 1, 'Débito', 'Aluguel Salão Abril', -5000, 4, NULL, NULL),
      (12, '2026-04-17', 1, 'Débito', 'Energia e Água', -850, 4, NULL, NULL),
      (13, '2026-04-18', 1, 'Débito', 'Instagram Ads - Campanha Abril', -1200, 5, NULL, NULL),
      (14, '2026-04-19', 1, 'Débito', 'Higienização Onix ONX5S88', -450, 2, 6, NULL),
      (15, '2026-04-20', 1, 'Débito', 'Revisão BMW 320i', -3500, 2, 5, NULL),
      (16, '2026-04-21', 1, 'Crédito', 'Aporte de Capital - Sócio Ricardo', 50000, 4, NULL, 1)
    `);

    // Usuários (com senhas hasheadas)
    const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
    const userHash = await bcrypt.hash('123', SALT_ROUNDS);

    await client.query(`
      INSERT INTO usuarios (id, nome, email, senha, perfil_id, theme) VALUES
      ($1, 'Administrador', 'admin@alvorada.com', $2, 1, 'dark'),
      ($3, 'João Vendedor', 'joao@alvorada.com', $4, 2, 'light'),
      ($5, 'Maria Financeiro', 'maria@alvorada.com', $6, 3, 'light')
    `, [1, adminHash, 2, userHash, 3, userHash]);

    // Resetar sequences para continuar a partir do último ID
    await client.query(`
      SELECT setval('perfis_id_seq', (SELECT MAX(id) FROM perfis));
      SELECT setval('bancos_id_seq', (SELECT MAX(id) FROM bancos));
      SELECT setval('pessoas_id_seq', (SELECT MAX(id) FROM pessoas));
      SELECT setval('centros_custo_id_seq', (SELECT MAX(id) FROM centros_custo));
      SELECT setval('veiculos_id_seq', (SELECT MAX(id) FROM veiculos));
      SELECT setval('movimentos_id_seq', (SELECT MAX(id) FROM movimentos));
      SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));
    `);

    console.log('✅ Dados de teste inseridos com sucesso!');
  } catch (err) {
    console.error('❌ Erro no seed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Executar seed e exportar para uso no index.ts
export default seed;

// Se executado diretamente
if (require.main === module) {
  seed().then(() => {
    console.log('Seed finalizado.');
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}
