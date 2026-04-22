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
import { Movement } from '../../types/movement';

@Component({
  selector: 'app-movimentos',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './movimentos.html',
})
export class MovimentosComponent implements OnInit {
  @ViewChild('movementModal', { static: true }) movementModal!: PoModalComponent;
  @ViewChild('movementForm', { static: false }) movementForm!: any;

  movements: any[] = [];
  movement: Movement = this.getEmptyMovement();
  isEditing: boolean = false;

  banks: PoSelectOption[] = [];
  costCenters: PoSelectOption[] = [];
  people: PoSelectOption[] = [];
  vehicles: PoSelectOption[] = [];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo Lançamento', action: this.openNew.bind(this), icon: 'po-icon-plus' }
  ];

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'data', label: 'Data', type: 'date', format: 'dd/MM/yyyy' },
    { property: 'banco_nome', label: 'Banco' },
    { property: 'tipo', label: 'Tipo', type: 'label', labels: [
      { value: 'Crédito', color: 'color-10', label: 'Crédito' },
      { value: 'Débito', color: 'color-07', label: 'Débito' }
    ]},
    { property: 'historico', label: 'Histórico' },
    { property: 'valor', label: 'Valor', type: 'currency', format: 'BRL' },
    { property: 'centro_custo_nome', label: 'Centro de Custo' },
    { property: 'pessoa_nome', label: 'Pessoa' },
    { property: 'veiculo_placa', label: 'Veículo' }
  ];

  public readonly typeOptions: PoSelectOption[] = [
    { label: 'Crédito (Entrada)', value: 'Crédito' },
    { label: 'Débito (Saída)', value: 'Débito' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    await this.db.init();
    this.loadOptions();
    this.loadMovements();
  }

  async loadOptions() {
    const banks = await this.db.getAll('bancos');
    const costCenters = await this.db.getAll('centros_custo');
    const people = await this.db.getAll('pessoas');
    const vehicles = await this.db.getAll('veiculos');
    this.banks = banks.map(b => ({ label: b.nome, value: b.id }));
    this.costCenters = costCenters.map(c => ({ label: c.nome, value: c.id }));
    this.people = people.map(p => ({ label: p.nome, value: p.id }));
    this.vehicles = vehicles.map(v => ({ label: `${v.marca} ${v.modelo} (${v.placa})`, value: v.id }));
  }

  async loadMovements() {
    const rawMovements = await this.db.getAll('movimentos');
    const banks = await this.db.getAll('bancos');
    const centers = await this.db.getAll('centros_custo');
    const people = await this.db.getAll('pessoas');
    const vehicles = await this.db.getAll('veiculos');

    this.movements = rawMovements.map(m => ({
      ...m,
      banco_nome: banks.find(b => b.id === m.banco_id)?.nome,
      centro_custo_nome: centers.find(c => c.id === m.centro_custo_id)?.nome,
      pessoa_nome: people.find(p => p.id === m.pessoa_id)?.nome || '-',
      veiculo_placa: vehicles.find(v => v.id === m.veiculo_id)?.placa || '-'
    }));
  }

  getEmptyMovement(): Movement {
    return {
      data: new Date().toISOString().split('T')[0],
      banco_id: 0,
      tipo: 'Crédito',
      historico: '',
      valor: 0,
      centro_custo_id: 0
    };
  }

  openNew() {
    this.isEditing = false;
    this.movement = this.getEmptyMovement();
    this.movementModal.open();
  }

  openEdit(movement: any) {
    this.isEditing = true;
    this.movement = { ...movement };
    this.movementModal.open();
  }

  async save() {
    if (this.movementForm && this.movementForm.invalid) {
      Object.values(this.movementForm.controls).forEach((c: any) => c.markAsTouched());
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    // Ensure value sign matches type
    if (this.movement.tipo === 'Débito' && this.movement.valor > 0) {
      this.movement.valor *= -1;
    } else if (this.movement.tipo === 'Crédito' && this.movement.valor < 0) {
      this.movement.valor *= -1;
    }

    if (this.isEditing) {
      await this.db.update('movimentos', this.movement.id!, this.movement);
      this.poNotification.success('Lançamento atualizado!');
    } else {
      await this.db.insert('movimentos', this.movement);
      this.poNotification.success('Lançamento realizado!');
    }
    await this.loadMovements();
    this.movementModal.close();
  }

  async delete(movement: any) {
    await this.db.delete('movimentos', movement.id!);
    this.poNotification.warning('Lançamento excluído!');
    await this.loadMovements();
  }
}