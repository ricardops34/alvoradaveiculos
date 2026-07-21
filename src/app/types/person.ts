export interface Person {
  id?: number;
  nome: string;
  documento: string; // CPF or CNPJ
  tipo_pessoa: string;
  is_cliente: boolean;
  is_fornecedor: boolean;
  is_vendedor: boolean;
  is_socio: boolean;
  rg_ie?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  pais_id?: number;
  estado_id?: number; // UF, exigido pelo RENAVE nos dados do comprador
  municipio_id?: number; // Município, código IBGE fica no cadastro de Localização
  lead_status?: string;
  comissao_percentual?: number;
}
