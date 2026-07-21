import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // cidade
  uf: string;
  ibge: string; // código do município IBGE
  erro?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CepService {
  constructor(private http: HttpClient) {}

  async buscar(cep: string): Promise<ViaCepResult | null> {
    const digits = (cep || '').replace(/\D/g, '');
    if (digits.length !== 8) return null;

    const result = await firstValueFrom(this.http.get<ViaCepResult>(`https://viacep.com.br/ws/${digits}/json/`));
    return result?.erro ? null : result;
  }
}
