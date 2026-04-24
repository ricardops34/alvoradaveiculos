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
  selector: 'app-bancos',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './bancos.html',
})
export class BancosComponent implements OnInit {
  @ViewChild('bankModal', { static: true }) bankModal!: PoModalComponent;
  @ViewChild('bankForm', { static: false }) bankForm!: any;

  banks: any[] = [];
  
  // Paginação no servidor (Priorizado)
  page: number = 1;
  pageSize: number = 20;
  hasNext: boolean = false;
  loadingShowMore: boolean = false;
  currentFilter: string = '';
  isLoading: boolean = true;
  isLoadingSave: boolean = false;

  bank: any = { codigo: '', nome: '', agencia: '', conta: '', tipo: 'Corrente', limite_credito: 0, saldo_inicial: 0 };
  isEditing: boolean = false;

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly filterSettings: any = {
    action: this.filterBanks.bind(this),
    placeholder: 'Pesquisar bancos...'
  };

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'an an-pencil-simple' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'an an-trash', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'codigo', label: 'Código', width: '8%' },
    { property: 'nome', label: 'Banco' },
    { property: 'agencia', label: 'Agência' },
    { property: 'conta', label: 'Conta' },
    { property: 'saldo_inicial', label: 'Saldo Inicial', type: 'currency', format: 'BRL' },
    { property: 'limite_credito', label: 'Limite', type: 'currency', format: 'BRL' },
    { property: 'tipo', label: 'Tipo', type: 'label', labels: [
      { value: 'Corrente', color: 'color-10', label: 'Corrente' },
      { value: 'Poupança', color: 'color-11', label: 'Poupança' }
    ]}
  ];

  public readonly typeOptions: PoSelectOption[] = [
    { label: 'Corrente', value: 'Corrente' },
    { label: 'Poupança', value: 'Poupança' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    private poDialog: PoDialogService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await this.db.init();
    await this.loadBanks();
    this.isLoading = false;
  }

  async loadBanks() {
    this.page = 1;
    this.banks = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('bancos', { 
        page: this.page, 
        limit: this.pageSize,
        filter: this.currentFilter 
      });

      if (response && response.items) {
        this.banks = [...this.banks, ...response.items];
        this.hasNext = response.hasNext;
      } else {
        this.banks = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterBanks(filter: string) {
    this.currentFilter = filter || '';
    this.loadBanks();
  }

  openNew() {
    this.isEditing = false;
    this.bank = { codigo: '', nome: '', agencia: '', conta: '', tipo: 'Corrente', limite_credito: 0, saldo_inicial: 0 };
    this.bankModal.open();
  }

  openEdit(bank: any) {
    this.isEditing = true;
    this.bank = { ...bank, limite_credito: bank.limite_credito || 0 };
    this.bankModal.open();
  }

  async save() {
    if (this.bankForm && this.bankForm.invalid) {
      Object.values(this.bankForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    this.isLoadingSave = true;
    try {
      if (this.isEditing) {
        await this.db.update('bancos', this.bank.id!, this.bank);
        this.poNotification.success('Conta atualizada!');
      } else {
        await this.db.insert('bancos', this.bank);
        this.poNotification.success('Conta cadastrada!');
      }
      await this.loadBanks();
      this.bankModal.close();
    } catch (error) {
      this.poNotification.error('Erro ao salvar conta.');
    } finally {
      this.isLoadingSave = false;
    }
  }

  delete(bank: any) {
    this.poDialog.confirm({
      title: 'Excluir Conta',
      message: `Tem certeza que deseja excluir a conta ${bank.nome}?`,
      confirm: async () => {
        this.isLoading = true;
        try {
          await this.db.delete('bancos', bank.id!);
          this.poNotification.warning('Conta excluída!');
          await this.loadBanks();
        } catch (error) {
          this.poNotification.error('Erro ao excluir conta.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }
}