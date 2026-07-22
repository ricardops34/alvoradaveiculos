import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const CLIENTE_TOKEN_KEY = 'cliente_token';
const CLIENTE_DATA_KEY = 'cliente_dados';

// Serviço da loja pública (vitrine de veículos) — chama os endpoints sem autenticação em
// /api/loja/*, separados dos endpoints administrativos (que exigem token de usuário do CRM e
// expõem dados internos como custo de aquisição, fornecedor etc.). Também guarda a sessão do
// Cliente (autenticação própria, diferente da de usuários do CRM) no localStorage.
@Injectable({ providedIn: 'root' })
export class LojaService {
  constructor(private http: HttpClient) {}

  async listarVeiculos(params: any = {}): Promise<any> {
    try {
      return await firstValueFrom(this.http.get<any>('/api/loja/veiculos', { params }));
    } catch {
      return { items: [], hasNext: false, total: 0 };
    }
  }

  async buscarVeiculo(id: number | string): Promise<any> {
    try {
      return await firstValueFrom(this.http.get<any>(`/api/loja/veiculos/${id}`));
    } catch {
      return null;
    }
  }

  async estatisticas(): Promise<any> {
    try {
      return await firstValueFrom(this.http.get<any>('/api/loja/veiculos/estatisticas'));
    } catch {
      return null;
    }
  }

  async listarMarcas(): Promise<any[]> {
    try {
      const response: any = await firstValueFrom(this.http.get<any>('/api/loja/marcas'));
      return response?.items || [];
    } catch {
      return [];
    }
  }

  async listarModelos(marcaId: number): Promise<any[]> {
    try {
      const response: any = await firstValueFrom(this.http.get<any>('/api/loja/modelos', { params: { marca_id: marcaId } }));
      return response?.items || [];
    } catch {
      return [];
    }
  }

  async listarAnuncios(posicao?: string): Promise<any[]> {
    try {
      const response: any = await firstValueFrom(this.http.get<any>('/api/loja/anuncios', { params: posicao ? { posicao } : {} }));
      return response?.items || [];
    } catch {
      return [];
    }
  }

  async listarNoticias(limit = 6): Promise<any[]> {
    try {
      const response: any = await firstValueFrom(this.http.get<any>('/api/loja/noticias', { params: { limit } }));
      return response?.items || [];
    } catch {
      return [];
    }
  }

  async getParametros(): Promise<any> {
    try {
      return await firstValueFrom(this.http.get<any>('/api/config/parametros'));
    } catch {
      return null;
    }
  }

  async assistenteStatus(): Promise<boolean> {
    try {
      const response: any = await firstValueFrom(this.http.get<any>('/api/loja/assistente/status'));
      return !!response?.ativo;
    } catch {
      return false;
    }
  }

  async perguntarAssistente(pergunta: string, historico: { role: string; content: string }[]): Promise<string> {
    const response: any = await firstValueFrom(this.http.post<any>('/api/loja/assistente', { pergunta, historico }));
    return response?.resposta || '';
  }

  // --- Sessão do Cliente ---

  get clienteToken(): string | null {
    return localStorage.getItem(CLIENTE_TOKEN_KEY);
  }

  get clienteLogado(): any {
    const raw = localStorage.getItem(CLIENTE_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private salvarSessaoCliente(dados: any) {
    localStorage.setItem(CLIENTE_TOKEN_KEY, dados.token);
    const { token, ...resto } = dados;
    localStorage.setItem(CLIENTE_DATA_KEY, JSON.stringify(resto));
  }

  logoutCliente() {
    localStorage.removeItem(CLIENTE_TOKEN_KEY);
    localStorage.removeItem(CLIENTE_DATA_KEY);
  }

  async loginCliente(cpf: string, senha: string): Promise<{ ok: boolean; erro?: string }> {
    try {
      const response: any = await firstValueFrom(this.http.post<any>('/api/loja/clientes/login', { cpf, senha }));
      this.salvarSessaoCliente(response);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, erro: e?.error?.error || 'Erro ao entrar.' };
    }
  }

  async registrarCliente(dados: any): Promise<{ ok: boolean; erro?: string }> {
    try {
      const response: any = await firstValueFrom(this.http.post<any>('/api/loja/clientes/registrar', dados));
      this.salvarSessaoCliente(response);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, erro: e?.error?.error || 'Erro ao criar conta.' };
    }
  }

  private authHeaders(): { [key: string]: string } {
    const token = this.clienteToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async listarFavoritos(): Promise<any[]> {
    try {
      const response: any = await firstValueFrom(this.http.get<any>('/api/loja/favoritos', { headers: this.authHeaders() }));
      return response?.items || [];
    } catch {
      return [];
    }
  }

  async favoritar(veiculoId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.post(`/api/loja/favoritos/${veiculoId}`, {}, { headers: this.authHeaders() }));
      return true;
    } catch {
      return false;
    }
  }

  async desfavoritar(veiculoId: number): Promise<boolean> {
    try {
      await firstValueFrom(this.http.delete(`/api/loja/favoritos/${veiculoId}`, { headers: this.authHeaders() }));
      return true;
    } catch {
      return false;
    }
  }
}
