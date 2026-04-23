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
  PoSelectOption 
} from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-centros-custo',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './centros-custo.html',
})
export class CentrosCustoComponent implements OnInit {
  @ViewChild('ccModal', { static: true }) ccModal!: PoModalComponent;
  @ViewChild('ccForm', { static: false }) ccForm!: any;

  costCenters: any[] = [];
  page: number = 1;
  hasNext: boolean = false;
  loadingShowMore: boolean = false;
  currentFilter: string = '';
  cc: any = { codigo: '', nome: '', tipo: 'Despesa' };
  isEditing: boolean = false;

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly filterSettings: any = {
    action: this.filterCC.bind(this),
    placeholder: 'Pesquisar centros de custo...'
  };

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'codigo', label: 'Código', width: '15%' },
    { property: 'nome', label: 'Nome' },
    { property: 'tipo', label: 'Tipo', type: 'label', labels: [
      { value: 'Receita', color: 'color-10', label: 'Receita' },
      { value: 'Despesa', color: 'color-07', label: 'Despesa' },
      { value: 'Investimento', color: 'color-08', label: 'Investimento' }
    ]}
  ];

  public readonly typeOptions: PoSelectOption[] = [
    { label: 'Receita', value: 'Receita' },
    { label: 'Despesa', value: 'Despesa' },
    { label: 'Investimento', value: 'Investimento' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    await this.db.init();
    this.loadCC();
  }

  async loadCC() {
    this.page = 1;
    this.costCenters = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('centros_custo', { 
        page: this.page, 
        limit: 20,
        filter: this.currentFilter 
      });

      if (response && response.items) {
        this.costCenters = [...this.costCenters, ...response.items];
        this.hasNext = response.hasNext;
      } else {
        this.costCenters = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterCC(filter: string) {
    this.currentFilter = filter;
    this.loadCC();
  }

  openNew() {
    this.isEditing = false;
    this.cc = { codigo: '', nome: '', tipo: 'Despesa' };
    this.ccModal.open();
  }

  openEdit(cc: any) {
    this.isEditing = true;
    this.cc = { ...cc };
    this.ccModal.open();
  }

  async save() {
    if (this.ccForm && this.ccForm.invalid) {
      Object.values(this.ccForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    if (this.isEditing) {
      await this.db.update('centros_custo', this.cc.id, this.cc);
      this.poNotification.success('Centro de custo atualizado!');
    } else {
      await this.db.insert('centros_custo', this.cc);
      this.poNotification.success('Centro de custo cadastrado!');
    }
    await this.loadCC();
    this.ccModal.close();
  }

  async delete(cc: any) {
    await this.db.delete('centros_custo', cc.id);
    this.poNotification.warning('Centro de custo excluído!');
    await this.loadCC();
  }
}