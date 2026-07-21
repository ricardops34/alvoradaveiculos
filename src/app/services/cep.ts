import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  municipio_id: number | null;
  municipio_nome: string;
  codigo_ibge: string;
  estado_id: number | null;
  estado_sigla: string;
}

// Consulta via nosso backend (cache local na tabela `ceps`, alimentada incrementalmente a
// cada busca) em vez de chamar o ViaCEP direto do navegador — permite casar o município
// com nosso cadastro de Localização (estado_id/municipio_id) e evitar repetir a consulta externa.
@Injectable({ providedIn: 'root' })
export class CepService {
  constructor(private http: HttpClient) {}

  async buscar(cep: string): Promise<CepResult | null> {
    const digits = (cep || '').replace(/\D/g, '');
    if (digits.length !== 8) return null;

    try {
      return await firstValueFrom(this.http.get<CepResult>(`/api/localizacao/cep/${digits}`));
    } catch {
      return null;
    }
  }

  // Usado depois da busca por CNPJ (minhareceita.org), que devolve o código IBGE do
  // município mas não passa pelo nosso backend — resolve para estado_id/municipio_id
  // do cadastro de Localização.
  async resolverMunicipioPorIbge(codigoIbge: string | number): Promise<{ estado_id: number; municipio_id: number } | null> {
    if (!codigoIbge) return null;
    try {
      const response: any = await firstValueFrom(
        this.http.get<any>('/api/localizacao/municipios', { params: { codigo_ibge: String(codigoIbge) } })
      );
      const municipio = response?.items?.[0];
      if (!municipio) return null;
      return { estado_id: municipio.estado_id, municipio_id: municipio.id };
    } catch {
      return null;
    }
  }
}
