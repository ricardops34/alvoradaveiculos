import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  PoModule, 
  PoChartSerie, 
  PoChartType, 
  PoWidgetModule 
} from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, PoModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  
  public today: Date = new Date();
  totalStockValue: number = 0;
  totalBankBalance: number = 0;
  vehiclesCount: number = 0;
  soldVehiclesCount: number = 0;

  revenueVsExpenses: Array<PoChartSerie> = [];
  vehiclesByStatus: Array<PoChartSerie> = [];

  constructor(private db: DatabaseService) {}

  async ngOnInit() {
    await this.db.init();
    this.calculateMetrics();
  }

  calculateMetrics() {
    const vehicles = this.db.getAll('veiculos');
    const movements = this.db.getAll('movimentos');
    const banks = this.db.getAll('bancos');

    // 1. Total Stock Value (Vehicles in 'Estoque' or 'Preparação' or 'Manutenção')
    this.totalStockValue = vehicles
      .filter(v => v.status !== 'Vendido')
      .reduce((sum, v) => sum + (v.valor_compra || 0), 0);
    
    this.vehiclesCount = vehicles.filter(v => v.status !== 'Vendido').length;
    this.soldVehiclesCount = vehicles.filter(v => v.status === 'Vendido').length;

    // 2. Total Bank Balance = Soma dos saldos iniciais + movimentos
    const totalInitialBalance = banks.reduce((sum, b) => sum + (b.saldo_inicial || 0), 0);
    const totalMovements = movements.reduce((sum, m) => sum + m.valor, 0);
    this.totalBankBalance = totalInitialBalance + totalMovements;

    // 3. Revenue vs Expenses Chart (Filtered by Current Month)
    const currentMonth = this.today.getMonth();
    const currentYear = this.today.getFullYear();

    const monthMovements = movements.filter(m => {
      const d = new Date(m.data);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const revenue = monthMovements.filter(m => m.tipo === 'Crédito').reduce((sum, m) => sum + m.valor, 0);
    const expenses = monthMovements.filter(m => m.tipo === 'Débito').reduce((sum, m) => sum + Math.abs(m.valor), 0);

    this.revenueVsExpenses = [
      { label: 'Receitas', data: [revenue], color: 'color-10' },
      { label: 'Despesas', data: [expenses], color: 'color-07' }
    ];

    // 4. Vehicles by Status Chart
    const statusCounts: { [key: string]: number } = {};
    vehicles.forEach(v => {
      statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;
    });

    this.vehiclesByStatus = Object.keys(statusCounts).map(status => ({
      label: status,
      data: statusCounts[status]
    }));
  }
}
