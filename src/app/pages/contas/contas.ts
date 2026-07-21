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
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../../services/database';
import { QuickAddComponent } from '../../components/quick-add/quick-add.component';
import { PessoasLookupService, BancosLookupService, CentrosCustoLookupService, VeiculosLookupService } from '../../services/lookups';

@Component({
  selector: 'app-contas',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule, QuickAddComponent],
  templateUrl: './contas.html',
})
export class ContasComponent implements OnInit {
  @ViewChild('contaModal', { static: true }) contaModal!: PoModalComponent;
  @ViewChild('baixaModal', { static: true }) baixaModal!: PoModalComponent;
  @ViewChild('advancedFilterModal', { static: true }) advancedFilterModal!: PoModalComponent;
  @ViewChild('contaForm', { static: false }) contaForm!: any;
  @ViewChild('baixaForm', { static: false }) baixaForm!: any;
  @ViewChild('appQuickAdd') appQuickAdd!: QuickAddComponent;

  contas: any[] = [];
  page: number = 1;
  pageSize: number = 20;
  hasNext: boolean = false;
  loadingShowMore: boolean = false;
  isLoading: boolean = true;
  isLoadingSave: boolean = false;
  currentQuickAddField: string = '';
  currentFilter: string = '';

  conta: any = this.getEmptyConta();
  baixaData: any = { banco_id: null, centro_custo_id: null, data_pagamento: '' };
  contaSelecionada: any = null;

  filtro = { tipo: '', status: 'Pendente' };

  public readonly tipoOptions: PoSelectOption[] = [
    { label: 'Pagar', value: 'Pagar' },
    { label: 'Receber', value: 'Receber' }
  ];

  public readonly tipoFiltroOptions: PoSelectOption[] = [
    { label: 'Todos', value: '' },
    { label: 'Pagar', value: 'Pagar' },
    { label: 'Receber', value: 'Receber' }
  ];

  public readonly statusFiltroOptions: PoSelectOption[] = [
    { label: 'Pendente', value: 'Pendente' },
    { label: 'Pago', value: 'Pago' },
    { label: 'Todos', value: '' }
  ];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly filterSettings: any = {
    action: this.filterContas.bind(this),
    advancedAction: this.openAdvancedFilter.bind(this),
    placeholder: 'Pesquisar contas...'
  };

  public disclaimerGroup: any = {
    title: 'Filtros',
    disclaimers: [{ label: 'Status: Pendente', property: 'status', value: 'Pendente' }],
    change: this.onChangeDisclaimer.bind(this)
  };

  public readonly columns: PoTableColumn[] = [
    { property: 'tipo', label: 'Tipo', type: 'label', labels: [
      { value: 'Pagar', color: 'color-07', label: 'Pagar' },
      { value: 'Receber', color: 'color-10', label: 'Receber' }
    ]},
    { property: 'descricao', label: 'Descrição' },
    { property: 'pessoa_nome', label: 'Pessoa' },
    { property: 'veiculo_placa', label: 'Veículo' },
    { property: 'valor', label: 'Valor', type: 'currency', format: 'BRL' },
    { property: 'data_vencimento', label: 'Vencimento', type: 'date' },
    { property: 'status', label: 'Status', type: 'label', labels: [
      { value: 'Pendente', color: 'color-08', label: 'Pendente' },
      { value: 'Pago', color: 'color-10', label: 'Pago' },
      { value: 'Cancelado', color: 'color-07', label: 'Cancelado' }
    ]}
  ];

  public readonly tableActions: PoTableAction[] = [
    { label: 'Dar Baixa', action: this.openBaixa.bind(this), icon: 'an an-check-circle', visible: (row: any) => row.status === 'Pendente' },
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit', visible: (row: any) => row.status === 'Pendente' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger', visible: (row: any) => row.status === 'Pendente' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    private poDialog: PoDialogService,
    public pessoasLookup: PessoasLookupService,
    public bancosLookup: BancosLookupService,
    public centrosCustoLookup: CentrosCustoLookupService,
    public veiculosLookup: VeiculosLookupService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await this.db.init();
    await this.load();
    this.isLoading = false;
  }

  async load() {
    this.page = 1;
    this.contas = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('contas', {
        page: this.page,
        limit: this.pageSize,
        tipo: this.filtro.tipo,
        status: this.filtro.status,
        filter: this.currentFilter
      });

      if (response && response.items) {
        this.contas = [...this.contas, ...response.items];
        this.hasNext = response.hasNext;
      } else {
        this.contas = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterContas(filter: string) {
    this.currentFilter = filter || '';
    this.load();
  }

  openAdvancedFilter() {
    this.advancedFilterModal.open();
  }

  applyFilters() {
    const disclaimers: any[] = [];
    if (this.filtro.tipo) disclaimers.push({ label: 'Tipo: ' + this.filtro.tipo, property: 'tipo', value: this.filtro.tipo });
    if (this.filtro.status) disclaimers.push({ label: 'Status: ' + this.filtro.status, property: 'status', value: this.filtro.status });
    this.disclaimerGroup.disclaimers = disclaimers;
    this.advancedFilterModal.close();
    this.load();
  }

  onChangeDisclaimer(disclaimers: any[]) {
    const properties = disclaimers.map(d => d.property);
    if (!properties.includes('tipo')) this.filtro.tipo = '';
    if (!properties.includes('status')) this.filtro.status = '';
    this.load();
  }

  getEmptyConta() {
    return {
      tipo: 'Receber',
      descricao: '',
      valor: 0,
      data_emissao: new Date().toISOString().split('T')[0],
      data_vencimento: '',
      pessoa_id: null,
      veiculo_id: null,
      centro_custo_id: null
    };
  }

  openNew() {
    this.conta = this.getEmptyConta();
    this.contaModal.open();
  }

  openEdit(conta: any) {
    this.conta = { ...conta };
    this.contaModal.open();
  }

  async save() {
    if (this.contaForm && this.contaForm.invalid) {
      Object.values(this.contaForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    if (this.conta.veiculo_id && !this.conta.centro_custo_id) {
      this.poNotification.warning('Contas vinculadas a um veículo exigem um Centro de Custo.');
      return;
    }

    this.isLoadingSave = true;
    try {
      if (this.conta.id) {
        await this.db.update('contas', this.conta.id, this.conta);
        this.poNotification.success('Conta atualizada!');
      } else {
        await this.db.insert('contas', this.conta);
        this.poNotification.success('Conta cadastrada!');
      }
      this.contaModal.close();
      await this.load();
    } catch (error) {
      this.poNotification.error('Erro ao salvar conta.');
    } finally {
      this.isLoadingSave = false;
    }
  }

  delete(conta: any) {
    this.poDialog.confirm({
      title: 'Excluir Conta',
      message: `Deseja excluir "${conta.descricao}"?`,
      confirm: async () => {
        this.isLoading = true;
        try {
          await this.db.delete('contas', conta.id);
          this.poNotification.warning('Conta excluída!');
          await this.load();
        } catch (error) {
          this.poNotification.error('Erro ao excluir conta.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  openBaixa(conta: any) {
    this.contaSelecionada = conta;
    this.baixaData = {
      banco_id: null,
      centro_custo_id: conta.centro_custo_id || null,
      data_pagamento: new Date().toISOString().split('T')[0]
    };
    this.baixaModal.open();
  }

  async confirmarBaixa() {
    if (this.baixaForm && this.baixaForm.invalid) {
      Object.values(this.baixaForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Informe a conta bancária/caixa e o centro de custo.');
      return;
    }

    try {
      await firstValueFrom(this.db.http.post<any>(`/api/contas/${this.contaSelecionada.id}/baixar`, this.baixaData));
      this.poNotification.success('Baixa realizada com sucesso!');
      this.baixaModal.close();
      await this.load();
    } catch (error: any) {
      this.poNotification.error(error?.error?.error || 'Erro ao dar baixa na conta.');
    }
  }

  handleQuickAdd(event: any, field: string) {
    if (field === 'pessoa_id') this.conta.pessoa_id = event.id;
    if (field === 'centro_custo_id') this.conta.centro_custo_id = event.id;
    if (field === 'baixa_banco_id') this.baixaData.banco_id = event.id;
    if (field === 'baixa_centro_custo_id') this.baixaData.centro_custo_id = event.id;
  }
}
