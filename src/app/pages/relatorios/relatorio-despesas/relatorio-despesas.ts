import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  PoModule, 
  PoTableColumn, 
  PoChartSerie 
} from '@po-ui/ng-components';
import { DatabaseService } from '../../../services/database';

@Component({
  selector: 'app-relatorio-despesas',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './relatorio-despesas.html',
})
export class RelatorioDespesasComponent implements OnInit {
  
  filter = {
    data_inicio: '',
    data_fim: ''
  };

  expensesData: any[] = [];
  chartSeries: Array<PoChartSerie> = [];
  totalExpenses: number = 0;

  public readonly columns: PoTableColumn[] = [
    { property: 'centro_custo_nome', label: 'Centro de Custo' },
    { property: 'quantidade', label: 'Lançamentos', type: 'number' },
    { property: 'valor_total', label: 'Valor Total', type: 'currency', format: 'BRL' },
    { property: 'percentual', label: '%', type: 'subtitle', subtitles: [
      { value: 'alto', color: 'color-07', label: 'Alto' },
      { value: 'medio', color: 'color-08', label: 'Médio' },
      { value: 'baixo', color: 'color-10', label: 'Baixo' }
    ]}
  ];

  constructor(private db: DatabaseService) {}

  async ngOnInit() {
    await this.db.init();
    const today = new Date();
    this.filter.data_inicio = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    this.filter.data_fim = today.toISOString().split('T')[0];
    this.search();
  }

  search() {
    const allMovements = this.db.getAll('movimentos');
    const centers = this.db.getAll('centros_custo');

    const expenses = allMovements
      .filter(m => m.tipo === 'Débito')
      .filter(m => {
        const d = m.data;
        return (!this.filter.data_inicio || d >= this.filter.data_inicio) &&
               (!this.filter.data_fim || d <= this.filter.data_fim);
      });

    this.totalExpenses = expenses.reduce((sum, m) => sum + Math.abs(m.valor), 0);

    const grouped: { [key: number]: any } = {};
    expenses.forEach(m => {
      if (!grouped[m.centro_custo_id]) {
        grouped[m.centro_custo_id] = {
          centro_custo_nome: centers.find(c => c.id === m.centro_custo_id)?.nome || 'Outros',
          valor_total: 0,
          quantidade: 0
        };
      }
      grouped[m.centro_custo_id].valor_total += Math.abs(m.valor);
      grouped[m.centro_custo_id].quantidade++;
    });

    this.expensesData = Object.values(grouped).map(item => {
      const pct = (item.valor_total / this.totalExpenses) * 100;
      let status = 'baixo';
      if (pct > 50) status = 'alto';
      else if (pct > 20) status = 'medio';

      return {
        ...item,
        percentual: status
      };
    }).sort((a, b) => b.valor_total - a.valor_total);

    this.chartSeries = this.expensesData.map(item => ({
      label: item.centro_custo_nome,
      data: item.valor_total
    }));
  }
}
