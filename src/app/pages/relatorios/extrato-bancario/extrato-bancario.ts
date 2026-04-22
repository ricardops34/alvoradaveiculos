import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  PoModule, 
  PoTableColumn, 
  PoSelectOption, 
  PoNotificationService 
} from '@po-ui/ng-components';
import { DatabaseService } from '../../../services/database';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-extrato-bancario',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './extrato-bancario.html',
})
export class ExtratoBancarioComponent implements OnInit {
  
  filter = {
    banco_id: null,
    data_inicio: '',
    data_fim: ''
  };

  banks: PoSelectOption[] = [];
  movements: any[] = [];
  totalBalance: number = 0;
  creditLimit: number = 0;
  availableBalance: number = 0;

  public readonly columns: PoTableColumn[] = [
    { property: 'data', label: 'Data', type: 'date', format: 'dd/MM/yyyy' },
    { property: 'historico', label: 'Histórico' },
    { property: 'centro_custo_nome', label: 'Centro de Custo' },
    { property: 'tipo', label: 'Tipo', type: 'label', labels: [
      { value: 'Crédito', color: 'color-10', label: 'Crédito' },
      { value: 'Débito', color: 'color-07', label: 'Débito' }
    ]},
    { property: 'valor', label: 'Valor', type: 'currency', format: 'BRL' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    await this.db.init();
    this.loadBanks();
    const today = new Date();
    this.filter.data_inicio = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    this.filter.data_fim = today.toISOString().split('T')[0];
  }

  async loadBanks() {
    const bancos = await this.db.getAll('bancos');
    this.banks = bancos.map(b => ({ label: b.nome, value: b.id }));
    if (this.banks.length > 0) {
      this.filter.banco_id = this.banks[0].value as any;
      await this.search();
    }
  }

  async search() {
    if (!this.filter.banco_id) {
      this.poNotification.warning('Selecione um banco.');
      return;
    }

    const allMovements = await this.db.getAll('movimentos');
    const centers = await this.db.getAll('centros_custo');
    const bancos = await this.db.getAll('bancos');
    const bank = bancos.find(b => b.id === this.filter.banco_id);
    
    this.creditLimit = bank ? (bank.limite_credito || 0) : 0;

    this.movements = allMovements
      .filter(m => m.banco_id === this.filter.banco_id)
      .filter(m => {
        const d = m.data;
        return (!this.filter.data_inicio || d >= this.filter.data_inicio) &&
               (!this.filter.data_fim || d <= this.filter.data_fim);
      })
      .map(m => ({
        ...m,
        centro_custo_nome: centers.find(c => c.id === m.centro_custo_id)?.nome
      }))
      .sort((a, b) => a.data.localeCompare(b.data));

    // Calculate total balance for this bank considering ALL movements up to date_fim
    const totalMovementsUntilNow = allMovements.filter(m => m.banco_id === this.filter.banco_id);
    this.totalBalance = totalMovementsUntilNow.reduce((sum, m) => sum + parseFloat(m.valor), 0);
    this.availableBalance = this.totalBalance + this.creditLimit;
  }

  exportXLS() {
    const data = this.movements.map(m => ({
      Data: m.data,
      Histórico: m.historico,
      'Centro de Custo': m.centro_custo_nome,
      Tipo: m.tipo,
      Valor: m.valor
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato');
    XLSX.writeFile(wb, `Extrato_Bancario_${this.filter.data_inicio}_${this.filter.data_fim}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    const bankName = this.banks.find(b => b.value === this.filter.banco_id)?.label || '';
    
    doc.text('Extrato Bancário - Alvorada Veículos', 14, 15);
    doc.setFontSize(10);
    doc.text(`Banco: ${bankName}`, 14, 22);
    doc.text(`Período: ${this.filter.data_inicio} até ${this.filter.data_fim}`, 14, 28);

    const body = this.movements.map(m => [
      m.data,
      m.historico,
      m.centro_custo_nome,
      m.tipo,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.valor)
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Data', 'Histórico', 'Centro de Custo', 'Tipo', 'Valor']],
      body: body,
    });

    const finalY = (doc as any).lastAutoTable.cursor.y || 40;
    doc.text(`Saldo Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.totalBalance)}`, 14, finalY + 10);
    
    doc.save(`Extrato_Bancario_${this.filter.data_inicio}_${this.filter.data_fim}.pdf`);
  }
}
