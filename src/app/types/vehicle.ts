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
  status: 'Estoque' | 'Vendido' | 'Manutenção' | 'Preparação';
}
