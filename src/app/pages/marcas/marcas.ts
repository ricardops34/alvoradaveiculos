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
  PoSelectOption
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
  marca: any = { nome: '', tipo_veiculo: 'Carro' };
  
  hasNext: boolean = false;
  page: number = 1;
  pageSize: number = 10;
  
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

  public readonly filterSettings: any = {
    action: this.filterMarcas.bind(this),
    placeholder: 'Pesquisar marcas...'
  };

  constructor(
    private db: DatabaseService, 
    private notification: PoNotificationService,
    private router: Router
  ) {}

  async ngOnInit() {
    this.load();
  }

  async load() {
    this.allMarcas = await this.db.getAll('marcas');
    this.filteredMarcas = [...this.allMarcas];
    this.page = 1;
    this.applyPagination(true);
  }

  filterMarcas(filter: string) {
    if (!filter) {
      this.filteredMarcas = [...this.allMarcas];
    } else {
      const searchTerm = filter.toLowerCase();
      this.filteredMarcas = this.allMarcas.filter(m => 
        m.nome.toLowerCase().includes(searchTerm) ||
        m.id.toString().includes(searchTerm) ||
        m.tipo_veiculo?.toLowerCase().includes(searchTerm)
      );
    }
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
    console.log(`[Pagination] Page: ${this.page}, Size: ${this.pageSize}, Reset: ${reset}`);
    console.log(`[Pagination] Start: ${startIndex}, End: ${endIndex}, FilteredTotal: ${this.filteredMarcas.length}`);
    console.log(`[Pagination] nextItems length: ${nextItems.length}, Marcas length: ${this.marcas.length}, HasNext: ${this.hasNext}`);
  }

  showMore() {
    this.page++;
    this.applyPagination(false);
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
    try {
      if (this.marca.id) {
        await this.db.update('marcas', this.marca.id, this.marca);
        this.notification.success('Marca atualizada!');
      } else {
        await this.db.insert('marcas', this.marca);
        this.notification.success('Marca criada!');
      }
      this.marcaModal.close();
      this.load();
    } catch (err) {
      this.notification.error('Erro ao salvar marca.');
    }
  }

  async delete(item: any) {
    if (confirm(`Deseja excluir a marca ${item.nome}? Todos os modelos vinculados serão apagados.`)) {
      await this.db.delete('marcas', item.id);
      this.notification.warning('Marca excluída!');
      this.load();
    }
  }
}
