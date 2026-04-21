export interface Movement {
  id?: number;
  data: string;
  banco_id: number;
  tipo: string;
  historico: string;
  valor: number;
  centro_custo_id: number;
  pessoa_id?: number;
  veiculo_id?: number;
}
