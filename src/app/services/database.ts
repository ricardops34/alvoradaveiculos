import { Injectable } from '@angular/core';
import initSqlJs, { Database } from 'sql.js';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: Database | null = null;
  private initialized = false;

  async init() {
    if (this.initialized) return;

    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    });

    const savedData = localStorage.getItem('alvorada_db');
    if (savedData) {
      const uint8Array = new Uint8Array(JSON.parse(savedData));
      this.db = new SQL.Database(uint8Array);
    } else {
      this.db = new SQL.Database();
      this.createTables();
    }

    this.initialized = true;
  }

  private createTables() {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS bancos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL,
        nome TEXT NOT NULL,
        agencia TEXT NOT NULL,
        conta TEXT NOT NULL,
        tipo TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS pessoas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        documento TEXT NOT NULL,
        tipo_pessoa TEXT NOT NULL,
        tipo_cadastro TEXT NOT NULL,
        rg_ie TEXT,
        telefone TEXT,
        email TEXT,
        cep TEXT,
        endereco TEXT,
        numero TEXT,
        complemento TEXT,
        bairro TEXT,
        cidade TEXT,
        estado TEXT
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS centros_custo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS veiculos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        placa TEXT NOT NULL,
        renavam TEXT,
        chassi TEXT,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        versao TEXT,
        ano_fabricacao INTEGER,
        ano_modelo INTEGER,
        cor TEXT,
        quilometragem INTEGER,
        valor_compra REAL,
        data_compra TEXT,
        valor_venda REAL,
        fornecedor_id INTEGER,
        cliente_id INTEGER,
        status TEXT NOT NULL,
        FOREIGN KEY(fornecedor_id) REFERENCES pessoas(id),
        FOREIGN KEY(cliente_id) REFERENCES pessoas(id)
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS movimentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        banco_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        historico TEXT NOT NULL,
        valor REAL NOT NULL,
        centro_custo_id INTEGER NOT NULL,
        pessoa_id INTEGER,
        veiculo_id INTEGER,
        FOREIGN KEY(banco_id) REFERENCES bancos(id),
        FOREIGN KEY(centro_custo_id) REFERENCES centros_custo(id),
        FOREIGN KEY(pessoa_id) REFERENCES pessoas(id),
        FOREIGN KEY(veiculo_id) REFERENCES veiculos(id)
      )
    `);

    this.insertSampleData();
  }

  private insertSampleData() {
    if (!this.db) return;

    // Bancos
    const banks = [
      { codigo: '001', nome: 'Banco do Brasil', agencia: '1234', conta: '12345-6', tipo: 'Corrente' },
      { codigo: '104', nome: 'Caixa Econômica', agencia: '5678', conta: '98765-4', tipo: 'Poupança' }
    ];
    banks.forEach(bank => {
      this.db!.run('INSERT INTO bancos (codigo, nome, agencia, conta, tipo) VALUES (?, ?, ?, ?, ?)', [bank.codigo, bank.nome, bank.agencia, bank.conta, bank.tipo]);
    });

    // Pessoas
    const people = [
      { nome: 'Ricardo Alvorada', documento: '123.456.789-00', tipo_pessoa: 'Física', tipo_cadastro: 'Sócio', telefone: '(11) 98888-8888', email: 'ricardo@alvorada.com', cidade: 'São Paulo', estado: 'SP' },
      { nome: 'Carlos Vendedor', documento: '456.789.123-00', tipo_pessoa: 'Física', tipo_cadastro: 'Vendedor', telefone: '(11) 97777-7777', email: 'carlos@vendas.com', cidade: 'São Paulo', estado: 'SP' },
      { nome: 'Master Leilões S.A', documento: '12.345.678/0001-90', tipo_pessoa: 'Jurídica', tipo_cadastro: 'Fornecedor', telefone: '(11) 4444-4444', email: 'vendas@masterleiloes.com', cidade: 'São Bernardo', estado: 'SP' },
      { nome: 'José Cliente Silva', documento: '789.123.456-00', tipo_pessoa: 'Física', tipo_cadastro: 'Cliente', telefone: '(11) 96666-6666', email: 'jose@gmail.com', cidade: 'Santo André', estado: 'SP' }
    ];
    people.forEach(p => {
      this.db!.run(
        'INSERT INTO pessoas (nome, documento, tipo_pessoa, tipo_cadastro, telefone, email, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p.nome, p.documento, p.tipo_pessoa, p.tipo_cadastro, p.telefone, p.email, p.cidade, p.estado]
      );
    });

    // Centros de Custo
    const centers = [
      { codigo: '100', nome: 'Venda de Veículos', tipo: 'Receita' },
      { codigo: '200', nome: 'Manutenção de Estoque', tipo: 'Despesa' },
      { codigo: '300', nome: 'Comissões', tipo: 'Despesa' },
      { codigo: '400', nome: 'Custos Operacionais', tipo: 'Despesa' }
    ];
    centers.forEach(c => {
      this.db!.run('INSERT INTO centros_custo (codigo, nome, tipo) VALUES (?, ?, ?)', [c.codigo, c.nome, c.tipo]);
    });

    // Veículos
    const vehicles = [
      { placa: 'ALV0R22', marca: 'Toyota', modelo: 'Corolla', versao: 'Altis Hybrid', ano_fabricacao: 2022, ano_modelo: 2023, cor: 'Branco', quilometragem: 15000, valor_compra: 145000, data_compra: '2026-04-01', status: 'Estoque', fornecedor_id: 3 },
      { placa: 'CIV1C21', marca: 'Honda', modelo: 'Civic', versao: 'Touring', ano_fabricacao: 2021, ano_modelo: 2021, cor: 'Cinza', quilometragem: 28000, valor_compra: 130000, data_compra: '2026-04-05', valor_venda: 158000, status: 'Vendido', fornecedor_id: 3, cliente_id: 4 },
      { placa: 'JEE9P10', marca: 'Jeep', modelo: 'Compass', versao: 'Limited Diesel', ano_fabricacao: 2023, ano_modelo: 2023, cor: 'Azul', quilometragem: 5000, valor_compra: 185000, data_compra: '2026-04-10', status: 'Preparação', fornecedor_id: 3 }
    ];
    vehicles.forEach(v => {
      this.db!.run(
        'INSERT INTO veiculos (placa, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, quilometragem, valor_compra, data_compra, valor_venda, status, fornecedor_id, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [v.placa, v.marca, v.modelo, v.versao, v.ano_fabricacao, v.ano_modelo, v.cor, v.quilometragem, v.valor_compra, v.data_compra, v.valor_venda, v.status, v.fornecedor_id, v.cliente_id]
      );
    });

    // Movimentações
    const movements = [
      { data: '2026-04-01', banco_id: 1, tipo: 'Débito', historico: 'Compra Toyota Corolla ALV0R22', valor: -145000, centro_custo_id: 1, veiculo_id: 1, pessoa_id: 3 },
      { data: '2026-04-02', banco_id: 1, tipo: 'Débito', historico: 'Polimento e Lavagem Corolla', valor: -350, centro_custo_id: 2, veiculo_id: 1 },
      { data: '2026-04-05', banco_id: 1, tipo: 'Débito', historico: 'Compra Honda Civic CIV1C21', valor: -130000, centro_custo_id: 1, veiculo_id: 2, pessoa_id: 3 },
      { data: '2026-04-15', banco_id: 1, tipo: 'Crédito', historico: 'Venda Honda Civic CIV1C21', valor: 158000, centro_custo_id: 1, veiculo_id: 2, pessoa_id: 4 },
      { data: '2026-04-16', banco_id: 1, tipo: 'Débito', historico: 'Comissão Venda Civic - Carlos', valor: -1580, centro_custo_id: 3, veiculo_id: 2, pessoa_id: 2 }
    ];
    movements.forEach(m => {
      this.db!.run(
        'INSERT INTO movimentos (data, banco_id, tipo, historico, valor, centro_custo_id, veiculo_id, pessoa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [m.data, m.banco_id, m.tipo, m.historico, m.valor, m.centro_custo_id, m.veiculo_id, m.pessoa_id]
      );
    });

    this.save();
  }

  save() {
    if (!this.db) return;
    const data = this.db.export();
    const arr = Array.from(data);
    localStorage.setItem('alvorada_db', JSON.stringify(arr));
  }

  getAll(table: string): any[] {
    if (!this.db) return [];
    const results = this.db.exec(`SELECT * FROM ${table}`);
    if (results.length === 0) return [];

    const columns = results[0].columns;
    return results[0].values.map((row: any) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  insert(table: string, data: any) {
    if (!this.db) return;
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');
    this.db.run(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );
    this.save();
  }

  update(table: string, id: number, data: any) {
    if (!this.db) return;
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];
    this.db.run(
      `UPDATE ${table} SET ${sets} WHERE id = ?`,
      values
    );
    this.save();
  }

  delete(table: string, id: number) {
    if (!this.db) return;
    this.db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    this.save();
  }
}