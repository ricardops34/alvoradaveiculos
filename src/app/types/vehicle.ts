export interface Vehicle {
  id?: number;
  placa: string;
  renavam?: string;
  chassi?: string;
  marca: string;
  modelo: string;
  versao?: string;
  ano_fabricacao: number;
  ano_modelo: number;
  cor?: string;
  quilometragem: number;
  valor_compra: number;
  data_compra?: string;
  valor_venda?: number;
  fornecedor_id?: number;
  cliente_id?: number;
  status: 'Estoque' | 'Vendido' | 'Manutenção' | 'Preparação';
}
