export interface Person {
  id?: number;
  nome: string;
  documento: string; // CPF or CNPJ
  tipo_pessoa: 'Física' | 'Jurídica';
  tipo_cadastro: 'Cliente' | 'Fornecedor' | 'Vendedor' | 'Sócio';
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
