export interface Vehicle {
  id?: number;
  tipo_veiculo?: string;
  placa: string;
  renavam?: string;
  chassi?: string;
  marca?: string; // DEPRECATED
  modelo?: string; // DEPRECATED
  marca_id?: number;
  marca_nome?: string;
  modelo_id?: number;
  modelo_nome?: string;
  versao?: string;
  ano_fabricacao?: number;
  ano_modelo?: number;
  cor?: string;
  quilometragem?: number;
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
  fotos?: string[]; // URLs de arquivos em /uploads/veiculos (registros antigos podem ter strings Base64)
  valor_fipe?: number;
  observacoes?: string;
  opcionais?: string[];
  vendedor_id?: number;
  vendedor_nome?: string;
  comissao_valor?: number;
  // Dados exigidos pelo RENAVE (Registro Nacional de Veículos em Estoque)
  tipo_crv?: 'AZUL' | 'VERDE' | 'BRANCO' | 'DIGITAL';
  numero_crv?: string;
  codigo_seguranca_crv?: string;
  data_medicao_hodometro?: string;
  nota_fiscal_compra_chave?: string;
  nota_fiscal_venda_chave?: string;
  renave_id_estoque?: string;
  renave_status?: string;
}
