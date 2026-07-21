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
  PoDialogService,
  PoUploadFile 
} from '@po-ui/ng-components';
import { firstValueFrom } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  
  // Paginação no servidor (Priorizado conforme objetivo de escalabilidade)
  page: number = 1;
  pageSize: number = 20;
  hasNext: boolean = false;
  loadingShowMore: boolean = false;
  currentFilter: string = '';
  isLoading: boolean = true;
  isLoadingSave: boolean = false;

  vehicle: Vehicle = this.getEmptyVehicle();
  isEditing: boolean = false;
  currentQuickAddField: string = '';
  
  cachedPeople: any[] = [];
  
  selectedTipos: string[] = [];
  selectedStatus: string[] = [];
  currentSearchTerm: string = '';

  peopleOptions: PoSelectOption[] = [];
  supplierOptions: PoSelectOption[] = [];
  clientOptions: PoSelectOption[] = [];
  bankOptions: PoSelectOption[] = [];
  costCenterOptions: PoSelectOption[] = [];
  
  marcasOptions: PoSelectOption[] = [];
  allMarcas: any[] = [];
  modelosOptions: PoSelectOption[] = [];
  allModelos: any[] = [];
  trocaModelosOptions: PoSelectOption[] = [];

  public tipoVeiculoOptions: PoSelectOption[] = [
    { label: 'Carro', value: 'Carro' },
    { label: 'Moto', value: 'Moto' },
    { label: 'Caminhão', value: 'Caminhão' },
    { label: 'Náutica', value: 'Náutica' }
  ];

  public readonly opcionaisOptions: PoCheckboxGroupOption[] = [
    { label: 'Ar Condicionado', value: 'Ar Condicionado' },
    { label: 'Direção Hidráulica', value: 'Direção Hidráulica' },
    { label: 'Vidro Elétrico', value: 'Vidro Elétrico' },
    { label: 'Trava Elétrica', value: 'Trava Elétrica' },
    { label: 'Alarme', value: 'Alarme' },
    { label: 'Som/Multimídia', value: 'Som/Multimídia' },
    { label: 'Bancos de Couro', value: 'Bancos de Couro' },
    { label: 'Teto Solar', value: 'Teto Solar' },
    { label: 'Câmera de Ré', value: 'Câmera de Ré' },
    { label: 'Sensor de Estacionamento', value: 'Sensor de Estacionamento' },
    { label: 'Airbag', value: 'Airbag' },
    { label: 'ABS', value: 'ABS' },
    { label: 'Piloto Automático', value: 'Piloto Automático' },
    { label: 'Rodas de Liga Leve', value: 'Rodas de Liga Leve' },
    { label: 'GNV', value: 'GNV' }
  ];

  public formaCompraOptions: PoCheckboxGroupOption[] = [
    { label: 'Troca', value: 'Troca' },
    { label: 'Banco', value: 'Banco' }
  ];

  public formaVendaOptions: PoCheckboxGroupOption[] = [
    { label: 'Banco', value: 'Banco' },
    { label: 'Troca', value: 'Troca' }
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
    centro_custo_id: null,
    vendedor_id: null,
    troca_placa: '',
    troca_marca_id: null,
    troca_modelo_id: null,
    troca_tipo_veiculo: 'Carro',
    troca_cor: '',
    troca_ano_fab: null,
    troca_ano_mod: null,
    troca_valor: 0,
    troca_chassi: '',
    troca_quilometragem: null,
    troca_valor_fipe: null,
    troca_observacoes: ''
  };

  public readonly pageActions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public disclaimerGroup: any = {
    title: 'Filtros',
    disclaimers: [],
    change: this.onChangeDisclaimer.bind(this)
  };

  public readonly filterSettings: any = {
    action: this.filterVehicles.bind(this),
    advancedAction: this.openAdvancedFilter.bind(this),
    placeholder: 'Pesquisar veículos...'
  };

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Vender', action: this.openSellModal.bind(this), icon: 'po-icon-cart', visible: (row: any) => row.status === 'Estoque' || row.status === 'Preparação' },
    { label: 'Extrato/Custos', action: this.openStatement.bind(this), icon: 'po-icon-finance-secure' },
    { label: 'Gerar Proposta Comercial', action: this.gerarProposta.bind(this), icon: 'an an-file-text', visible: (row: any) => row.status === 'Estoque' || row.status === 'Preparação' },
    { label: 'Recibo de Compra', action: (row: any) => this.gerarRecibo(row, 'compra'), icon: 'an an-receipt' },
    { label: 'Recibo de Venda', action: (row: any) => this.gerarRecibo(row, 'venda'), icon: 'an an-receipt', visible: (row: any) => row.status === 'Vendido' },
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

  advancedFilters: any = {
    status: [],
    marca_id: null,
    tipo_veiculo: null
  };

  @ViewChild('advancedFilterModal') advancedFilterModal!: PoModalComponent;

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    private poDialog: PoDialogService,
    public pessoasLookup: PessoasLookupService,
    public bancosLookup: BancosLookupService,
    public centrosCustoLookup: CentrosCustoLookupService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await this.db.init();
    
    // Otimização: carregar tudo em paralelo
    const [peopleRes, banksRes, centersRes] = await Promise.all([
      this.db.getAll('pessoas', { limit: 1000000 }),
      this.db.getAll('bancos', { limit: 1000000 }),
      this.db.getAll('centros_custo', { limit: 1000000 })
    ]);
    const people = peopleRes?.items || peopleRes || [];
    const banks = banksRes?.items || banksRes || [];
    const centers = centersRes?.items || centersRes || [];

    this.cachedPeople = people;

    // Load Options
    this.peopleOptions = people.map((p: any) => ({ label: p.nome, value: p.id }));
    this.supplierOptions = people.filter((p: any) => p.is_fornecedor).map((p: any) => ({ label: p.nome, value: p.id }));
    this.clientOptions = people.filter((p: any) => p.is_cliente).map((p: any) => ({ label: p.nome, value: p.id }));
    this.bankOptions = banks.map((b: any) => ({ label: b.nome, value: b.id }));
    this.costCenterOptions = centers.map((c: any) => ({ label: c.nome, value: c.id }));
    this.updateMarcas();

    // Carregar veículos com paginação inicial
    await this.loadVehicles();
    this.isLoading = false;
  }

  async loadVehicles() {
    this.page = 1;
    this.vehicles = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('veiculos', { 
        page: this.page, 
        limit: this.pageSize,
        filter: this.currentFilter,
        advanced: this.advancedFilters
      });

      if (response && response.items) {
        this.vehicles = [...this.vehicles, ...response.items];
        this.hasNext = response.hasNext;
      } else {
        // Fallback para caso o backend ainda não suporte o novo formato
        this.vehicles = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterVehicles(filter: string) {
    this.currentFilter = filter || '';
    this.loadVehicles();
  }

  openAdvancedFilter() {
    this.advancedFilterModal.open();
  }

  applyFilters() {
    this.disclaimerGroup.disclaimers = [
      ...this.advancedFilters.status.map((s: string) => ({ label: s, property: 'status', value: s })),
      ...(this.advancedFilters.marca_id ? [{ label: `Marca ID: ${this.advancedFilters.marca_id}`, property: 'marca_id', value: this.advancedFilters.marca_id }] : [])
    ];
    this.advancedFilterModal.close();
    this.loadVehicles();
  }

  onChangeDisclaimer(disclaimers: any[]) {
    // Sincroniza filtros avançados com disclaimers
    this.advancedFilters.status = disclaimers.filter(d => d.property === 'status').map(d => d.value);
    this.advancedFilters.marca_id = disclaimers.find(d => d.property === 'marca_id')?.value || null;
    this.loadVehicles();
  }

  async save() {
    if (this.vehicleForm && this.vehicleForm.invalid) {
      Object.values(this.vehicleForm.controls).forEach((c: any) => {
        c.markAsTouched();
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

    this.isLoadingSave = true;
    try {
      if (this.isEditing) {
        await this.db.update('veiculos', this.vehicle.id!, this.vehicle);
        this.poNotification.success('Veículo atualizado!');
      } else {
        await this.db.insert('veiculos', this.vehicle);
        this.poNotification.success('Veículo cadastrado!');
      }
      this.vehicleModal.close();
      await this.loadVehicles();
    } catch (error) {
      this.poNotification.error('Erro ao salvar veículo.');
    } finally {
      this.isLoadingSave = false;
    }
  }

  delete(vehicle: any) {
    this.poDialog.confirm({
      title: 'Excluir Veículo',
      message: `Tem certeza que deseja excluir o veículo placa ${vehicle.placa}?`,
      confirm: async () => {
        this.isLoading = true;
        try {
          await this.db.delete('veiculos', vehicle.id);
          this.poNotification.warning('Veículo excluído!');
          await this.loadVehicles();
        } catch (error) {
          this.poNotification.error('Erro ao excluir veículo.');
        } finally {
          this.isLoading = false;
        }
      }
    });
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
      if (!this.sellData.troca_placa || !this.sellData.troca_valor) {
        this.poNotification.warning('Informe ao menos a placa e o valor do veículo recebido na troca.');
        return;
      }
      if (!this.sellData.centro_custo_id) {
        this.poNotification.warning('Venda com troca exige um Centro de Custo (o veículo usa a placa como identificação).');
        return;
      }
      this.sellData.troca_placa = this.sellData.troca_placa.toUpperCase();
    }

    try {
      await firstValueFrom(this.db.http.post<any>(`${this.db.apiUrl}/veiculos/${this.vehicle.id}/vender`, this.sellData));
      this.poNotification.success('Venda registrada com sucesso!');
      this.sellModal.close();
      await this.loadVehicles();
    } catch (error) {
      this.poNotification.error('Erro ao processar a venda.');
    }
  }

  handleQuickAdd(event: any, field: string) {
    switch (field) {
      case 'marca_id':
        this.vehicle.marca_id = event.id;
        this.updateMarcas();
        this.updateModelos();
        break;
      case 'modelo_id':
        this.vehicle.modelo_id = event.id;
        this.updateModelos();
        break;
      case 'fornecedor_id':
        this.vehicle.fornecedor_id = event.id;
        break;
      case 'banco_id':
        this.vehicle.banco_id = event.id;
        break;
      case 'centro_custo_id':
        this.vehicle.centro_custo_id = event.id;
        break;
      case 'venda_cliente_id':
        this.sellData.cliente_id = event.id;
        break;
      case 'venda_banco_id':
        this.sellData.banco_id = event.id;
        break;
      case 'venda_centro_custo_id':
        this.sellData.centro_custo_id = event.id;
        break;
      case 'venda_vendedor_id':
        this.sellData.vendedor_id = event.id;
        break;
      case 'troca_marca_id':
        this.sellData.troca_marca_id = event.id;
        this.updateMarcas();
        this.updateTrocaModelos();
        break;
      case 'troca_modelo_id':
        this.sellData.troca_modelo_id = event.id;
        this.updateTrocaModelos();
        break;
    }
  }

  getEmptyVehicle(): Vehicle {
    return {
      placa: '',
      tipo_veiculo: 'Carro',
      status: 'Estoque',
      valor_compra: 0,
      opcionais: []
    };
  }

  updateMarcas() {
    this.db.getAll('marcas', { limit: 1000000 }).then(response => {
      const marcas = response?.items || response || [];
      this.allMarcas = marcas;
      this.marcasOptions = marcas.map((m: any) => ({ label: m.nome, value: m.id }));
    });
  }

  updateModelos() {
    if (this.vehicle.marca_id) {
      this.db.getAll('modelos', { marca_id: this.vehicle.marca_id, limit: 1000000 }).then(response => {
        const modelos = response?.items || response || [];
        this.modelosOptions = modelos.map((m: any) => ({ label: m.nome, value: m.id }));
      });
    }
  }

  updateTrocaModelos() {
    if (this.sellData.troca_marca_id) {
      this.db.getAll('modelos', { marca_id: this.sellData.troca_marca_id, limit: 1000000 }).then(response => {
        const modelos = response?.items || response || [];
        this.trocaModelosOptions = modelos.map((m: any) => ({ label: m.nome, value: m.id }));
      });
    }
  }

  openNew() {
    this.isEditing = false;
    this.vehicle = this.getEmptyVehicle();
    this.vehicleModal.open();
  }

  openEdit(vehicle: any) {
    this.isEditing = true;
    this.vehicle = { ...vehicle };
    this.updateModelos();
    this.vehicleModal.open();
  }

  openSellModal(vehicle: any) {
    this.vehicle = vehicle;
    this.trocaModelosOptions = [];
    this.sellData = {
      data_venda: new Date().toISOString().split('T')[0],
      cliente_id: null,
      valor_venda: vehicle.valor_avaliacao || vehicle.valor_compra || 0,
      forma_venda: 'Banco',
      banco_id: null,
      centro_custo_id: null,
      vendedor_id: null,
      troca_placa: '',
      troca_marca_id: null,
      troca_modelo_id: null,
      troca_tipo_veiculo: 'Carro',
      troca_cor: '',
      troca_ano_fab: null,
      troca_ano_mod: null,
      troca_valor: 0,
      troca_chassi: '',
      troca_quilometragem: null,
      troca_valor_fipe: null,
      troca_observacoes: ''
    };
    this.sellModal.open();
  }

  openStatement(vehicle: any) {
    this.vehicle = vehicle;
    this.db.getAll('movimentos', { veiculo_id: vehicle.id, limit: 1000000 }).then(response => {
      this.selectedVehicleStatement = response?.items || response || [];
      this.calculateSummary();
      this.statementModal.open();
    });
  }

  calculateSummary() {
    const expenses = this.selectedVehicleStatement
      .filter(m => m.tipo === 'Débito')
      .reduce((acc, curr) => acc + Math.abs(curr.valor || 0), 0);
    const revenue = this.selectedVehicleStatement
      .filter(m => m.tipo === 'Crédito')
      .reduce((acc, curr) => acc + Math.abs(curr.valor || 0), 0);

    this.vehicleSummary = {
      totalExpenses: expenses,
      totalRevenue: revenue,
      profit: revenue - expenses
    };
  }

  private async getEmpresaNome(): Promise<string> {
    try {
      const parametros: any = await firstValueFrom(this.db.http.get('/api/config/parametros'));
      return parametros?.empresa_nome || 'Alvorada Veículos';
    } catch {
      return 'Alvorada Veículos';
    }
  }

  async gerarProposta(vehicle: any) {
    const empresaNome = await this.getEmpresaNome();
    const valor = vehicle.valor_avaliacao || vehicle.valor_venda || vehicle.valor_compra || 0;
    const veiculoNome = `${vehicle.marca_nome || vehicle.marca || ''} ${vehicle.modelo_nome || vehicle.modelo || ''} ${vehicle.versao || ''}`.trim();

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(empresaNome, 14, 20);
    doc.setFontSize(13);
    doc.text('Proposta Comercial', 14, 29);
    doc.setFontSize(9);
    doc.text(`Emitida em ${new Date().toLocaleDateString('pt-BR')}`, 14, 35);

    autoTable(doc, {
      startY: 42,
      head: [['Veículo', 'Placa', 'Ano Fab./Mod.', 'Cor', 'Km']],
      body: [[
        veiculoNome || '-',
        vehicle.placa || '-',
        `${vehicle.ano_fabricacao || '-'}/${vehicle.ano_modelo || '-'}`,
        vehicle.cor || '-',
        vehicle.quilometragem ? `${vehicle.quilometragem} km` : '-'
      ]]
    });

    const priceY = (doc as any).lastAutoTable.finalY + 14;
    doc.setFontSize(14);
    doc.text(`Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}`, 14, priceY);

    doc.setFontSize(9);
    doc.text('Proposta válida por 7 dias, sujeita à disponibilidade do veículo em estoque.', 14, priceY + 12);

    doc.save(`Proposta_${vehicle.placa || vehicle.id}.pdf`);
  }

  async gerarRecibo(vehicle: any, tipo: 'compra' | 'venda') {
    if (tipo === 'venda' && !vehicle.valor_venda) {
      this.poNotification.warning('Este veículo ainda não foi vendido.');
      return;
    }

    const empresaNome = await this.getEmpresaNome();
    const isVenda = tipo === 'venda';
    const pessoaNome = isVenda ? (vehicle.cliente_nome || '-') : (vehicle.fornecedor_nome || '-');
    const valor = isVenda ? vehicle.valor_venda : vehicle.valor_compra;
    const data = isVenda ? vehicle.data_venda : vehicle.data_compra;
    const veiculoNome = `${vehicle.marca_nome || vehicle.marca || ''} ${vehicle.modelo_nome || vehicle.modelo || ''}`.trim();

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(empresaNome, 14, 20);
    doc.setFontSize(13);
    doc.text(`Recibo de ${isVenda ? 'Venda' : 'Compra'} de Veículo`, 14, 29);

    const rows = [
      [isVenda ? 'Comprador' : 'Vendedor/Fornecedor', pessoaNome],
      ['Veículo', `${veiculoNome || '-'} — Placa ${vehicle.placa || '-'}`],
      ['Data', data ? new Date(data).toLocaleDateString('pt-BR') : '-'],
      ['Valor', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0)]
    ];
    if (!isVenda && vehicle.forma_compra) {
      rows.push(['Forma de Pagamento', vehicle.forma_compra]);
    }

    autoTable(doc, {
      startY: 38,
      body: rows,
      theme: 'plain'
    });

    const sigY = (doc as any).lastAutoTable.finalY + 30;
    doc.setFontSize(10);
    doc.text('_________________________________', 14, sigY);
    doc.text(pessoaNome, 14, sigY + 6);
    doc.text('_________________________________', 120, sigY);
    doc.text(empresaNome, 120, sigY + 6);

    doc.save(`Recibo_${isVenda ? 'Venda' : 'Compra'}_${vehicle.placa || vehicle.id}.pdf`);
  }
}
