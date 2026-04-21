import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  PoModule, 
  PoTableColumn, 
  PoSelectOption 
} from '@po-ui/ng-components';
import { DatabaseService } from '../../../services/database';

@Component({
  selector: 'app-extrato-veiculo',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './extrato-veiculo.html',
})
export class ExtratoVeiculoComponent implements OnInit {
  
  veiculo_id: number | null = null;
  vehicles: PoSelectOption[] = [];
  vehicleData: any = null;
  movements: any[] = [];
  summary = { expenses: 0, revenue: 0, profit: 0 };

  public readonly columns: PoTableColumn[] = [
    { property: 'data', label: 'Data', type: 'date' },
    { property: 'historico', label: 'Histórico' },
    { property: 'centro_custo_nome', label: 'Centro de Custo' },
    { property: 'valor', label: 'Valor', type: 'currency', format: 'BRL' }
  ];

  constructor(private db: DatabaseService) {}

  async ngOnInit() {
    await this.db.init();
    this.loadVehicles();
  }

  loadVehicles() {
    this.vehicles = this.db.getAll('veiculos').map(v => ({ 
      label: `${v.marca} ${v.modelo} (${v.placa})`, 
      value: v.id 
    }));
  }

  onChangeVehicle() {
    if (!this.veiculo_id) {
      this.vehicleData = null;
      this.movements = [];
      return;
    }

    const allVehicles = this.db.getAll('veiculos');
    this.vehicleData = allVehicles.find(v => v.id === this.veiculo_id);

    const allMovements = this.db.getAll('movimentos');
    const centers = this.db.getAll('centros_custo');

    this.movements = allMovements
      .filter(m => m.veiculo_id === this.veiculo_id)
      .map(m => ({
        ...m,
        centro_custo_nome: centers.find(c => c.id === m.centro_custo_id)?.nome
      }));

    const exp = this.movements.filter(m => m.tipo === 'Débito').reduce((sum, m) => sum + Math.abs(m.valor), 0);
    const rev = this.movements.filter(m => m.tipo === 'Crédito').reduce((sum, m) => sum + m.valor, 0);

    this.summary = {
      expenses: exp,
      revenue: rev,
      profit: (this.vehicleData.valor_venda || 0) - this.vehicleData.valor_compra - exp + rev
    };
  }
}
