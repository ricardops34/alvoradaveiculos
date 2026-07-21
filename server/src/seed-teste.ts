import pool from './db';
import bcrypt from 'bcrypt';
import { PoolClient } from 'pg';

const SALT_ROUNDS = 10;

// Usado pra saber se o seed de teste já rodou nesse banco (evita duplicar tudo a cada execução)
const MARCADOR_EMAIL = 'joao.fornecedor@seedteste.alvorada.com';

function hoje(offsetDias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().split('T')[0];
}

async function upsertMarca(client: PoolClient, nome: string, tipo: string): Promise<number> {
  const r = await client.query(
    `INSERT INTO marcas (nome, tipo_veiculo) VALUES ($1,$2)
     ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
    [nome, tipo]
  );
  return r.rows[0].id;
}

async function upsertModelo(client: PoolClient, marcaId: number, nome: string, tipo: string, anoInicial?: number, anoFinal?: number): Promise<number> {
  const r = await client.query(
    `INSERT INTO modelos (marca_id, nome, tipo_veiculo, ano_inicial, ano_final) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (marca_id, nome, tipo_veiculo) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
    [marcaId, nome, tipo, anoInicial || null, anoFinal || null]
  );
  return r.rows[0].id;
}

interface PessoaSeed {
  ref: string;
  nome: string;
  documento: string;
  tipo_pessoa: 'Física' | 'Jurídica';
  is_cliente?: boolean;
  is_fornecedor?: boolean;
  is_vendedor?: boolean;
  is_socio?: boolean;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  codigo_municipio_ibge: string;
  lead_status?: string;
  comissao_percentual?: number;
}

async function seedTeste() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED_TESTE !== 'true') {
    console.error('❌ Recusando rodar o seed de teste com NODE_ENV=production. Defina FORCE_SEED_TESTE=true se tiver certeza absoluta de que quer poluir esse banco com dados fictícios.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    const jaExiste = await client.query('SELECT id FROM pessoas WHERE email = $1', [MARCADOR_EMAIL]);
    if ((jaExiste.rowCount ?? 0) > 0) {
      console.log('⚠️  Dados de teste já foram inseridos anteriormente nesse banco. Nada a fazer (rode um DELETE manual se quiser recomeçar).');
      return;
    }

    await client.query('BEGIN');

    console.log('🌱 Marcas e modelos de teste...');
    const toyota = await upsertMarca(client, 'TOYOTA', 'Carro');
    const vw = await upsertMarca(client, 'VOLKSWAGEN', 'Carro');
    const chevrolet = await upsertMarca(client, 'CHEVROLET', 'Carro');
    const fiat = await upsertMarca(client, 'FIAT', 'Carro');
    const honda = await upsertMarca(client, 'HONDA', 'Carro');
    const yamaha = await upsertMarca(client, 'YAMAHA', 'Moto');

    const modeloCorolla = await upsertModelo(client, toyota, 'COROLLA', 'Carro', 2015, 2023);
    const modeloHilux = await upsertModelo(client, toyota, 'HILUX', 'Carro', 2018, 2024);
    const modeloGol = await upsertModelo(client, vw, 'GOL', 'Carro', 2012, 2020);
    const modeloPolo = await upsertModelo(client, vw, 'POLO', 'Carro', 2018, 2024);
    const modeloOnix = await upsertModelo(client, chevrolet, 'ONIX', 'Carro', 2019, 2024);
    const modeloS10 = await upsertModelo(client, chevrolet, 'S10', 'Carro', 2017, 2023);
    const modeloUno = await upsertModelo(client, fiat, 'UNO', 'Carro', 2014, 2021);
    const modeloToro = await upsertModelo(client, fiat, 'TORO', 'Carro', 2019, 2024);
    const modeloCivic = await upsertModelo(client, honda, 'CIVIC', 'Carro', 2016, 2022);
    const modeloFactor = await upsertModelo(client, yamaha, 'FACTOR 125', 'Moto', 2015, 2023);

    console.log('🌱 Bancos e centros de custo de teste...');
    const bancoBB = (await client.query(
      `INSERT INTO bancos (nome, codigo, agencia, conta, tipo, limite_credito, saldo_inicial) VALUES
       ('Banco do Brasil', '001', '1234-5', '98765-4', 'Conta Corrente', 10000, 25000) RETURNING id`
    )).rows[0].id;
    const bancoBradesco = (await client.query(
      `INSERT INTO bancos (nome, codigo, agencia, conta, tipo, limite_credito, saldo_inicial) VALUES
       ('Bradesco', '237', '4321-0', '11223-3', 'Conta Corrente', 5000, 8000) RETURNING id`
    )).rows[0].id;
    const bancoCaixaResult = await client.query(`SELECT id FROM bancos WHERE nome = 'Caixa' LIMIT 1`);
    const bancoCaixa = bancoCaixaResult.rows[0]?.id;

    const centroCompra = (await client.query(
      `INSERT INTO centros_custo (nome, tipo) VALUES ('Compra de Veículos', 'Despesa') RETURNING id`
    )).rows[0].id;
    const centroAdmin = (await client.query(
      `INSERT INTO centros_custo (nome, tipo) VALUES ('Despesas Administrativas', 'Despesa') RETURNING id`
    )).rows[0].id;
    const centroCautelar = (await client.query(
      `INSERT INTO centros_custo (nome, tipo) VALUES ('Documentação e Cautelar', 'Despesa') RETURNING id`
    )).rows[0].id;
    const centroVendaResult = await client.query(`SELECT id FROM centros_custo WHERE nome = 'Venda de Veículos' LIMIT 1`);
    const centroVenda = centroVendaResult.rows[0]?.id;
    const centroComissaoResult = await client.query(`SELECT id FROM centros_custo WHERE nome = 'Comissão de Vendas' LIMIT 1`);
    const centroComissao = centroComissaoResult.rows[0]?.id;

    console.log('🌱 Pessoas de teste...');
    const pessoasSeed: PessoaSeed[] = [
      { ref: 'joao_fornecedor', nome: 'João Vendedor Particular', documento: '11122233344', tipo_pessoa: 'Física', is_fornecedor: true,
        telefone: '(11) 98888-1111', email: MARCADOR_EMAIL,
        cep: '01310-100', logradouro: 'Avenida Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', codigo_municipio_ibge: '3550308' },
      { ref: 'concessionaria_fornecedor', nome: 'Concessionária ABC Veículos Ltda', documento: '12345678000199', tipo_pessoa: 'Jurídica', is_fornecedor: true,
        telefone: '(41) 3222-4455', email: 'contato@abcveiculos.teste.com',
        cep: '80010-000', logradouro: 'Rua XV de Novembro', numero: '500', bairro: 'Centro', cidade: 'Curitiba', estado: 'PR', codigo_municipio_ibge: '4106902' },
      { ref: 'carlos_cliente', nome: 'Carlos Comprador', documento: '22233344455', tipo_pessoa: 'Física', is_cliente: true, lead_status: 'Convertido',
        telefone: '(11) 97777-2222', email: 'carlos.comprador@teste.com',
        cep: '01310-100', logradouro: 'Avenida Paulista', numero: '2000', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', codigo_municipio_ibge: '3550308' },
      { ref: 'ana_lead', nome: 'Ana Interessada', documento: '33344455566', tipo_pessoa: 'Física', is_cliente: true, lead_status: 'Contatado',
        telefone: '(11) 96666-3333', email: 'ana.interessada@teste.com',
        cep: '30130-000', logradouro: 'Avenida Afonso Pena', numero: '300', bairro: 'Centro', cidade: 'Belo Horizonte', estado: 'MG', codigo_municipio_ibge: '3106200' },
      { ref: 'pedro_lead', nome: 'Pedro Negociando', documento: '44455566677', tipo_pessoa: 'Física', is_cliente: true, lead_status: 'Negociando',
        telefone: '(41) 95555-4444', email: 'pedro.negociando@teste.com',
        cep: '80010-000', logradouro: 'Rua XV de Novembro', numero: '600', bairro: 'Centro', cidade: 'Curitiba', estado: 'PR', codigo_municipio_ibge: '4106902' },
      { ref: 'fernanda_perdida', nome: 'Fernanda Perdida', documento: '55566677788', tipo_pessoa: 'Física', is_cliente: true, lead_status: 'Perdido',
        telefone: '(11) 94444-5555', email: 'fernanda.perdida@teste.com',
        cep: '01310-100', logradouro: 'Rua Augusta', numero: '150', bairro: 'Consolação', cidade: 'São Paulo', estado: 'SP', codigo_municipio_ibge: '3550308' },
      { ref: 'transportadora_cliente', nome: 'Transportadora XYZ Ltda', documento: '98765432000188', tipo_pessoa: 'Jurídica', is_cliente: true, lead_status: 'Convertido',
        telefone: '(31) 3333-6666', email: 'contato@transportadoraxyz.teste.com',
        cep: '30130-000', logradouro: 'Avenida do Contorno', numero: '900', bairro: 'Centro', cidade: 'Belo Horizonte', estado: 'MG', codigo_municipio_ibge: '3106200' },
      { ref: 'marcos_multiplo', nome: 'Marcos Cliente e Fornecedor', documento: '66677788899', tipo_pessoa: 'Física', is_cliente: true, is_fornecedor: true, lead_status: 'Convertido',
        telefone: '(11) 93333-6666', email: 'marcos.multiplo@teste.com',
        cep: '01310-100', logradouro: 'Alameda Santos', numero: '80', bairro: 'Jardim Paulista', cidade: 'São Paulo', estado: 'SP', codigo_municipio_ibge: '3550308' },
      { ref: 'roberto_vendedor', nome: 'Roberto Vendedor', documento: '77788899900', tipo_pessoa: 'Física', is_vendedor: true, comissao_percentual: 3,
        telefone: '(11) 92222-7777', email: 'roberto.vendedor@teste.com',
        cep: '01310-100', logradouro: 'Rua Oscar Freire', numero: '400', bairro: 'Jardins', cidade: 'São Paulo', estado: 'SP', codigo_municipio_ibge: '3550308' },
      { ref: 'juliana_vendedora', nome: 'Juliana Vendas', documento: '88899900011', tipo_pessoa: 'Física', is_vendedor: true, comissao_percentual: 2.5,
        telefone: '(41) 91111-8888', email: 'juliana.vendas@teste.com',
        cep: '80010-000', logradouro: 'Rua Marechal Deodoro', numero: '250', bairro: 'Centro', cidade: 'Curitiba', estado: 'PR', codigo_municipio_ibge: '4106902' },
      { ref: 'ricardo_socio', nome: 'Ricardo Sócio', documento: '99900011122', tipo_pessoa: 'Física', is_socio: true,
        telefone: '(11) 90000-9999', email: 'ricardo.socio@teste.com',
        cep: '01310-100', logradouro: 'Avenida Brigadeiro Faria Lima', numero: '1500', bairro: 'Itaim Bibi', cidade: 'São Paulo', estado: 'SP', codigo_municipio_ibge: '3550308' }
    ];

    const pessoaId: Record<string, number> = {};
    for (const p of pessoasSeed) {
      const r = await client.query(
        `INSERT INTO pessoas (nome, documento, tipo_pessoa, is_cliente, is_fornecedor, is_vendedor, is_socio, telefone, email, cep, logradouro, numero, bairro, cidade, estado, codigo_municipio_ibge, lead_status, comissao_percentual)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
        [p.nome, p.documento, p.tipo_pessoa, p.is_cliente ? 1 : 0, p.is_fornecedor ? 1 : 0, p.is_vendedor ? 1 : 0, p.is_socio ? 1 : 0,
         p.telefone, p.email, p.cep, p.logradouro, p.numero, p.bairro, p.cidade, p.estado, p.codigo_municipio_ibge,
         p.is_cliente ? (p.lead_status || 'Novo') : null, p.comissao_percentual || 0]
      );
      pessoaId[p.ref] = r.rows[0].id;
    }

    console.log('🌱 Usuários de teste...');
    const senhaTeste = await bcrypt.hash('teste123', SALT_ROUNDS);
    await client.query(
      `INSERT INTO usuarios (nome, email, senha, cpf, perfil_id, theme) VALUES
       ('Vendedor Teste', 'vendedor@teste.alvorada.com', $1, '12312312300', 2, 'light'),
       ('Financeiro Teste', 'financeiro@teste.alvorada.com', $1, '32132132100', 3, 'light')`,
      [senhaTeste]
    );

    console.log('🌱 Veículos de teste...');

    // 1) Estoque, comprado de particular via Troca, com dados de CRV/hodômetro pro RENAVE
    const v1 = (await client.query(
      `INSERT INTO veiculos (tipo_veiculo, placa, marca_id, modelo_id, versao, ano_fabricacao, ano_modelo, cor, quilometragem,
        valor_compra, valor_avaliacao, data_compra, status, forma_compra, fornecedor_id, chassi, renavam,
        tipo_crv, numero_crv, codigo_seguranca_crv, data_medicao_hodometro)
       VALUES ('Carro','ABC1D23',$1,$2,'GLi 1.8',2020,2021,'Prata',42000,
        68000,75000,$3,'Estoque','Troca',$4,'9BWZZZ377VT004251','01234567890',
        'DIGITAL','123456789','AB1234',$3) RETURNING id`,
      [toyota, modeloCorolla, hoje(-40), pessoaId['joao_fornecedor']]
    )).rows[0].id;

    // 2) Vendido — cadeia completa de compra + venda com comissão
    const v2 = (await client.query(
      `INSERT INTO veiculos (tipo_veiculo, placa, marca_id, modelo_id, ano_fabricacao, ano_modelo, cor, quilometragem,
        valor_compra, valor_avaliacao, valor_venda, data_compra, data_venda, status, forma_compra, fornecedor_id, cliente_id, vendedor_id, comissao_valor, chassi, renavam)
       VALUES ('Carro','DEF4E56',$1,$2,2015,2016,'Branco',88000,
        32000,40000,42000,$3,$4,'Vendido','Banco',$5,$6,$7,1260,'9BWAB05U0EP123456','09876543210') RETURNING id`,
      [vw, modeloGol, hoje(-60), hoje(-10), pessoaId['concessionaria_fornecedor'], pessoaId['carlos_cliente'], pessoaId['roberto_vendedor']]
    )).rows[0].id;

    // 3) Estoque, comprado via banco, pronto pra venda
    const v3 = (await client.query(
      `INSERT INTO veiculos (tipo_veiculo, placa, marca_id, modelo_id, ano_fabricacao, ano_modelo, cor, quilometragem,
        valor_compra, valor_avaliacao, data_compra, status, forma_compra, banco_id, fornecedor_id, chassi, renavam,
        tipo_crv, numero_crv, codigo_seguranca_crv, data_medicao_hodometro)
       VALUES ('Carro','GHI7F89',$1,$2,2021,2022,'Vermelho',18000,
        55000,62000,$3,'Estoque','Banco',$4,$5,'9BGKS48U0MG112233','11223344556',
        'VERDE','223344556','CD5678',$3) RETURNING id`,
      [chevrolet, modeloOnix, hoje(-15), bancoBB, pessoaId['concessionaria_fornecedor']]
    )).rows[0].id;

    // 4) Em Preparação
    const v4 = (await client.query(
      `INSERT INTO veiculos (tipo_veiculo, placa, marca_id, modelo_id, ano_fabricacao, ano_modelo, cor, quilometragem,
        valor_compra, valor_avaliacao, data_compra, status, forma_compra, fornecedor_id, chassi, renavam)
       VALUES ('Carro','JKL0G12',$1,$2,2017,2018,'Preto',65000,
        45000,52000,$3,'Preparação','Troca',$4,'9BD198364H0234567','22334455667') RETURNING id`,
      [chevrolet, modeloS10, hoje(-8), pessoaId['joao_fornecedor']]
    )).rows[0].id;

    // 5) Em Manutenção
    const v5 = (await client.query(
      `INSERT INTO veiculos (tipo_veiculo, placa, marca_id, modelo_id, ano_fabricacao, ano_modelo, cor, quilometragem,
        valor_compra, valor_avaliacao, data_compra, status, forma_compra, fornecedor_id, chassi, renavam)
       VALUES ('Carro','MNO3H45',$1,$2,2014,2014,'Prata',120000,
        18000,23000,$3,'Manutenção','Troca',$4,'9BD195366E0345678','33445566778') RETURNING id`,
      [fiat, modeloUno, hoje(-20), pessoaId['marcos_multiplo']]
    )).rows[0].id;

    // 6) Moto em Estoque
    const v6 = (await client.query(
      `INSERT INTO veiculos (tipo_veiculo, placa, marca_id, modelo_id, ano_fabricacao, ano_modelo, cor, quilometragem,
        valor_compra, valor_avaliacao, data_compra, status, forma_compra, fornecedor_id, chassi, renavam)
       VALUES ('Moto','PQR6I78',$1,$2,2020,2020,'Vermelho',22000,
        9000,12000,$3,'Estoque','Troca',$4,'9C6KE0910L1456789','44556677889') RETURNING id`,
      [yamaha, modeloFactor, hoje(-5), pessoaId['ana_lead']]
    )).rows[0].id;

    // 7) e 8) RECOMPRA: mesmo chassi, duas estadias pela loja — pra testar Histórico do Veículo
    const chassiRecompra = '9BWHE21J0X4567890';
    const v7 = (await client.query(
      `INSERT INTO veiculos (tipo_veiculo, placa, marca_id, modelo_id, ano_fabricacao, ano_modelo, cor, quilometragem,
        valor_compra, valor_avaliacao, valor_venda, data_compra, data_venda, status, forma_compra, fornecedor_id, cliente_id, chassi, renavam)
       VALUES ('Carro','STU9J01',$1,$2,2016,2017,'Cinza',55000,
        28000,35000,37000,$3,$4,'Vendido','Troca',$5,$6,$7,'55667788990') RETURNING id`,
      [vw, modeloPolo, hoje(-200), hoje(-150), pessoaId['concessionaria_fornecedor'], pessoaId['pedro_lead'], chassiRecompra]
    )).rows[0].id;
    const v8 = (await client.query(
      `INSERT INTO veiculos (tipo_veiculo, placa, marca_id, modelo_id, ano_fabricacao, ano_modelo, cor, quilometragem,
        valor_compra, valor_avaliacao, data_compra, status, forma_compra, fornecedor_id, chassi, renavam,
        tipo_crv, numero_crv, codigo_seguranca_crv, data_medicao_hodometro)
       VALUES ('Carro','STU9J01',$1,$2,2016,2017,'Cinza',81000,
        26000,33000,$3,'Estoque','Troca',$4,$5,'55667788990',
        'DIGITAL','998877665','EF9012',$3) RETURNING id`,
      [vw, modeloPolo, hoje(-3), pessoaId['pedro_lead'], chassiRecompra]
    )).rows[0].id;

    console.log('🌱 Movimentações financeiras dos veículos...');
    // Compra do v3 via banco
    await client.query(
      `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
       VALUES ($1,$2,'Débito','Compra Veículo Chevrolet Onix (GHI7F89)',$3,$4,$5,$6)`,
      [hoje(-15), bancoBB, -55000, v3, pessoaId['concessionaria_fornecedor'], centroCompra]
    );
    // Venda do v2 via banco + comissão
    await client.query(
      `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
       VALUES ($1,$2,'Crédito','Venda Veículo Volkswagen Gol (DEF4E56)',$3,$4,$5,$6)`,
      [hoje(-10), bancoBB, 42000, v2, pessoaId['carlos_cliente'], centroVenda]
    );
    await client.query(
      `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, pessoa_id, centro_custo_id)
       VALUES ($1,$2,'Débito','Comissão - Venda Veículo Volkswagen Gol (DEF4E56)',$3,$4,$5,$6)`,
      [hoje(-10), bancoBB, -1260, v2, pessoaId['roberto_vendedor'], centroComissao]
    );
    // Manutenção do v5
    await client.query(
      `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, centro_custo_id)
       VALUES ($1,$2,'Débito','Revisão geral - Fiat Uno (MNO3H45)',$3,$4,$5)`,
      [hoje(-18), bancoCaixa, -1800, v5, centroAdmin]
    );

    console.log('🌱 Contas a Pagar/Receber de teste...');
    await client.query(
      `INSERT INTO contas (tipo, descricao, valor, data_emissao, data_vencimento, pessoa_id, status)
       VALUES ('Receber','Diferença a receber - venda com troca (exemplo)',3500,$1,$2,$3,'Pendente')`,
      [hoje(-10), hoje(20), pessoaId['carlos_cliente']]
    );
    await client.query(
      `INSERT INTO contas (tipo, descricao, valor, data_emissao, data_vencimento, veiculo_id, centro_custo_id, pessoa_id, status)
       VALUES ('Pagar','Multa de trânsito pendente - Chevrolet S10 (JKL0G12)',450,$1,$2,$3,$4,$5,'Pendente')`,
      [hoje(-5), hoje(15), v4, centroAdmin, pessoaId['joao_fornecedor']]
    );

    console.log('🌱 Cautelares de teste...');
    await client.query(
      `INSERT INTO cautelares (veiculo_id, empresa_realizadora, data, resultado, custo, centro_custo_id, banco_id, observacoes)
       VALUES ($1,'Vistoria Segura Ltda',$2,'Aprovado',180,$3,$4,'Sem restrições, chassi e motor originais.')`,
      [v1, hoje(-38), centroCautelar, bancoCaixa]
    );
    await client.query(
      `INSERT INTO cautelares (veiculo_id, empresa_realizadora, data, resultado, observacoes)
       VALUES ($1,'CheckAuto Vistorias',$2,'Restrição','Constava alienação já baixada — confirmado com o antigo proprietário.')`,
      [v8, hoje(-3)]
    );
    // Reflete o custo da primeira cautelar como movimento, igual a rota faria
    await client.query(
      `INSERT INTO movimentos (data, banco_id, tipo, historico, valor, veiculo_id, centro_custo_id)
       VALUES ($1,$2,'Débito','Cautelar - Vistoria Segura Ltda (ABC1D23)',$3,$4,$5)`,
      [hoje(-38), bancoCaixa, -180, v1, centroCautelar]
    );

    console.log('🌱 Histórico de quilometragem de teste...');
    const kmSeeds: Array<[number, string, number, string]> = [
      [v1, hoje(-40), 42000, 'Cadastro'],
      [v2, hoje(-60), 88000, 'Cadastro'],
      [v2, hoje(-10), 88500, 'Venda'],
      [v3, hoje(-15), 18000, 'Cadastro'],
      [v6, hoje(-5), 22000, 'Cadastro'],
      [v7, hoje(-200), 40000, 'Cadastro'],
      [v7, hoje(-150), 42000, 'Venda'],
      [v8, hoje(-3), 81000, 'Cadastro']
    ];
    for (const [veiculoId, data, km, origem] of kmSeeds) {
      await client.query(
        `INSERT INTO veiculo_km_historico (veiculo_id, data, quilometragem, origem) VALUES ($1,$2,$3,$4)`,
        [veiculoId, data, km, origem]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Seed de teste concluído com sucesso!');
    console.log('   Login extra: vendedor@teste.alvorada.com / financeiro@teste.alvorada.com — senha: teste123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro no seed de teste:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedTeste().then(() => {
    console.log('Seed de teste finalizado.');
    process.exit(0);
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export default seedTeste;
