export interface Vehicle {
  id?: number;
  tipo_veiculo: string;
  placa: string;
  renavam?: string;
  chassi?: string;
  marca?: string; // DEPRECATED
  modelo?: string; // DEPRECATED
  marca_id?: number;
  modelo_id?: number;
  versao?: string;
  ano_fabricacao: number;
  ano_modelo: number;
  cor?: string;
  quilometragem: number;
  valor_compra: number;
  data_compra?: string;
  valor_venda?: number;
  valor_avaliacao?: number; // Novo campo
  forma_compra?: 'Troca' | 'Banco';
  banco_id?: number;
  centro_custo_id?: number;
  fornecedor_id?: number;
  cliente_id?: number;
  status: string;
  fotos?: string[]; // Array de strings Base64
}
