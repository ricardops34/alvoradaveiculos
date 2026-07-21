import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface MinhaReceitaResult {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  codigo_municipio_ibge: number;
  ddd_telefone_1: string;
  email: string;
  message?: string; // presente quando o CNPJ não é encontrado
}

@Injectable({ providedIn: 'root' })
export class CnpjService {
  constructor(private http: HttpClient) {}

  async buscar(cnpj: string): Promise<MinhaReceitaResult | null> {
    const digits = (cnpj || '').replace(/\D/g, '');
    if (digits.length !== 14) return null;

    try {
      const result = await firstValueFrom(this.http.get<MinhaReceitaResult>(`https://minhareceita.org/${digits}`));
      return result?.message ? null : result;
    } catch {
      return null;
    }
  }
}
