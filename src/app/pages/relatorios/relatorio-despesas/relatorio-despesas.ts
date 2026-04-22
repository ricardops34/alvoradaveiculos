import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  PoModule, 
  PoTableColumn, 
  PoChartSerie 
} from '@po-ui/ng-components';
import { DatabaseService } from '../../../services/database';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  movements: any[] = [];
  expensesData: any[] = [];
  chartSeries: Array<PoChartSerie> = [];
  totalExpenses: number = 0;

  public readonly columns: PoTableColumn[] = [
    { property: 'centro_custo_nome', label: 'Centro de Custo' },
    { property: 'quantidade', label: 'Lançamentos', type: 'number' },
    { property: 'valor_total', label: 'Valor Total', type: 'currency', format: 'BRL' },
    { property: 'percentual', label: '%', type: 'subtitle', subtitles: [
      { value: 'alto', color: 'color-07', label: 'Alto', content: '!!' },
      { value: 'medio', color: 'color-08', label: 'Médio', content: '!' },
      { value: 'baixo', color: 'color-10', label: 'Baixo', content: '-' }
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

  async search() {
    const allMovements = await this.db.getAll('movimentos');
    const centers = await this.db.getAll('centros_custo');
    const vehicles = await this.db.getAll('veiculos');

    this.movements = allMovements
      .filter(m => m.tipo === 'Débito')
      .filter(m => {
        const d = m.data;
        return (!this.filter.data_inicio || d >= this.filter.data_inicio) &&
               (!this.filter.data_fim || d <= this.filter.data_fim);
      })
      .map(m => ({
        ...m,
        centro_custo_nome: centers.find(c => c.id === m.centro_custo_id)?.nome || 'Outros',
        veiculo_placa: vehicles.find(v => v.id === m.veiculo_id)?.placa || 'N/A'
      }));

    this.totalExpenses = this.movements.reduce((sum, m) => sum + Math.abs(m.valor), 0);

    const grouped: { [key: number]: any } = {};
    this.movements.forEach(m => {
      if (!grouped[m.centro_custo_id]) {
        grouped[m.centro_custo_id] = {
          centro_custo_nome: m.centro_custo_nome,
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

  exportXLS() {
    const data = this.movements.map(m => ({
      Data: m.data,
      Histórico: m.historico,
      'Centro de Custo': m.centro_custo_nome,
      Veículo: m.veiculo_placa,
      Valor: Math.abs(m.valor)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Despesas');
    XLSX.writeFile(wb, `Relatorio_Despesas_${this.filter.data_inicio}_${this.filter.data_fim}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    doc.text('Relatório de Despesas - Alvorada Veículos', 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${this.filter.data_inicio} até ${this.filter.data_fim}`, 14, 22);

    const body = this.movements.map(m => [
      m.data,
      m.historico,
      m.centro_custo_nome,
      m.veiculo_placa,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(m.valor))
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Data', 'Histórico', 'Centro de Custo', 'Veículo', 'Valor']],
      body: body,
    });

    const finalY = (doc as any).lastAutoTable.cursor.y || 40;
    doc.text(`Total de Despesas: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.totalExpenses)}`, 14, finalY + 10);
    
    doc.save(`Relatorio_Despesas_${this.filter.data_inicio}_${this.filter.data_fim}.pdf`);
  }
}
