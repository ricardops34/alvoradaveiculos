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
  PoDialogService
} from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './noticias.html',
})
export class NoticiasComponent implements OnInit {
  @ViewChild('noticiaModal', { static: true }) noticiaModal!: PoModalComponent;
  @ViewChild('noticiaForm', { static: false }) noticiaForm!: any;

  noticias: any[] = [];
  page = 1;
  pageSize = 20;
  hasNext = false;
  loadingShowMore = false;
  currentFilter = '';
  isLoading = true;
  isLoadingSave = false;

  noticia: any = this.getEmptyNoticia();

  public readonly columns: PoTableColumn[] = [
    { property: 'titulo', label: 'Título' },
    { property: 'publicado_em', label: 'Publicado em', type: 'date' },
    { property: 'ativo', label: 'Ativo', type: 'label', labels: [
      { value: true, color: 'color-10', label: 'Sim' },
      { value: false, color: 'color-08', label: 'Não' }
    ] as any}
  ];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly filterSettings: any = {
    action: this.filterNoticias.bind(this),
    placeholder: 'Pesquisar notícias...'
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
    this.noticias = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('noticias', { page: this.page, limit: this.pageSize, filter: this.currentFilter });
      if (response && response.items) {
        this.noticias = [...this.noticias, ...response.items];
        this.hasNext = response.hasNext;
      } else {
        this.noticias = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterNoticias(filter: string) {
    this.currentFilter = filter || '';
    this.load();
  }

  getEmptyNoticia() {
    return { titulo: '', resumo: '', conteudo: '', imagem_url: '', ativo: true, publicado_em: new Date().toISOString().split('T')[0] };
  }

  openNew() {
    this.noticia = this.getEmptyNoticia();
    this.noticiaModal.open();
  }

  openEdit(item: any) {
    this.noticia = { ...item, publicado_em: item.publicado_em ? item.publicado_em.split('T')[0] : '' };
    this.noticiaModal.open();
  }

  onUploadSuccess(event: any) {
    if (event?.body?.url) {
      this.noticia.imagem_url = event.body.url;
    }
  }

  async save() {
    if (this.noticiaForm && this.noticiaForm.invalid) {
      Object.values(this.noticiaForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    this.isLoadingSave = true;
    try {
      if (this.noticia.id) {
        await this.db.update('noticias', this.noticia.id, this.noticia);
        this.poNotification.success('Notícia atualizada!');
      } else {
        await this.db.insert('noticias', this.noticia);
        this.poNotification.success('Notícia cadastrada!');
      }
      this.noticiaModal.close();
      await this.load();
    } catch (error) {
      this.poNotification.error('Erro ao salvar notícia.');
    } finally {
      this.isLoadingSave = false;
    }
  }

  delete(item: any) {
    this.poDialog.confirm({
      title: 'Excluir Notícia',
      message: `Deseja excluir "${item.titulo}"?`,
      confirm: async () => {
        this.isLoading = true;
        try {
          await this.db.delete('noticias', item.id);
          this.poNotification.warning('Notícia excluída!');
          await this.load();
        } catch (error) {
          this.poNotification.error('Erro ao excluir notícia.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }
}
