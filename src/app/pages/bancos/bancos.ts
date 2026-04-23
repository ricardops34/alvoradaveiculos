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
  selector: 'app-bancos',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './bancos.html',
})
export class BancosComponent implements OnInit {
  @ViewChild('bankModal', { static: true }) bankModal!: PoModalComponent;
  @ViewChild('bankForm', { static: false }) bankForm!: any;

  banks: any[] = [];
  allBanks: any[] = [];
  filteredBanks: any[] = [];
  isLoading: boolean = true;
  
  hasNext: boolean = false;
  page: number = 1;
  pageSize: number = 20;
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
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await this.db.init();
    await this.loadBanks();
    this.isLoading = false;
  }

  async loadBanks() {
    this.allBanks = await this.db.getAll('bancos');
    this.filteredBanks = [...this.allBanks];
    this.page = 1;
    this.applyPagination(true);
  }

  filterBanks(filter: string) {
    if (!filter) {
      this.filteredBanks = [...this.allBanks];
    } else {
      const searchTerm = filter.toLowerCase();
      this.filteredBanks = this.allBanks.filter(b => 
        b.nome.toLowerCase().includes(searchTerm) ||
        b.codigo?.toLowerCase().includes(searchTerm) ||
        b.conta?.toLowerCase().includes(searchTerm)
      );
    }
    this.page = 1;
    this.applyPagination(true);
  }

  applyPagination(reset: boolean = true) {
    if (reset) {
      this.banks = [];
    }
    const startIndex = (this.page - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const nextItems = this.filteredBanks.slice(startIndex, endIndex);
    
    this.banks = [...this.banks, ...nextItems];
    this.hasNext = endIndex < this.filteredBanks.length;
  }

  showMore() {
    this.page++;
    this.applyPagination(false);
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

    if (this.isEditing) {
      await this.db.update('bancos', this.bank.id, this.bank);
      this.poNotification.success('Banco atualizado com sucesso!');
    } else {
      await this.db.insert('bancos', this.bank);
      this.poNotification.success('Banco cadastrado com sucesso!');
    }
    await this.loadBanks();
    this.bankModal.close();
  }

  async delete(bank: any) {
    await this.db.delete('bancos', bank.id);
    this.poNotification.warning('Banco excluído!');
    await this.loadBanks();
  }
}