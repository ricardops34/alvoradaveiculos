import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PoModule,
  PoPageAction,
  PoTableColumn,
  PoTableAction,
  PoModalComponent,
  PoNotificationService,
  PoSelectOption,
  PoDialogService
} from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-fichas-tecnicas',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './fichas-tecnicas.html',
})
export class FichasTecnicasComponent implements OnInit {
  @ViewChild('fichaModal', { static: true }) fichaModal!: PoModalComponent;
  @ViewChild('fichaForm', { static: false }) fichaForm!: any;

  fichas: any[] = [];
  page = 1;
  pageSize = 20;
  hasNext = false;
  loadingShowMore = false;
  isLoading = true;
  isLoadingSave = false;

  ficha: any = this.getEmptyFicha();
  marcaSelecionada: number | null = null;

  allModelos: any[] = [];
  marcasOptions: PoSelectOption[] = [];
  modelosOptions: PoSelectOption[] = [];

  public readonly columns: PoTableColumn[] = [
    { property: 'marca_nome', label: 'Marca' },
    { property: 'modelo_nome', label: 'Modelo' },
    { property: 'motor', label: 'Motor' },
    { property: 'cambio', label: 'Câmbio' }
  ];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'an an-pencil-simple' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'an an-trash', type: 'danger' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    private poDialog: PoDialogService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await this.db.init();
    const [marcasRes, modelosRes] = await Promise.all([
      this.db.getAll('marcas', { limit: 1000000 }),
      this.db.getAll('modelos', { limit: 1000000 })
    ]);
    const marcas = marcasRes?.items || marcasRes || [];
    this.allModelos = modelosRes?.items || modelosRes || [];
    this.marcasOptions = marcas.map((m: any) => ({ label: m.nome, value: m.id }));
    await this.load();
    this.isLoading = false;
  }

  async load() {
    this.page = 1;
    this.fichas = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('fichas-tecnicas', { page: this.page, limit: this.pageSize });
      if (response && response.items) {
        this.fichas = [...this.fichas, ...response.items];
        this.hasNext = response.hasNext;
      } else {
        this.fichas = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  updateModelosOptions() {
    this.modelosOptions = this.marcaSelecionada
      ? this.allModelos.filter((m: any) => m.marca_id === this.marcaSelecionada).map((m: any) => ({ label: m.nome, value: m.id }))
      : [];
  }

  getEmptyFicha() {
    return {
      modelo_id: null, motor: '', potencia: '', torque: '', cambio: '', tracao: '',
      consumo_cidade: '', consumo_estrada: '', porta_malas: '', tanque: '', observacoes: ''
    };
  }

  openNew() {
    this.ficha = this.getEmptyFicha();
    this.marcaSelecionada = null;
    this.modelosOptions = [];
    this.fichaModal.open();
  }

  openEdit(item: any) {
    this.ficha = { ...item };
    const modelo = this.allModelos.find((m: any) => m.id === item.modelo_id);
    this.marcaSelecionada = modelo?.marca_id || null;
    this.updateModelosOptions();
    this.fichaModal.open();
  }

  async save() {
    if (this.fichaForm && this.fichaForm.invalid) {
      Object.values(this.fichaForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    this.isLoadingSave = true;
    try {
      if (this.ficha.id) {
        await this.db.update('fichas-tecnicas', this.ficha.id, this.ficha);
        this.poNotification.success('Ficha técnica atualizada!');
      } else {
        await this.db.insert('fichas-tecnicas', this.ficha);
        this.poNotification.success('Ficha técnica cadastrada!');
      }
      this.fichaModal.close();
      await this.load();
    } catch (error) {
      this.poNotification.error('Erro ao salvar ficha técnica.');
    } finally {
      this.isLoadingSave = false;
    }
  }

  delete(item: any) {
    this.poDialog.confirm({
      title: 'Excluir Ficha Técnica',
      message: `Deseja excluir a ficha técnica de "${item.modelo_nome}"?`,
      confirm: async () => {
        this.isLoading = true;
        try {
          await this.db.delete('fichas-tecnicas', item.id);
          this.poNotification.warning('Ficha técnica excluída!');
          await this.load();
        } catch (error) {
          this.poNotification.error('Erro ao excluir ficha técnica.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }
}
