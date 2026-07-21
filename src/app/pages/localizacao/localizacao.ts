import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoModule, PoTableColumn, PoNotificationService, PoSelectOption } from '@po-ui/ng-components';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-localizacao',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './localizacao.html',
})
export class LocalizacaoComponent implements OnInit {
  sincronizando = false;
  totalEstados = 0;
  totalMunicipios = 0;

  municipios: any[] = [];
  page: number = 1;
  pageSize: number = 20;
  hasNext: boolean = false;
  loadingShowMore: boolean = false;
  isLoading: boolean = true;

  filtroNome: string = '';
  filtroEstadoId: number | null = null;
  estadoOptions: PoSelectOption[] = [];

  public readonly municipiosColumns: PoTableColumn[] = [
    { property: 'nome', label: 'Município' },
    { property: 'estado_sigla', label: 'UF', width: '80px' },
    { property: 'codigo_ibge', label: 'Código IBGE', width: '120px' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await this.carregarEstados();
    await this.load();
    this.isLoading = false;
  }

  async carregarEstados() {
    const response = await this.db.getAll('localizacao/estados', {});
    const estados = response?.items || response || [];
    this.totalEstados = estados.length;
    this.estadoOptions = estados.map((e: any) => ({ label: `${e.sigla} - ${e.nome}`, value: e.id }));
  }

  async load() {
    this.page = 1;
    this.municipios = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const params: any = { page: this.page, limit: this.pageSize };
      if (this.filtroNome) params.filter = this.filtroNome;
      if (this.filtroEstadoId) params.estado_id = this.filtroEstadoId;

      const response = await this.db.getAll('localizacao/municipios', params);
      const items = response?.items || response || [];
      this.municipios = [...this.municipios, ...items];
      this.hasNext = response?.hasNext || false;
      this.totalMunicipios = response?.total ?? this.municipios.length;
    } finally {
      this.loadingShowMore = false;
    }
  }

  async sincronizarIbge() {
    this.sincronizando = true;
    try {
      const response: any = await firstValueFrom(this.db.http.post('/api/localizacao/sincronizar-ibge', {}));
      this.poNotification.success(response.message || 'Sincronização concluída!');
      await this.carregarEstados();
      await this.load();
    } catch (e: any) {
      this.poNotification.error(e?.error?.error || 'Erro ao sincronizar com o IBGE.');
    } finally {
      this.sincronizando = false;
    }
  }
}
