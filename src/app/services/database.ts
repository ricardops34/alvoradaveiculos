import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  public apiUrl = '/api';
  private initialized = false;

  constructor(public http: HttpClient) {}

  async init() {
    if (this.initialized) return;
    this.initialized = true;
  }

  private getEndpoint(table: string): string {
    const endpoints: { [key: string]: string } = {
      'perfis': '/api/perfis',
      'bancos': '/api/bancos',
      'pessoas': '/api/pessoas',
      'centros_custo': '/api/centros-custo',
      'veiculos': '/api/veiculos',
      'movimentos': '/api/movimentos',
      'usuarios': '/api/usuarios'
    };
    return endpoints[table] || `/api/${table}`;
  }

  async getAll(table: string, params?: any): Promise<any> {
    try {
      const endpoint = this.getEndpoint(table);
      const response: any = await firstValueFrom(this.http.get<any>(endpoint, { params }));
      // Se a resposta for um objeto com a chave 'items', retornamos o objeto todo para o componente tratar a paginação
      // Senão, retornamos apenas o array (compatibilidade com rotas antigas)
      return response;
    } catch (err) {
      console.error(`Erro ao buscar ${table}:`, err);
      return [];
    }
  }

  async getById(table: string, id: string | number): Promise<any> {
    try {
      const endpoint = this.getEndpoint(table);
      return await firstValueFrom(this.http.get<any>(`${endpoint}/${id}`));
    } catch (err) {
      console.error(`Erro ao buscar ${table} ${id}:`, err);
      return null;
    }
  }

  async insert(table: string, record: any): Promise<any> {
    try {
      const endpoint = this.getEndpoint(table);
      return await firstValueFrom(this.http.post<any>(endpoint, record));
    } catch (err) {
      console.error(`Erro ao inserir em ${table}:`, err);
      throw err;
    }
  }

  async update(table: string, id: number, record: any): Promise<any> {
    try {
      const endpoint = this.getEndpoint(table);
      return await firstValueFrom(this.http.put<any>(`${endpoint}/${id}`, record));
    } catch (err) {
      console.error(`Erro ao atualizar ${table}:`, err);
      throw err;
    }
  }

  async delete(table: string, id: number): Promise<void> {
    try {
      const endpoint = this.getEndpoint(table);
      await firstValueFrom(this.http.delete(`${endpoint}/${id}`));
    } catch (err) {
      console.error(`Erro ao excluir de ${table}:`, err);
      throw err;
    }
  }

  // Método específico para dashboard
  async getDashboardMetrics(): Promise<any> {
    try {
      return await firstValueFrom(this.http.get<any>('/api/dashboard'));
    } catch (err) {
      console.error('Erro ao buscar métricas do dashboard:', err);
      return null;
    }
  }

  // Método para atualizar tema do usuário
  async updateUserTheme(userId: string, theme: string): Promise<void> {
    try {
      await firstValueFrom(this.http.patch(`/api/usuarios/${userId}/theme`, { theme }));
    } catch (err) {
      console.error('Erro ao atualizar tema:', err);
    }
  }
}