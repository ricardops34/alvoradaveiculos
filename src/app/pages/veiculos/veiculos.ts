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

  vehicles: Vehicle[] = [];
  vehicle: Vehicle = this.getEmptyVehicle();
  isEditing: boolean = false;

  public readonly actions: PoPageAction[] = [
    { label: 'Novo Veículo', action: this.openNew.bind(this), icon: 'po-icon-plus' }
  ];

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'placa', label: 'Placa' },
    { property: 'marca', label: 'Marca' },
    { property: 'modelo', label: 'Modelo' },
    { property: 'ano_modelo', label: 'Ano/Mod', type: 'number' },
    { property: 'cor', label: 'Cor' },
    { property: 'quilometragem', label: 'KM', type: 'number' },
    { property: 'valor_compra', label: 'Vlr. Compra', type: 'currency', format: 'BRL' },
    { property: 'status', label: 'Status', type: 'label', labels: [
      { value: 'Estoque', color: 'color-10', label: 'Estoque' },
      { value: 'Vendido', color: 'color-11', label: 'Vendido' },
      { value: 'Manutenção', color: 'color-07', label: 'Manutenção' },
      { value: 'Preparação', color: 'color-01', label: 'Preparação' }
    ]}
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
    this.loadVehicles();
  }

  loadVehicles() {
    this.vehicles = this.db.getAll('veiculos');
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
