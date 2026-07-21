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
  PoDialogService
} from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-opcionais',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './opcionais.html',
})
export class OpcionaisComponent implements OnInit {
  @ViewChild('opcionalModal', { static: true }) opcionalModal!: PoModalComponent;
  @ViewChild('opcionalForm', { static: false }) opcionalForm!: any;

  opcionais: any[] = [];
  page: number = 1;
  pageSize: number = 20;
  hasNext: boolean = false;
  loadingShowMore: boolean = false;
  currentFilter: string = '';
  isLoading: boolean = true;
  isLoadingSave: boolean = false;

  opcional: any = { nome: '' };

  public readonly columns: PoTableColumn[] = [
    { property: 'nome', label: 'Opcional' }
  ];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly filterSettings: any = {
    action: this.filterOpcionais.bind(this),
    placeholder: 'Pesquisar opcionais...'
  };

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
    await this.load();
    this.isLoading = false;
  }

  async load() {
    this.page = 1;
    this.opcionais = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('opcionais', {
        page: this.page,
        limit: this.pageSize,
        filter: this.currentFilter
      });

      if (response && response.items) {
        this.opcionais = [...this.opcionais, ...response.items];
        this.hasNext = response.hasNext;
      } else {
        this.opcionais = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterOpcionais(filter: string) {
    this.currentFilter = filter || '';
    this.load();
  }

  openNew() {
    this.opcional = { nome: '' };
    this.opcionalModal.open();
  }

  openEdit(item: any) {
    this.opcional = { ...item };
    this.opcionalModal.open();
  }

  async save() {
    if (this.opcionalForm && this.opcionalForm.invalid) {
      Object.values(this.opcionalForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    this.isLoadingSave = true;
    try {
      if (this.opcional.id) {
        await this.db.update('opcionais', this.opcional.id, this.opcional);
        this.poNotification.success('Opcional atualizado!');
      } else {
        await this.db.insert('opcionais', this.opcional);
        this.poNotification.success('Opcional cadastrado!');
      }
      this.opcionalModal.close();
      await this.load();
    } catch (error) {
      this.poNotification.error('Erro ao salvar opcional.');
    } finally {
      this.isLoadingSave = false;
    }
  }

  delete(item: any) {
    this.poDialog.confirm({
      title: 'Excluir Opcional',
      message: `Deseja excluir "${item.nome}"?`,
      confirm: async () => {
        this.isLoading = true;
        try {
          await this.db.delete('opcionais', item.id);
          this.poNotification.warning('Opcional excluído!');
          await this.load();
        } catch (error) {
          this.poNotification.error('Erro ao excluir opcional.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }
}
