import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  PoModule, 
  PoTableColumn, 
  PoModalComponent, 
  PoNotificationService,
  PoTableAction,
  PoPageAction,
  PoSelectOption,
  PoDialogService
} from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';
import { Router } from '@angular/router';

@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './marcas.html',
})
// v1.0.2 - Adicionado campo Tipo de Veículo
export class MarcasComponent implements OnInit {
  @ViewChild('marcaModal', { static: true }) marcaModal!: PoModalComponent;

  marcas: any[] = [];
  allMarcas: any[] = [];
  filteredMarcas: any[] = [];
  isLoading: boolean = true;
  isLoadingSave: boolean = false;
  marca: any = { nome: '', tipo_veiculo: 'Carro' };
  
  selectedTipos: string[] = [];
  currentSearchTerm: string = '';
  @ViewChild('advancedFilterModal', { static: true }) advancedFilterModal!: PoModalComponent;
  
  hasNext: boolean = false;
  page: number = 1;
  pageSize: number = 20;
  
  public readonly columns: PoTableColumn[] = [
    { property: 'id', label: 'ID', width: '80px' },
    { property: 'nome', label: 'Marca' },
    { property: 'tipo_veiculo', label: 'Tipo', type: 'label', labels: [
      { value: 'Carro', color: 'color-11', label: 'Carro' },
      { value: 'Moto', color: 'color-01', label: 'Moto' },
      { value: 'Caminhão', color: 'color-08', label: 'Caminhão' },
      { value: 'Náutica', color: 'color-05', label: 'Náutica' }
    ]}
  ];

  public readonly tipoOptions: PoSelectOption[] = [
    { label: 'Carro', value: 'Carro' },
    { label: 'Moto', value: 'Moto' },
    { label: 'Caminhão', value: 'Caminhão' },
    { label: 'Náutica', value: 'Náutica' }
  ];

  public readonly actions: PoTableAction[] = [
    { label: 'Editar', action: this.edit.bind(this), icon: 'an an-pencil' },
    { label: 'Ver Modelos', action: this.viewModels.bind(this), icon: 'an an-car' },
    { label: 'Excluir', action: this.delete.bind(this), type: 'danger', icon: 'an an-trash' }
  ];

  public readonly pageActions: PoPageAction[] = [
    { label: 'Novo', action: this.add.bind(this), icon: 'an an-plus' }
  ];

  public disclaimerGroup: any = {
    title: 'Filtros',
    disclaimers: [],
    change: this.onChangeDisclaimer.bind(this)
  };

  public readonly filterSettings: any = {
    action: this.filterMarcas.bind(this),
    advancedAction: this.openAdvancedFilter.bind(this),
    placeholder: 'Pesquisar marcas...'
  };

  constructor(
    private db: DatabaseService, 
    private poNotification: PoNotificationService,
    private router: Router,
    private poDialog: PoDialogService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await this.db.init();
    await this.load();
    this.isLoading = false;
  }

  async load() {
    this.allMarcas = await this.db.getAll('marcas');
    this.filteredMarcas = [...this.allMarcas];
    this.page = 1;
    this.applyPagination(true);
  }

  filterMarcas(filter: string) {
    this.currentSearchTerm = filter || '';
    this.applyAllFilters();
  }

  applyAllFilters() {
    let filtered = [...this.allMarcas];

    if (this.currentSearchTerm) {
      const searchTerm = this.currentSearchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.nome.toLowerCase().includes(searchTerm) ||
        m.id.toString().includes(searchTerm) ||
        m.tipo_veiculo?.toLowerCase().includes(searchTerm)
      );
    }

    if (this.selectedTipos.length > 0) {
      filtered = filtered.filter(m => this.selectedTipos.includes(m.tipo_veiculo));
    }

    this.filteredMarcas = filtered;
    this.page = 1;
    this.applyPagination(true);
  }

  applyPagination(reset: boolean = true) {
    if (reset) {
      this.marcas = [];
    }
    const startIndex = (this.page - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const nextItems = this.filteredMarcas.slice(startIndex, endIndex);
    
    this.marcas = [...this.marcas, ...nextItems];
    this.hasNext = endIndex < this.filteredMarcas.length;
  }

  showMore() {
    this.page++;
    this.applyPagination(false);
  }

  openAdvancedFilter() {
    this.advancedFilterModal.open();
  }

  applyFilters() {
    const disclaimers = this.selectedTipos.map(tipo => ({
      label: tipo,
      property: 'tipo_veiculo',
      value: tipo
    }));
    this.disclaimerGroup.disclaimers = disclaimers;
    this.advancedFilterModal.close();
    this.applyAllFilters();
  }

  onChangeDisclaimer(disclaimers: any[]) {
    this.selectedTipos = disclaimers.map(d => d.value);
    this.applyAllFilters();
  }

  add() {
    this.marca = { nome: '', tipo_veiculo: 'Carro' };
    this.marcaModal.open();
  }

  edit(item: any) {
    this.marca = { ...item };
    this.marcaModal.open();
  }

  viewModels(item: any) {
    this.router.navigate(['/home/marcas', item.id, 'modelos']);
  }

  async save() {
    this.isLoadingSave = true;
    try {
      if (this.marca.id) {
        await this.db.update('marcas', this.marca.id, this.marca);
        this.poNotification.success('Marca atualizada!');
      } else {
        await this.db.insert('marcas', this.marca);
        this.poNotification.success('Marca criada!');
      }
      this.marcaModal.close();
      await this.load();
    } catch (err) {
      this.poNotification.error('Erro ao salvar marca.');
    } finally {
      this.isLoadingSave = false;
    }
  }

  delete(item: any) {
    this.poDialog.confirm({
      title: 'Excluir Marca',
      message: `Deseja excluir a marca ${item.nome}? Todos os modelos vinculados serão apagados.`,
      confirm: async () => {
        this.isLoading = true;
        try {
          await this.db.delete('marcas', item.id);
          this.poNotification.warning('Marca excluída!');
          await this.load();
        } catch (error) {
          this.poNotification.error('Erro ao excluir marca.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }
}
