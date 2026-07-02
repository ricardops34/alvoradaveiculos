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
import { Movement } from '../../types/movement';
import { QuickAddComponent } from '../../components/quick-add/quick-add.component';
import { PessoasLookupService, BancosLookupService, CentrosCustoLookupService, VeiculosLookupService } from '../../services/lookups';

// Version: 1.0.1 - Adding Quick Add buttons
@Component({
  selector: 'app-movimentos',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule, QuickAddComponent],
  templateUrl: './movimentos.html',
})
export class MovimentosComponent implements OnInit {
  @ViewChild('movementModal', { static: true }) movementModal!: PoModalComponent;
  @ViewChild('movementForm', { static: false }) movementForm!: any;
  @ViewChild('appQuickAdd') appQuickAdd!: QuickAddComponent;

  movements: any[] = [];
  page: number = 1;
  hasNext: boolean = false;
  loadingShowMore: boolean = false;
  currentFilter: string = '';
  movement: Movement = this.getEmptyMovement();
  isEditing: boolean = false;
  currentQuickAddField: string = '';

  banks: PoSelectOption[] = [];
  costCenters: PoSelectOption[] = [];
  people: PoSelectOption[] = [];
  vehicles: PoSelectOption[] = [];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly filterSettings: any = {
    action: this.filterMovements.bind(this),
    placeholder: 'Pesquisar movimentos...'
  };

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'data', label: 'Data', type: 'date', format: 'dd/MM/yyyy' },
    { property: 'banco_nome', label: 'Banco' },
    { property: 'tipo', label: 'Tipo', type: 'label', labels: [
      { value: 'Crédito', color: 'color-10', label: 'Crédito' },
      { value: 'Débito', color: 'color-07', label: 'Débito' }
    ]},
    { property: 'historico', label: 'Histórico' },
    { property: 'valor', label: 'Valor', type: 'currency', format: 'BRL' },
    { property: 'centro_custo_nome', label: 'Centro de Custo' },
    { property: 'pessoa_nome', label: 'Pessoa' },
    { property: 'veiculo_placa', label: 'Veículo' }
  ];

  public readonly typeOptions: PoSelectOption[] = [
    { label: 'Crédito (Entrada)', value: 'Crédito' },
    { label: 'Débito (Saída)', value: 'Débito' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    public pessoasLookup: PessoasLookupService,
    public bancosLookup: BancosLookupService,
    public centrosCustoLookup: CentrosCustoLookupService,
    public veiculosLookup: VeiculosLookupService
  ) {}

  async ngOnInit() {
    await this.db.init();
    this.loadOptions();
    this.loadMovements();
  }

  async loadOptions() {
    const banksRes = await this.db.getAll('bancos');
    const banks = Array.isArray(banksRes) ? banksRes : banksRes.items;
    
    const centersRes = await this.db.getAll('centros_custo');
    const centers = Array.isArray(centersRes) ? centersRes : centersRes.items;
    
    const peopleRes = await this.db.getAll('pessoas');
    const people = Array.isArray(peopleRes) ? peopleRes : peopleRes.items;
    
    const vehiclesRes = await this.db.getAll('veiculos');
    const vehicles = Array.isArray(vehiclesRes) ? vehiclesRes : vehiclesRes.items;

    this.banks = banks.map((b: any) => ({ label: b.nome, value: b.id }));
    this.costCenters = centers.map((c: any) => ({ label: c.nome, value: c.id }));
    this.people = people.map((p: any) => ({ label: p.nome, value: p.id }));
    this.vehicles = vehicles.map((v: any) => ({ label: `${v.marca_nome} ${v.modelo_nome} (${v.placa})`, value: v.id }));
  }

  async loadMovements() {
    this.page = 1;
    this.movements = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('movimentos', { 
        page: this.page, 
        limit: 20,
        filter: this.currentFilter 
      });

      if (response && response.items) {
        // Obter metadados para os nomes (banco, centro de custo, etc.)
        // Para performance, idealmente o backend já traria os joins (como fizemos em veículos)
        // Por enquanto, faremos o join local ou manteremos a busca rápida
        const banksRes = await this.db.getAll('bancos');
        const banks = Array.isArray(banksRes) ? banksRes : banksRes.items;
        
        const centersRes = await this.db.getAll('centros_custo');
        const centers = Array.isArray(centersRes) ? centersRes : centersRes.items;
        
        const peopleRes = await this.db.getAll('pessoas');
        const people = Array.isArray(peopleRes) ? peopleRes : peopleRes.items;
        
        const vehiclesRes = await this.db.getAll('veiculos');
        const vehicles = Array.isArray(vehiclesRes) ? vehiclesRes : vehiclesRes.items;

        const processedItems = response.items.map((m: any) => ({
          ...m,
          banco_nome: banks.find((b: any) => b.id === m.banco_id)?.nome,
          centro_custo_nome: centers.find((c: any) => c.id === m.centro_custo_id)?.nome,
          pessoa_nome: people.find((p: any) => p.id === m.pessoa_id)?.nome || '-',
          veiculo_placa: vehicles.find((v: any) => v.id === m.veiculo_id)?.placa || '-'
        }));

        this.movements = [...this.movements, ...processedItems];
        this.hasNext = response.hasNext;
      } else {
        this.movements = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterMovements(filter: string) {
    this.currentFilter = filter;
    this.loadMovements();
  }

  getEmptyMovement(): Movement {
    return {
      data: new Date().toISOString().split('T')[0],
      banco_id: 0,
      tipo: 'Crédito',
      historico: '',
      valor: 0,
      centro_custo_id: 0
    };
  }

  openNew() {
    this.isEditing = false;
    this.movement = this.getEmptyMovement();
    this.movementModal.open();
  }

  openEdit(movement: any) {
    this.isEditing = true;
    this.movement = { ...movement };
    this.movementModal.open();
  }

  async save() {
    if (this.movementForm && this.movementForm.invalid) {
      Object.values(this.movementForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    // Ensure value sign matches type
    if (this.movement.tipo === 'Débito' && this.movement.valor > 0) {
      this.movement.valor *= -1;
    } else if (this.movement.tipo === 'Crédito' && this.movement.valor < 0) {
      this.movement.valor *= -1;
    }

    if (this.isEditing) {
      await this.db.update('movimentos', this.movement.id!, this.movement);
      this.poNotification.success('Lançamento atualizado!');
    } else {
      await this.db.insert('movimentos', this.movement);
      this.poNotification.success('Lançamento realizado!');
    }
    await this.loadMovements();
    this.movementModal.close();
  }

  async delete(movement: any) {
    await this.db.delete('movimentos', movement.id!);
    this.poNotification.warning('Lançamento excluído!');
    await this.loadMovements();
  }

  handleQuickAdd(event: any, field: string) {
    if (field === 'banco_id') this.movement.banco_id = event.id;
    if (field === 'centro_custo_id') this.movement.centro_custo_id = event.id;
    if (field === 'pessoa_id') this.movement.pessoa_id = event.id;
    if (field === 'veiculo_id') this.movement.veiculo_id = event.id;
  }
}