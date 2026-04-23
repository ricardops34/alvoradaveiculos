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
  PoSelectOption,
  PoCheckboxGroupOption,
  PoUploadFile 
} from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';
import { Vehicle } from '../../types/vehicle';
import { QuickAddComponent } from '../../components/quick-add/quick-add.component';
import { PessoasLookupService, BancosLookupService, CentrosCustoLookupService } from '../../services/lookups';

@Component({
  selector: 'app-veiculos',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule, QuickAddComponent],
  providers: [PessoasLookupService, BancosLookupService, CentrosCustoLookupService],
  templateUrl: './veiculos.html',
})
export class VeiculosComponent implements OnInit {
  @ViewChild('vehicleModal', { static: true }) vehicleModal!: PoModalComponent;
  @ViewChild('statementModal', { static: true }) statementModal!: PoModalComponent;
  @ViewChild('sellModal', { static: true }) sellModal!: PoModalComponent;
  @ViewChild('vehicleForm', { static: false }) vehicleForm!: any;
  @ViewChild('sellForm', { static: false }) sellForm!: any;
  @ViewChild('quickAdd') quickAdd!: QuickAddComponent;

  vehicles: any[] = [];
  allVehicles: any[] = []; // Cópia para filtragem
  vehicle: Vehicle = this.getEmptyVehicle();
  isEditing: boolean = false;
  currentQuickAddField: string = '';

  peopleOptions: PoSelectOption[] = [];
  supplierOptions: PoSelectOption[] = [];
  clientOptions: PoSelectOption[] = [];
  bankOptions: PoSelectOption[] = [];
  costCenterOptions: PoSelectOption[] = [];
  
  marcasOptions: PoSelectOption[] = [];
  allMarcas: any[] = [];
  modelosOptions: PoSelectOption[] = [];
  allModelos: any[] = []; // armazena todos os modelos para filtrar localmente

  public tipoVeiculoOptions: PoSelectOption[] = [
    { label: 'Carro', value: 'Carro' },
    { label: 'Moto', value: 'Moto' },
    { label: 'Caminhão', value: 'Caminhão' },
    { label: 'Náutica', value: 'Náutica' }
  ];

  public formaCompraOptions: PoCheckboxGroupOption[] = [
    { label: 'Troca', value: 'Troca' },
    { label: 'Banco', value: 'Banco' }
  ];

  // Statement data
  selectedVehicleStatement: any[] = [];
  vehicleSummary = { totalExpenses: 0, totalRevenue: 0, profit: 0 };

  sellData: any = {
    data_venda: new Date().toISOString().split('T')[0],
    cliente_id: null,
    valor_venda: 0,
    forma_venda: 'Banco',
    banco_id: null,
    centro_custo_id: null
  };

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly filterSettings: any = {
    action: this.filterVehicles.bind(this),
    placeholder: 'Pesquisar veículos...'
  };

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Vender', action: this.openSellModal.bind(this), icon: 'po-icon-cart', visible: (row: any) => row.status === 'Estoque' || row.status === 'Preparação' },
    { label: 'Extrato/Custos', action: this.openStatement.bind(this), icon: 'po-icon-finance-secure' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'placa', label: 'Placa' },
    { property: 'tipo_veiculo', label: 'Tipo' },
    { property: 'marca_nome', label: 'Marca' },
    { property: 'modelo_nome', label: 'Modelo' },
    { property: 'ano_modelo', label: 'Ano/Mod', type: 'number' },
    { property: 'fornecedor_nome', label: 'Fornecedor' },
    { property: 'cliente_nome', label: 'Cliente' },
    { property: 'valor_compra', label: 'Vlr. Compra', type: 'currency', format: 'BRL' },
    { property: 'valor_venda', label: 'Vlr. Venda', type: 'currency', format: 'BRL' },
    { property: 'valor_avaliacao', label: 'Vlr. Avaliação', type: 'currency', format: 'BRL' },
    { property: 'status', label: 'Status', type: 'label', labels: [
      { value: 'Estoque', color: 'color-10', label: 'Estoque' },
      { value: 'Vendido', color: 'color-11', label: 'Vendido' },
      { value: 'Manutenção', color: 'color-07', label: 'Manutenção' },
      { value: 'Preparação', color: 'color-01', label: 'Preparação' }
    ]}
  ];

  public readonly statementColumns: PoTableColumn[] = [
    { property: 'data', label: 'Data', type: 'date' },
    { property: 'historico', label: 'Histórico' },
    { property: 'centro_custo_nome', label: 'Centro de Custo' },
    { property: 'valor', label: 'Valor', type: 'currency', format: 'BRL' }
  ];

  public readonly statusOptions: PoSelectOption[] = [
    { label: 'Estoque', value: 'Estoque' },
    { label: 'Vendido', value: 'Vendido' },
    { label: 'Manutenção', value: 'Manutenção' },
    { label: 'Preparação', value: 'Preparação' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    public pessoasLookup: PessoasLookupService,
    public bancosLookup: BancosLookupService,
    public centrosCustoLookup: CentrosCustoLookupService
  ) {}

  async ngOnInit() {
    await this.db.init();
    await this.loadOptions();
    await this.loadVehicles();
  }

  async loadOptions() {
    const people = await this.db.getAll('pessoas');
    this.peopleOptions = people.map(p => ({ label: p.nome, value: p.id }));
    this.supplierOptions = people.filter(p => p.is_fornecedor).map(p => ({ label: p.nome, value: p.id }));
    this.clientOptions = people.filter(p => p.is_cliente).map(p => ({ label: p.nome, value: p.id }));

    const banks = await this.db.getAll('bancos');
    this.bankOptions = banks.map(b => ({ label: b.nome, value: b.id }));

    const centers = await this.db.getAll('centros_custo');
    this.costCenterOptions = centers.map(c => ({ label: c.nome, value: c.id }));

    this.allMarcas = await this.db.getAll('marcas');
    this.allModelos = await this.db.getAll('modelos');
    
    this.updateMarcas();
  }

  updateMarcas() {
    if (!this.vehicle.tipo_veiculo) {
      this.marcasOptions = [];
      return;
    }

    // Filtrar marcas que possuem modelos do tipo selecionado
    const marcasIdsComModelosDoTipo = new Set(
      this.allModelos
        .filter(m => m.tipo_veiculo === this.vehicle.tipo_veiculo)
        .map(m => m.marca_id)
    );

    this.marcasOptions = this.allMarcas
      .filter(m => marcasIdsComModelosDoTipo.has(m.id))
      .map(m => ({ label: m.nome, value: m.id }));
  }

  onMarcaChange(marcaId: number) {
    this.vehicle.modelo_id = undefined;
    this.updateModelos();
  }

  onTipoChange(tipo?: string) {
    if (tipo) {
      this.vehicle.tipo_veiculo = tipo;
    }
    this.vehicle.marca_id = undefined;
    this.vehicle.modelo_id = undefined;
    this.marcasOptions = [];
    this.modelosOptions = [];
    this.updateMarcas();
  }

  updateModelos() {
    if (!this.vehicle.marca_id || !this.vehicle.tipo_veiculo) {
      this.modelosOptions = [];
      return;
    }
    this.modelosOptions = this.allModelos
      .filter(m => m.marca_id === this.vehicle.marca_id && m.tipo_veiculo === this.vehicle.tipo_veiculo)
      .map(m => ({ label: m.nome, value: m.id }));
  }

  async loadVehicles() {
    const rawVehicles = await this.db.getAll('veiculos');
    const people = await this.db.getAll('pessoas');

    this.allVehicles = rawVehicles.map(v => ({
      ...v,
      fornecedor_nome: people.find(p => p.id === v.fornecedor_id)?.nome || '-',
      cliente_nome: people.find(p => p.id === v.cliente_id)?.nome || '-'
    }));
    this.vehicles = [...this.allVehicles];
  }

  filterVehicles(filter: string) {
    if (!filter) {
      this.vehicles = [...this.allVehicles];
      return;
    }
    const searchTerm = filter.toLowerCase();
    this.vehicles = this.allVehicles.filter(v => 
      v.placa.toLowerCase().includes(searchTerm) ||
      v.marca_nome?.toLowerCase().includes(searchTerm) ||
      v.modelo_nome?.toLowerCase().includes(searchTerm) ||
      v.status.toLowerCase().includes(searchTerm)
    );
  }

  getEmptyVehicle(): Vehicle {
    return {
      tipo_veiculo: undefined,
      placa: '',
      marca_id: undefined,
      modelo_id: undefined,
      ano_fabricacao: new Date().getFullYear(),
      ano_modelo: new Date().getFullYear(),
      quilometragem: 0,
      valor_compra: 0,
      valor_avaliacao: 0,
      data_compra: new Date().toISOString().split('T')[0],
      status: 'Estoque',
      forma_compra: 'Troca',
      fotos: []
    };
  }

  onUpload(event: any) {
    const files: PoUploadFile[] = event;
    if (files && files.length > 0) {
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          if (!this.vehicle.fotos) this.vehicle.fotos = [];
          this.vehicle.fotos.push(e.target.result);
        };
        // The file property of PoUploadFile might be a Blob or File
        if (file.rawFile) {
          reader.readAsDataURL(file.rawFile);
        }
      });
    }
  }

  removeFoto(index: number) {
    if (this.vehicle.fotos) {
      this.vehicle.fotos.splice(index, 1);
    }
  }

  openNew() {
    this.isEditing = false;
    this.vehicle = this.getEmptyVehicle();
    this.vehicleModal.open();
  }

  openEdit(vehicle: Vehicle) {
    this.isEditing = true;
    this.vehicle = { ...vehicle };
    if (this.vehicle.marca_id) {
      this.updateModelos();
    }
    this.vehicleModal.open();
  }

  async openStatement(vehicle: Vehicle) {
    this.vehicle = vehicle;
    const allMovements = await this.db.getAll('movimentos');
    const movements = allMovements.filter(m => m.veiculo_id === vehicle.id);
    const centers = await this.db.getAll('centros_custo');

    this.selectedVehicleStatement = movements.map(m => ({
      ...m,
      centro_custo_nome: centers.find(c => c.id === m.centro_custo_id)?.nome
    }));

    // Separar movimentos que são a própria compra/venda para não somar em duplicidade
    const isPurchase = (m: any) => m.historico.startsWith('Compra Veículo');
    const isSale = (m: any) => m.historico.startsWith('Venda Veículo');

    // Despesas e receitas ADICIONAIS (ex: manutenção, comissão) - exclui a compra e venda
    const additionalExpenses = movements.filter(m => m.tipo === 'Débito' && !isPurchase(m)).reduce((sum, m) => sum + Math.abs(parseFloat(m.valor)), 0);
    const additionalRevenue = movements.filter(m => m.tipo === 'Crédito' && !isSale(m)).reduce((sum, m) => sum + parseFloat(m.valor), 0);
    
    this.vehicleSummary = {
      totalExpenses: additionalExpenses,
      totalRevenue: additionalRevenue,
      profit: (vehicle.valor_venda || 0) - vehicle.valor_compra - additionalExpenses + additionalRevenue
    };

    this.statementModal.open();
  }

  async save() {
    if (this.vehicleForm && this.vehicleForm.invalid) {
      Object.values(this.vehicleForm.controls).forEach((c: any) => {
        c.markAsTouched(); c.markAsDirty();
        c.markAsDirty();
      });
      this.poNotification.warning('Por favor, preencha todos os campos obrigatórios em vermelho.');
      return;
    }

    if (this.vehicle.forma_compra === 'Banco' && (!this.vehicle.banco_id || !this.vehicle.centro_custo_id)) {
      this.poNotification.warning('Para forma de compra via Banco, é necessário informar a Conta Bancária e o Centro de Custo.');
      return;
    }

    if (this.vehicle.placa) {
      this.vehicle.placa = this.vehicle.placa.toUpperCase();
    }
    
    if (this.vehicle.forma_compra === 'Troca') {
      this.vehicle.banco_id = undefined;
      this.vehicle.centro_custo_id = undefined;
    }

    if (this.isEditing) {
      await this.db.update('veiculos', this.vehicle.id!, this.vehicle);
      this.poNotification.success('Veículo atualizado com sucesso!');
    } else {
      await this.db.insert('veiculos', this.vehicle);
      this.poNotification.success('Veículo cadastrado com sucesso!');
    }
    await this.loadVehicles();
    this.vehicleModal.close();
  }

  async delete(vehicle: Vehicle) {
    await this.db.delete('veiculos', vehicle.id!);
    this.poNotification.warning('Veículo excluído!');
    await this.loadVehicles();
  }

  openSellModal(vehicle: Vehicle) {
    this.vehicle = vehicle;
    this.sellData = {
      data_venda: new Date().toISOString().split('T')[0],
      cliente_id: null,
      valor_venda: vehicle.valor_avaliacao || vehicle.valor_compra,
      forma_venda: 'Banco',
      banco_id: null,
      centro_custo_id: null,
      troca_placa: '',
      troca_marca: '',
      troca_modelo: '',
      troca_cor: '',
      troca_ano_fab: null,
      troca_ano_mod: null,
      troca_valor: null
    };
    this.sellModal.open();
  }

  async confirmSale() {
    if (this.sellForm && this.sellForm.invalid) {
      Object.values(this.sellForm.controls).forEach((c: any) => {
        c.markAsTouched();
        c.markAsDirty();
      });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    if (this.sellData.forma_venda === 'Banco' && (!this.sellData.banco_id || !this.sellData.centro_custo_id)) {
      this.poNotification.warning('Para forma de venda via Banco, é necessário informar a Conta Bancária e o Centro de Custo.');
      return;
    }

    if (this.sellData.forma_venda === 'Troca') {
      if (!this.sellData.troca_placa || !this.sellData.troca_marca || !this.sellData.troca_modelo || !this.sellData.troca_valor) {
        this.poNotification.warning('Preencha os campos obrigatórios do veículo de troca (Placa, Marca, Modelo e Valor).');
        return;
      }
      this.sellData.troca_placa = this.sellData.troca_placa.toUpperCase();
    }

    try {
      await this.db.http.post<any>(`${this.db.apiUrl}/veiculos/${this.vehicle.id}/vender`, this.sellData).toPromise();
      this.poNotification.success('Veículo vendido e troca registrada com sucesso!');
      this.sellModal.close();
      await this.loadVehicles();
    } catch (e) {
      console.error(e);
      this.poNotification.error('Erro ao processar a venda.');
    }
  }

  handleQuickAdd(event: any, field: string) {
    if (field === 'fornecedor_id') this.vehicle.fornecedor_id = event.id;
    if (field === 'banco_id') this.vehicle.banco_id = event.id;
    if (field === 'centro_custo_id') this.vehicle.centro_custo_id = event.id;
    if (field === 'venda_cliente_id') this.sellData.cliente_id = event.id;
    if (field === 'venda_banco_id') this.sellData.banco_id = event.id;
    if (field === 'venda_centro_custo_id') this.sellData.centro_custo_id = event.id;
    if (field === 'marca_id') {
      this.loadOptions().then(() => {
        this.vehicle.marca_id = event.id;
        this.onMarcaChange(event.id);
      });
    }
    if (field === 'modelo_id') {
      this.loadOptions().then(() => {
        if (this.vehicle.marca_id) this.onMarcaChange(this.vehicle.marca_id);
        this.vehicle.modelo_id = event.id;
      });
    }
  }
}
