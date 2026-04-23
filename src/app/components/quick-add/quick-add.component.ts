import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoModule, PoModalComponent, PoNotificationService } from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';

export type QuickAddType = 'pessoa' | 'banco' | 'centro_custo' | 'perfil' | 'marcas' | 'modelos' | 'pessoas' | 'bancos' | 'centros-custo';

@Component({
  selector: 'app-quick-add',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './quick-add.component.html'
})
export class QuickAddComponent {
  @ViewChild('quickAddModal', { static: true }) quickAddModal!: PoModalComponent;
  @ViewChild('quickAddForm', { static: false }) quickAddForm!: any;
  @Output() onAdded = new EventEmitter<any>();

  type: QuickAddType = 'pessoa';
  title: string = '';
  data: any = {};
  marcasOptions: any[] = [];
  
  tipoVeiculoOptions = [
    { label: 'Carro', value: 'Carro' },
    { label: 'Moto', value: 'Moto' },
    { label: 'Caminhão', value: 'Caminhão' },
    { label: 'Náutica', value: 'Náutica' }
  ];

  constructor(private db: DatabaseService, private poNotification: PoNotificationService) {}

  open(type: QuickAddType) {
    this.type = type;
    this.data = {};
    
    if (type === 'pessoa' || type === 'pessoas') {
      this.title = 'Novo Fornecedor / Cliente';
      this.data = { nome: '', cpf_cnpj: '', is_cliente: true, is_fornecedor: true };
    } else if (type === 'banco' || type === 'bancos') {
      this.title = 'Nova Conta Bancária';
      this.data = { nome: '', codigo: '', agencia: '', conta: '', tipo: 'Corrente', saldo_inicial: 0 };
    } else if (type === 'centro_custo' || type === 'centros-custo') {
      this.title = 'Novo Centro de Custo';
      this.data = { nome: '', codigo: '', tipo: 'Despesa' };
    } else if (type === 'perfil') {
      this.title = 'Novo Perfil';
      this.data = { nome: '', rotinas: [] };
    } else if (type === 'marcas') {
      this.title = 'Nova Marca';
      this.data = { nome: '', tipo_veiculo: 'Carro' };
    } else if (type === 'modelos') {
      this.title = 'Novo Modelo';
      this.data = { nome: '', marca_id: null, tipo_veiculo: 'Carro' };
      this.db.getAll('marcas').then(m => {
        this.marcasOptions = m.map((i: any) => ({ label: i.nome, value: i.id }));
      });
    }

    this.quickAddModal.open();
  }

  async save() {
    if (this.quickAddForm && this.quickAddForm.invalid) {
      Object.values(this.quickAddForm.controls).forEach((c: any) => {
        c.markAsTouched();
        c.markAsDirty();
      });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    try {
      let table = '';
      if (this.type === 'pessoa' || this.type === 'pessoas') table = 'pessoas';
      if (this.type === 'banco' || this.type === 'bancos') table = 'bancos';
      if (this.type === 'centro_custo' || this.type === 'centros-custo') table = 'centros_custo';
      if (this.type === 'perfil') table = 'perfis';
      if (this.type === 'marcas') table = 'marcas';
      if (this.type === 'modelos') table = 'modelos';

      const result = await this.db.insert(table, this.data);
      this.poNotification.success(`${this.title} cadastrado com sucesso!`);
      this.quickAddModal.close();
      this.onAdded.emit(result);
    } catch (e) {
      this.poNotification.error('Erro ao salvar o cadastro.');
      console.error(e);
    }
  }
}
