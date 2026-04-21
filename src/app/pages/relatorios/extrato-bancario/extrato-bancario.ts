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

  loadBanks() {
    this.banks = this.db.getAll('bancos').map(b => ({ label: b.nome, value: b.id }));
    if (this.banks.length > 0) {
      this.filter.banco_id = this.banks[0].value as any;
      this.search();
    }
  }

  search() {
    if (!this.filter.banco_id) {
      this.poNotification.warning('Selecione um banco.');
      return;
    }

    const allMovements = this.db.getAll('movimentos');
    const centers = this.db.getAll('centros_custo');

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

    this.totalBalance = this.movements.reduce((sum, m) => sum + m.valor, 0);
  }
}
