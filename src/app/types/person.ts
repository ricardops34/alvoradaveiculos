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
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}
