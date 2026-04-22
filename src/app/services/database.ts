import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private dbName = 'alvorada_json_db';
  private initialized = false;

  constructor() {}

  async init() {
    if (this.initialized) return;

    let data = localStorage.getItem(this.dbName);
    if (!data) {
      this.createDefaultData();
    }
    this.initialized = true;
  }

  private createDefaultData() {
    const defaultData = {
      perfis: [
        { id: 1, nome: 'Administrador', rotinas: ['dashboard', 'veiculos', 'bancos', 'pessoas', 'centros_custo', 'movimentos', 'extrato_bancario', 'extrato_veiculo', 'relatorio_despesas', 'usuarios', 'perfis'] },
        { id: 2, nome: 'Vendedor', rotinas: ['dashboard', 'veiculos', 'pessoas'] },
        { id: 3, nome: 'Financeiro', rotinas: ['dashboard', 'bancos', 'movimentos', 'extrato_bancario', 'extrato_veiculo', 'relatorio_despesas'] },
        { id: 4, nome: 'Gerente de Vendas', rotinas: ['dashboard', 'veiculos', 'pessoas', 'extrato_veiculo'] },
        { id: 5, nome: 'Auxiliar Administrativo', rotinas: ['dashboard', 'pessoas', 'centros_custo', 'bancos'] },
        { id: 6, nome: 'Consultor Externo', rotinas: ['veiculos', 'pessoas'] }
      ],
      bancos: [
        { id: 1, codigo: '001', nome: 'Banco do Brasil', agencia: '1234', conta: '12345-6', tipo: 'Corrente', limite_credito: 10000 },
        { id: 2, codigo: '104', nome: 'Caixa Econômica', agencia: '5678', conta: '98765-4', tipo: 'Poupança', limite_credito: 0 }
      ],
      pessoas: [
        { id: 1, nome: 'Ricardo Alvorada', documento: '123.456.789-00', tipo_pessoa: 'Física', is_cliente: 0, is_fornecedor: 0, is_vendedor: 0, is_socio: 1, telefone: '(11) 98888-8888', email: 'ricardo@alvorada.com', cidade: 'São Paulo', estado: 'SP' },
        { id: 2, nome: 'Carlos Vendedor', documento: '456.789.123-00', tipo_pessoa: 'Física', is_cliente: 0, is_fornecedor: 0, is_vendedor: 1, is_socio: 0, telefone: '(11) 97777-7777', email: 'carlos@vendas.com', cidade: 'São Paulo', estado: 'SP' },
        { id: 3, nome: 'Master Leilões S.A', documento: '12.345.678/0001-90', tipo_pessoa: 'Jurídica', is_cliente: 0, is_fornecedor: 1, is_vendedor: 0, is_socio: 0, telefone: '(11) 4444-4444', email: 'vendas@masterleiloes.com', cidade: 'São Bernardo', estado: 'SP' },
        { id: 4, nome: 'José Cliente Silva', documento: '789.123.456-00', tipo_pessoa: 'Física', is_cliente: 1, is_fornecedor: 0, is_vendedor: 0, is_socio: 0, telefone: '(11) 96666-6666', email: 'jose@gmail.com', cidade: 'Santo André', estado: 'SP' }
      ],
      centros_custo: [
        { id: 1, codigo: '100', nome: 'Venda de Veículos', tipo: 'Receita' },
        { id: 2, codigo: '200', nome: 'Manutenção de Estoque', tipo: 'Despesa' },
        { id: 3, codigo: '300', nome: 'Comissões', tipo: 'Despesa' },
        { id: 4, codigo: '400', nome: 'Custos Operacionais', tipo: 'Despesa' }
      ],
      veiculos: [
        { id: 1, placa: 'ALV0R22', marca: 'Toyota', modelo: 'Corolla', versao: 'Altis Hybrid', ano_fabricacao: 2022, ano_modelo: 2023, cor: 'Branco', quilometragem: 15000, valor_compra: 145000, data_compra: '2026-04-01', status: 'Estoque', fornecedor_id: 3 },
        { id: 2, placa: 'CIV1C21', marca: 'Honda', modelo: 'Civic', versao: 'Touring', ano_fabricacao: 2021, ano_modelo: 2021, cor: 'Cinza', quilometragem: 28000, valor_compra: 130000, data_compra: '2026-04-05', valor_venda: 158000, status: 'Vendido', fornecedor_id: 3, cliente_id: 4 },
        { id: 3, placa: 'JEE9P10', marca: 'Jeep', modelo: 'Compass', versao: 'Limited Diesel', ano_fabricacao: 2023, ano_modelo: 2023, cor: 'Azul', quilometragem: 5000, valor_compra: 185000, data_compra: '2026-04-10', status: 'Preparação', fornecedor_id: 3 }
      ],
      movimentos: [
        { id: 1, data: '2026-04-01', banco_id: 1, tipo: 'Débito', historico: 'Compra Toyota Corolla ALV0R22', valor: -145000, centro_custo_id: 1, veiculo_id: 1, pessoa_id: 3 },
        { id: 2, data: '2026-04-02', banco_id: 1, tipo: 'Débito', historico: 'Polimento e Lavagem Corolla', valor: -350, centro_custo_id: 2, veiculo_id: 1 },
        { id: 3, data: '2026-04-05', banco_id: 1, tipo: 'Débito', historico: 'Compra Honda Civic CIV1C21', valor: -130000, centro_custo_id: 1, veiculo_id: 2, pessoa_id: 3 },
        { id: 4, data: '2026-04-15', banco_id: 1, tipo: 'Crédito', historico: 'Venda Honda Civic CIV1C21', valor: 158000, centro_custo_id: 1, veiculo_id: 2, pessoa_id: 4 },
        { id: 5, data: '2026-04-16', banco_id: 1, tipo: 'Débito', historico: 'Comissão Venda Civic - Carlos', valor: -1580, centro_custo_id: 3, veiculo_id: 2, pessoa_id: 2 },
        { id: 6, data: '2026-04-18', banco_id: 2, tipo: 'Débito', historico: 'Troca de Óleo e Filtros Jeep Compass', valor: -850, centro_custo_id: 2, veiculo_id: 3 },
        { id: 7, data: '2026-04-20', banco_id: 1, tipo: 'Débito', historico: 'Conta de Energia Loja', valor: -1200, centro_custo_id: 4 },
        { id: 8, data: '2026-04-21', banco_id: 1, tipo: 'Débito', historico: 'Aluguel Salão', valor: -5000, centro_custo_id: 4 },
        { id: 9, data: '2026-03-25', banco_id: 1, tipo: 'Crédito', historico: 'Venda veículo consignado anterior', valor: 45000, centro_custo_id: 1 },
        { id: 10, data: '2026-04-22', banco_id: 1, tipo: 'Débito', historico: 'Reparo Freios Corolla', valor: -1200, centro_custo_id: 2, veiculo_id: 1 }
      ],
      usuarios: [
        { id: 1, nome: 'Administrador', email: 'admin@alvorada.com', senha: 'admin123', perfil_id: 1 },
        { id: 2, nome: 'João Vendedor', email: 'joao@alvorada.com', senha: '123', perfil_id: 2 },
        { id: 3, nome: 'Maria Financeiro', email: 'maria@alvorada.com', senha: '123', perfil_id: 3 },
        { id: 4, nome: 'Carlos Gerente', email: 'carlos@alvorada.com', senha: '123', perfil_id: 4 },
        { id: 5, nome: 'Ana Auxiliar', email: 'ana@alvorada.com', senha: '123', perfil_id: 5 },
        { id: 6, nome: 'Pedro Consultor', email: 'pedro@alvorada.com', senha: '123', perfil_id: 6 }
      ]
    };
    localStorage.setItem(this.dbName, JSON.stringify(defaultData));
  }

  private getData(): any {
    return JSON.parse(localStorage.getItem(this.dbName) || '{}');
  }

  private saveData(data: any) {
    localStorage.setItem(this.dbName, JSON.stringify(data));
  }

  getAll(table: string): any[] {
    const data = this.getData();
    return data[table] || [];
  }

  insert(table: string, record: any) {
    const data = this.getData();
    if (!data[table]) data[table] = [];
    
    record.id = data[table].length > 0 ? Math.max(...data[table].map((r: any) => r.id)) + 1 : 1;
    data[table].push(record);
    this.saveData(data);
    return record;
  }

  update(table: string, id: number, record: any) {
    const data = this.getData();
    if (!data[table]) return;
    
    const index = data[table].findIndex((r: any) => r.id === id);
    if (index !== -1) {
      data[table][index] = { ...data[table][index], ...record, id };
      this.saveData(data);
    }
  }

  delete(table: string, id: number) {
    const data = this.getData();
    if (!data[table]) return;
    
    data[table] = data[table].filter((r: any) => r.id !== id);
    this.saveData(data);
  }
}