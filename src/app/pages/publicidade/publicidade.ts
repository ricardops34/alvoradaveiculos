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
  PoDialogService
} from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-publicidade',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './publicidade.html',
})
export class PublicidadeComponent implements OnInit {
  @ViewChild('anuncioModal', { static: true }) anuncioModal!: PoModalComponent;
  @ViewChild('anuncioForm', { static: false }) anuncioForm!: any;

  anuncios: any[] = [];
  page = 1;
  pageSize = 20;
  hasNext = false;
  loadingShowMore = false;
  currentFilter = '';
  isLoading = true;
  isLoadingSave = false;

  anuncio: any = this.getEmptyAnuncio();

  public readonly posicaoOptions: PoSelectOption[] = [
    { label: 'Lateral', value: 'lateral' },
    { label: 'Topo', value: 'topo' },
    { label: 'Rodapé', value: 'rodape' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'titulo', label: 'Título' },
    { property: 'posicao', label: 'Posição' },
    { property: 'ativo', label: 'Ativo', type: 'label', labels: [
      { value: true, color: 'color-10', label: 'Sim' },
      { value: false, color: 'color-08', label: 'Não' }
    ] as any}
  ];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly filterSettings: any = {
    action: this.filterAnuncios.bind(this),
    placeholder: 'Pesquisar anúncios...'
  };

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'an an-pencil-simple' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'an an-trash', type: 'danger' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    private poDialog: PoDialogService,
    private authService: AuthService
  ) {}

  // O po-upload faz a requisição por fora do HttpClient (não passa pelo interceptor)
  get uploadHeaders() {
    return { Authorization: `Bearer ${this.authService.getToken()}` };
  }

  async ngOnInit() {
    this.isLoading = true;
    await this.db.init();
    await this.load();
    this.isLoading = false;
  }

  async load() {
    this.page = 1;
    this.anuncios = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('publicidade', { page: this.page, limit: this.pageSize, filter: this.currentFilter });
      if (response && response.items) {
        this.anuncios = [...this.anuncios, ...response.items];
        this.hasNext = response.hasNext;
      } else {
        this.anuncios = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterAnuncios(filter: string) {
    this.currentFilter = filter || '';
    this.load();
  }

  getEmptyAnuncio() {
    return { titulo: '', imagem_url: '', link_url: '', posicao: 'lateral', ativo: true, ordem: 0 };
  }

  openNew() {
    this.anuncio = this.getEmptyAnuncio();
    this.anuncioModal.open();
  }

  openEdit(item: any) {
    this.anuncio = { ...item };
    this.anuncioModal.open();
  }

  onUploadSuccess(event: any) {
    if (event?.body?.url) {
      this.anuncio.imagem_url = event.body.url;
    }
  }

  async save() {
    if (this.anuncioForm && this.anuncioForm.invalid) {
      Object.values(this.anuncioForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    this.isLoadingSave = true;
    try {
      if (this.anuncio.id) {
        await this.db.update('publicidade', this.anuncio.id, this.anuncio);
        this.poNotification.success('Anúncio atualizado!');
      } else {
        await this.db.insert('publicidade', this.anuncio);
        this.poNotification.success('Anúncio cadastrado!');
      }
      this.anuncioModal.close();
      await this.load();
    } catch (error) {
      this.poNotification.error('Erro ao salvar anúncio.');
    } finally {
      this.isLoadingSave = false;
    }
  }

  delete(item: any) {
    this.poDialog.confirm({
      title: 'Excluir Anúncio',
      message: `Deseja excluir "${item.titulo}"?`,
      confirm: async () => {
        this.isLoading = true;
        try {
          await this.db.delete('publicidade', item.id);
          this.poNotification.warning('Anúncio excluído!');
          await this.load();
        } catch (error) {
          this.poNotification.error('Erro ao excluir anúncio.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }
}
