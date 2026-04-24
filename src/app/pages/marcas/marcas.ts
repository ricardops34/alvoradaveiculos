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
  
  // Paginação no servidor (Priorizado)
  page: number = 1;
  pageSize: number = 20;
  hasNext: boolean = false;
  loadingShowMore: boolean = false;
  currentFilter: string = '';
  isLoading: boolean = true;
  isLoadingSave: boolean = false;

  marca: any = { nome: '', tipo_veiculo: 'Carro' };
  
  selectedTipos: string[] = [];
  currentSearchTerm: string = '';
  @ViewChild('advancedFilterModal', { static: true }) advancedFilterModal!: PoModalComponent;
  
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
    this.page = 1;
    this.marcas = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('marcas', { 
        page: this.page, 
        limit: this.pageSize,
        filter: this.currentFilter 
      });

      if (response && response.items) {
        this.marcas = [...this.marcas, ...response.items];
        this.hasNext = response.hasNext;
      } else {
        this.marcas = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterMarcas(filter: string) {
    this.currentFilter = filter || '';
    this.load();
  }

  openAdvancedFilter() {
    this.advancedFilterModal.open();
  }

  applyFilters() {
    this.disclaimerGroup.disclaimers = this.selectedTipos.map(tipo => ({
      label: tipo,
      property: 'tipo_veiculo',
      value: tipo
    }));
    this.advancedFilterModal.close();
    this.load();
  }

  onChangeDisclaimer(disclaimers: any[]) {
    this.selectedTipos = disclaimers.map(d => d.value);
    this.load();
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
