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
    await this.calculateMetrics();
  }

  async calculateMetrics() {
    const metrics = await this.db.getDashboardMetrics();
    
    if (!metrics) return;

    this.totalStockValue = metrics.totalStockValue;
    this.totalBankBalance = metrics.totalBankBalance;
    this.vehiclesCount = metrics.vehiclesCount;
    this.soldVehiclesCount = metrics.soldVehiclesCount;

    // Revenue vs Expenses Chart
    this.revenueVsExpenses = [
      { label: 'Receitas', data: [metrics.revenue], color: 'color-10' },
      { label: 'Despesas', data: [metrics.expenses], color: 'color-07' }
    ];

    // Vehicles by Status Chart
    this.vehiclesByStatus = Object.keys(metrics.statusCounts).map(status => ({
      label: status,
      data: metrics.statusCounts[status]
    }));
  }
}
