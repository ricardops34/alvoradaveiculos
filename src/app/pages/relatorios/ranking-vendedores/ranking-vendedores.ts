import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoModule, PoTableColumn, PoChartSerie } from '@po-ui/ng-components';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../../../services/database';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-ranking-vendedores',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './ranking-vendedores.html',
})
export class RankingVendedoresComponent implements OnInit {

  filter = {
    data_inicio: '',
    data_fim: ''
  };

  ranking: any[] = [];
  chartSeries: Array<PoChartSerie> = [];
  totalVendido: number = 0;
  totalComissoes: number = 0;
  totalVendas: number = 0;

  public readonly columns: PoTableColumn[] = [
    { property: 'vendedor_nome', label: 'Vendedor' },
    { property: 'total_vendas', label: 'Vendas', type: 'number' },
    { property: 'valor_total_vendido', label: 'Valor Vendido', type: 'currency', format: 'BRL' },
    { property: 'comissao_total', label: 'Comissão', type: 'currency', format: 'BRL' }
  ];

  constructor(private db: DatabaseService) {}

  async ngOnInit() {
    await this.db.init();
    const today = new Date();
    this.filter.data_inicio = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    this.filter.data_fim = today.toISOString().split('T')[0];
    await this.search();
  }

  async search() {
    const response: any = await firstValueFrom(
      this.db.http.get('/api/vendedores/ranking', { params: this.filter })
    ).catch(() => []);

    this.ranking = (response || []).map((r: any) => ({
      ...r,
      total_vendas: Number(r.total_vendas),
      valor_total_vendido: Number(r.valor_total_vendido),
      comissao_total: Number(r.comissao_total)
    }));

    this.totalVendido = this.ranking.reduce((sum, r) => sum + r.valor_total_vendido, 0);
    this.totalComissoes = this.ranking.reduce((sum, r) => sum + r.comissao_total, 0);
    this.totalVendas = this.ranking.reduce((sum, r) => sum + r.total_vendas, 0);

    this.chartSeries = this.ranking.map(r => ({
      label: r.vendedor_nome,
      data: r.valor_total_vendido
    }));
  }

  exportXLS() {
    const data = this.ranking.map(r => ({
      Vendedor: r.vendedor_nome,
      Vendas: r.total_vendas,
      'Valor Vendido': r.valor_total_vendido,
      Comissão: r.comissao_total
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking_Vendedores');
    XLSX.writeFile(wb, `Ranking_Vendedores_${this.filter.data_inicio}_${this.filter.data_fim}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    doc.text('Ranking de Vendedores - Alvorada Veículos', 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${this.filter.data_inicio} até ${this.filter.data_fim}`, 14, 22);

    const body = this.ranking.map(r => [
      r.vendedor_nome,
      r.total_vendas,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.valor_total_vendido),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.comissao_total)
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Vendedor', 'Vendas', 'Valor Vendido', 'Comissão']],
      body: body,
    });

    doc.save(`Ranking_Vendedores_${this.filter.data_inicio}_${this.filter.data_fim}.pdf`);
  }
}
