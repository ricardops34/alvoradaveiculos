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

  banks: any[] = [];
  bank: any = { codigo: '', nome: '', agencia: '', conta: '', tipo: 'Corrente', limite_credito: 0, saldo_inicial: 0 };
  isEditing: boolean = false;

  public readonly actions: PoPageAction[] = [
    { label: 'Novo Banco', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

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
    await this.db.init();
    this.loadBanks();
  }

  loadBanks() {
    this.banks = this.db.getAll('bancos');
    console.log('Bancos carregados:', this.banks);
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

  save() {
    if (this.isEditing) {
      this.db.update('bancos', this.bank.id, this.bank);
      this.poNotification.success('Banco atualizado com sucesso!');
    } else {
      this.db.insert('bancos', this.bank);
      this.poNotification.success('Banco cadastrado com sucesso!');
    }
    this.loadBanks();
    this.bankModal.close();
  }

  delete(bank: any) {
    this.db.delete('bancos', bank.id);
    this.poNotification.warning('Banco excluído!');
    this.loadBanks();
  }
}