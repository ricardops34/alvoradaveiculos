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
import { Vehicle } from '../../types/vehicle';

@Component({
  selector: 'app-veiculos',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './veiculos.html',
})
export class VeiculosComponent implements OnInit {
  @ViewChild('vehicleModal', { static: true }) vehicleModal!: PoModalComponent;
  @ViewChild('statementModal', { static: true }) statementModal!: PoModalComponent;

  vehicles: any[] = [];
  vehicle: Vehicle = this.getEmptyVehicle();
  isEditing: boolean = false;

  peopleOptions: PoSelectOption[] = [];
  supplierOptions: PoSelectOption[] = [];
  clientOptions: PoSelectOption[] = [];

  // Statement data
  selectedVehicleStatement: any[] = [];
  vehicleSummary = { totalExpenses: 0, totalRevenue: 0, profit: 0 };

  public readonly actions: PoPageAction[] = [
    { label: 'Novo Veículo', action: this.openNew.bind(this), icon: 'po-icon-plus' }
  ];

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Extrato/Custos', action: this.openStatement.bind(this), icon: 'po-icon-finance-secure' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'placa', label: 'Placa' },
    { property: 'marca', label: 'Marca' },
    { property: 'modelo', label: 'Modelo' },
    { property: 'ano_modelo', label: 'Ano/Mod', type: 'number' },
    { property: 'fornecedor_nome', label: 'Fornecedor' },
    { property: 'cliente_nome', label: 'Cliente' },
    { property: 'valor_compra', label: 'Vlr. Compra', type: 'currency', format: 'BRL' },
    { property: 'valor_venda', label: 'Vlr. Venda', type: 'currency', format: 'BRL' },
    { property: 'status', label: 'Status', type: 'label', labels: [
      { value: 'Estoque', color: 'color-10', label: 'Estoque' },
      { value: 'Vendido', color: 'color-11', label: 'Vendido' },
      { value: 'Manutenção', color: 'color-07', label: 'Manutenção' },
      { value: 'Preparação', color: 'color-01', label: 'Preparação' }
    ]}
  ];

  public readonly statementColumns: PoTableColumn[] = [
    { property: 'data', label: 'Data', type: 'date' },
    { property: 'historico', label: 'Histórico' },
    { property: 'centro_custo_nome', label: 'Centro de Custo' },
    { property: 'valor', label: 'Valor', type: 'currency', format: 'BRL' }
  ];

  public readonly statusOptions: PoSelectOption[] = [
    { label: 'Estoque', value: 'Estoque' },
    { label: 'Vendido', value: 'Vendido' },
    { label: 'Manutenção', value: 'Manutenção' },
    { label: 'Preparação', value: 'Preparação' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    await this.db.init();
    this.loadPeopleOptions();
    this.loadVehicles();
  }

  loadPeopleOptions() {
    const people = this.db.getAll('pessoas');
    this.peopleOptions = people.map(p => ({ label: p.nome, value: p.id }));
    this.supplierOptions = people.filter(p => p.tipo_cadastro === 'Fornecedor').map(p => ({ label: p.nome, value: p.id }));
    this.clientOptions = people.filter(p => p.tipo_cadastro === 'Cliente').map(p => ({ label: p.nome, value: p.id }));
  }

  loadVehicles() {
    const rawVehicles = this.db.getAll('veiculos');
    const people = this.db.getAll('pessoas');

    this.vehicles = rawVehicles.map(v => ({
      ...v,
      fornecedor_nome: people.find(p => p.id === v.fornecedor_id)?.nome || '-',
      cliente_nome: people.find(p => p.id === v.cliente_id)?.nome || '-'
    }));
  }

  getEmptyVehicle(): Vehicle {
    return {
      placa: '',
      marca: '',
      modelo: '',
      ano_fabricacao: new Date().getFullYear(),
      ano_modelo: new Date().getFullYear(),
      quilometragem: 0,
      valor_compra: 0,
      data_compra: new Date().toISOString().split('T')[0],
      status: 'Estoque'
    };
  }

  openNew() {
    this.isEditing = false;
    this.vehicle = this.getEmptyVehicle();
    this.vehicleModal.open();
  }

  openEdit(vehicle: Vehicle) {
    this.isEditing = true;
    this.vehicle = { ...vehicle };
    this.vehicleModal.open();
  }

  async openStatement(vehicle: Vehicle) {
    this.vehicle = vehicle;
    const movements = this.db.getAll('movimentos').filter(m => m.veiculo_id === vehicle.id);
    const centers = this.db.getAll('centros_custo');

    this.selectedVehicleStatement = movements.map(m => ({
      ...m,
      centro_custo_nome: centers.find(c => c.id === m.centro_custo_id)?.nome
    }));

    // Calculate Summary
    const expenses = movements.filter(m => m.tipo === 'Débito').reduce((sum, m) => sum + Math.abs(m.valor), 0);
    const revenue = movements.filter(m => m.tipo === 'Crédito').reduce((sum, m) => sum + m.valor, 0);
    
    this.vehicleSummary = {
      totalExpenses: expenses,
      totalRevenue: revenue,
      profit: (vehicle.valor_venda || 0) - vehicle.valor_compra - expenses + revenue
    };

    this.statementModal.open();
  }

  save() {
    if (this.isEditing) {
      this.db.update('veiculos', this.vehicle.id!, this.vehicle);
      this.poNotification.success('Veículo atualizado com sucesso!');
    } else {
      this.db.insert('veiculos', this.vehicle);
      this.poNotification.success('Veículo cadastrado com sucesso!');
    }
    this.loadVehicles();
    this.vehicleModal.close();
  }

  delete(vehicle: Vehicle) {
    this.db.delete('veiculos', vehicle.id!);
    this.poNotification.warning('Veículo excluído!');
    this.loadVehicles();
  }
}
