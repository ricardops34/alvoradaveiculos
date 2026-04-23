import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  PoModule, 
  PoTableColumn, 
  PoModalComponent, 
  PoNotificationService,
  PoTableAction,
  PoPageAction
} from '@po-ui/ng-components';
import { DatabaseService } from '../../../services/database';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-modelos',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './modelos.html',
})
export class ModelosComponent implements OnInit {
  @ViewChild('modeloModal', { static: true }) modeloModal!: PoModalComponent;

  marcaId: number | null = null;
  marcaNome: string = '';
  modelos: any[] = [];
  page: number = 1;
  hasNext: boolean = false;
  loadingShowMore: boolean = false;
  currentFilter: string = '';
  modelo: any = { nome: '', ano_inicial: null, ano_final: null, descricao_detalhada: '' };
  
  public readonly columns: PoTableColumn[] = [
    { property: 'id', label: 'ID', width: '80px' },
    { property: 'nome', label: 'Modelo' },
    { property: 'ano_inicial', label: 'Ano Inicial', type: 'number' },
    { property: 'ano_final', label: 'Ano Final', type: 'number' },
    { property: 'descricao_detalhada', label: 'Descrição' }
  ];

  public readonly actions: PoTableAction[] = [
    { label: 'Editar', action: this.edit.bind(this), icon: 'an an-pencil' },
    { label: 'Excluir', action: this.delete.bind(this), type: 'danger', icon: 'an an-trash' }
  ];

  public readonly pageActions: PoPageAction[] = [
    { label: 'Novo', action: this.add.bind(this), icon: 'an an-plus' },
    { label: 'Voltar', action: this.back.bind(this), icon: 'an an-arrow-left' }
  ];

  public readonly filterSettings: any = {
    action: this.filterModelos.bind(this),
    placeholder: 'Pesquisar modelos...'
  };

  constructor(
    private db: DatabaseService, 
    private notification: PoNotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
    this.marcaId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.marcaId) {
      const marca = await this.db.getById('marcas', this.marcaId);
      this.marcaNome = marca?.nome || 'Marca';
      this.load();
    }
  }

  async load() {
    this.page = 1;
    this.modelos = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('modelos', { 
        marca_id: this.marcaId,
        page: this.page, 
        limit: 20,
        filter: this.currentFilter 
      });

      if (response && response.items) {
        this.modelos = [...this.modelos, ...response.items];
        this.hasNext = response.hasNext;
      } else {
        this.modelos = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterModelos(filter: string) {
    this.currentFilter = filter;
    this.load();
  }

  back() {
    this.router.navigate(['/home/marcas']);
  }

  add() {
    this.modelo = { 
      marca_id: this.marcaId, 
      nome: '', 
      ano_inicial: null, 
      ano_final: null, 
      descricao_detalhada: '' 
    };
    this.modeloModal.open();
  }

  edit(item: any) {
    this.modelo = { ...item };
    this.modeloModal.open();
  }

  async save() {
    try {
      if (this.modelo.id) {
        await this.db.update('modelos', this.modelo.id, this.modelo);
        this.notification.success('Modelo atualizado!');
      } else {
        await this.db.insert('modelos', this.modelo);
        this.notification.success('Modelo criado!');
      }
      this.modeloModal.close();
      this.load();
    } catch (err) {
      this.notification.error('Erro ao salvar modelo.');
    }
  }

  async delete(item: any) {
    if (confirm(`Deseja excluir o modelo ${item.nome}?`)) {
      await this.db.delete('modelos', item.id);
      this.notification.warning('Modelo excluído!');
      this.load();
    }
  }
}
