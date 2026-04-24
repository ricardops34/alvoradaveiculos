import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  PoModule, 
  PoTableColumn, 
  PoSelectOption 
} from '@po-ui/ng-components';
import { DatabaseService } from '../../../services/database';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  async loadVehicles() {
    const veiculos = await this.db.getAll('veiculos');
    this.vehicles = veiculos.map(v => ({ 
      label: `${v.marca} ${v.modelo} (${v.placa})`, 
      value: v.id 
    }));
  }

  async onChangeVehicle() {
    if (!this.veiculo_id) {
      this.vehicleData = null;
      this.movements = [];
      return;
    }

    const allVehicles = await this.db.getAll('veiculos');
    this.vehicleData = allVehicles.find(v => v.id === this.veiculo_id);

    const allMovements = await this.db.getAll('movimentos');
    const centers = await this.db.getAll('centros_custo');

    // Get vehicle movements
    let vehicleMovements = allMovements
      .filter(m => m.veiculo_id === this.veiculo_id)
      .map(m => ({
        ...m,
        centro_custo_nome: centers.find(c => c.id === m.centro_custo_id)?.nome
      }));

    // Add Purchase as a Debit entry
    const compraEntry = {
      data: this.vehicleData.data_compra,
      historico: 'VALOR DE COMPRA (AQUISIÇÃO)',
      tipo: 'Débito',
      valor: -Math.abs(this.vehicleData.valor_compra),
      centro_custo_nome: 'Investimento'
    };
    
    vehicleMovements.push(compraEntry);

    // Add Sale as a Credit entry if available
    if (this.vehicleData.valor_venda) {
      const vendaEntry = {
        data: this.vehicleData.data_venda,
        historico: 'VALOR DE VENDA',
        tipo: 'Crédito',
        valor: Math.abs(this.vehicleData.valor_venda),
        centro_custo_nome: 'Venda'
      };
      vehicleMovements.push(vendaEntry);
    }

    // Sort by date
    this.movements = vehicleMovements.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    // Calculate Summary based on ALL entries in the table
    const exp = this.movements
      .filter(m => m.tipo === 'Débito')
      .reduce((sum, m) => sum + Math.abs(parseFloat(m.valor)), 0);
      
    const rev = this.movements
      .filter(m => m.tipo === 'Crédito')
      .reduce((sum, m) => sum + Math.abs(parseFloat(m.valor)), 0);

    this.summary = {
      expenses: exp,
      revenue: rev,
      profit: rev - exp
    };
  }

  exportXLS() {
    if (!this.vehicleData) return;

    const data = this.movements.map(m => ({
      Data: m.data,
      Histórico: m.historico,
      'Centro de Custo': m.centro_custo_nome,
      Tipo: m.tipo,
      Valor: m.valor
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato_Veiculo');
    XLSX.writeFile(wb, `Extrato_Veiculo_${this.vehicleData.placa}.xlsx`);
  }

  exportPDF() {
    if (!this.vehicleData) return;

    const doc = new jsPDF();
    doc.text('Extrato por Veículo - Alvorada Veículos', 14, 15);
    doc.setFontSize(10);
    doc.text(`Veículo: ${this.vehicleData.marca} ${this.vehicleData.modelo} (${this.vehicleData.placa})`, 14, 22);

    const body = this.movements.map(m => [
      m.data,
      m.historico,
      m.centro_custo_nome,
      m.tipo,
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.valor)
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Data', 'Histórico', 'Centro de Custo', 'Tipo', 'Valor']],
      body: body,
    });

    const finalY = (doc as any).lastAutoTable.cursor.y || 40;
    doc.text(`Lucro/Prejuízo: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(this.summary.profit)}`, 14, finalY + 10);
    
    doc.save(`Extrato_Veiculo_${this.vehicleData.placa}.pdf`);
  }
}
