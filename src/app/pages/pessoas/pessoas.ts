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
  PoDialogService
} from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';
import { Person } from '../../types/person';

@Component({
  selector: 'app-pessoas',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './pessoas.html',
})
export class PessoasComponent implements OnInit {
  @ViewChild('personModal', { static: true }) personModal!: PoModalComponent;
  @ViewChild('personForm', { static: false }) personForm!: any;

  people: any[] = [];
  
  // Paginação no servidor (HEAD Priorizado)
  page: number = 1;
  pageSize: number = 20;
  hasNext: boolean = false;
  loadingShowMore: boolean = false;
  currentFilter: string = '';
  isLoading: boolean = true;
  isLoadingSave: boolean = false;

  person: Person = this.getEmptyPerson();
  isEditing: boolean = false;

  // For checkbox group
  roles: string[] = [];
  public readonly roleOptions: PoCheckboxGroupOption[] = [
    { label: 'Cliente', value: 'cliente' },
    { label: 'Fornecedor', value: 'fornecedor' },
    { label: 'Vendedor', value: 'vendedor' },
    { label: 'Sócio', value: 'socio' }
  ];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public disclaimerGroup: any = {
    title: 'Filtros',
    disclaimers: [],
    change: this.onChangeDisclaimer.bind(this)
  };

  public readonly filterSettings: any = {
    action: this.filterPeople.bind(this),
    placeholder: 'Pesquisar pessoas...'
  };

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'nome', label: 'Nome' },
    { property: 'documento', label: 'CPF/CNPJ' },
    { property: 'tipo_pessoa', label: 'Tipo' },
    { property: 'papeis', label: 'Papéis' },
    { property: 'telefone', label: 'Telefone' },
    { property: 'cidade', label: 'Cidade' }
  ];

  public readonly typeOptions: PoSelectOption[] = [
    { label: 'Física', value: 'Física' },
    { label: 'Jurídica', value: 'Jurídica' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    private poDialog: PoDialogService
  ) {}

  async ngOnInit() {
    this.isLoading = true;
    await this.db.init();
    await this.loadPeople();
    this.isLoading = false;
  }

  async loadPeople() {
    this.page = 1;
    this.people = [];
    await this.fetchData();
  }

  async showMore() {
    this.page++;
    await this.fetchData();
  }

  private async fetchData() {
    this.loadingShowMore = true;
    try {
      const response = await this.db.getAll('pessoas', { 
        page: this.page, 
        limit: this.pageSize,
        filter: this.currentFilter 
      });

      if (response && response.items) {
        const processedItems = response.items.map((p: any) => {
          const papeis = [];
          if (p.is_cliente) papeis.push('Cliente');
          if (p.is_fornecedor) papeis.push('Fornecedor');
          if (p.is_vendedor) papeis.push('Vendedor');
          if (p.is_socio) papeis.push('Sócio');
          return { ...p, papeis: papeis.join(', ') };
        });
        this.people = [...this.people, ...processedItems];
        this.hasNext = response.hasNext;
      } else {
        // Fallback
        this.people = response;
        this.hasNext = false;
      }
    } finally {
      this.loadingShowMore = false;
    }
  }

  filterPeople(filter: string) {
    this.currentFilter = filter || '';
    this.loadPeople();
  }

  onChangeDisclaimer(disclaimers: any[]) {
    this.currentFilter = disclaimers.find(d => d.property === 'filter')?.value || '';
    this.loadPeople();
  }

  getEmptyPerson(): Person {
    return {
      nome: '',
      documento: '',
      tipo_pessoa: 'Física',
      is_cliente: false,
      is_fornecedor: false,
      is_vendedor: false,
      is_socio: false,
      estado: ''
    };
  }

  openNew() {
    this.isEditing = false;
    this.person = this.getEmptyPerson();
    this.roles = [];
    this.personModal.open();
  }

  openEdit(person: Person) {
    this.isEditing = true;
    this.person = { ...person };
    this.roles = [];
    if (person.is_cliente) this.roles.push('cliente');
    if (person.is_fornecedor) this.roles.push('fornecedor');
    if (person.is_vendedor) this.roles.push('vendedor');
    if (person.is_socio) this.roles.push('socio');
    this.personModal.open();
  }

  async save() {
    if (this.personForm && this.personForm.invalid) {
      Object.values(this.personForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    this.person.is_cliente = this.roles.includes('cliente');
    this.person.is_fornecedor = this.roles.includes('fornecedor');
    this.person.is_vendedor = this.roles.includes('vendedor');
    this.person.is_socio = this.roles.includes('socio');

    const dataToSave = {
      ...this.person,
      is_cliente: this.person.is_cliente ? 1 : 0,
      is_fornecedor: this.person.is_fornecedor ? 1 : 0,
      is_vendedor: this.person.is_vendedor ? 1 : 0,
      is_socio: this.person.is_socio ? 1 : 0
    };
    delete (dataToSave as any).papeis;

    this.isLoadingSave = true;
    try {
      if (this.isEditing) {
        await this.db.update('pessoas', this.person.id!, dataToSave);
        this.poNotification.success('Pessoa atualizada!');
      } else {
        await this.db.insert('pessoas', dataToSave);
        this.poNotification.success('Pessoa cadastrada!');
      }
      await this.loadPeople();
      this.personModal.close();
    } catch (error) {
      this.poNotification.error('Erro ao salvar pessoa.');
    } finally {
      this.isLoadingSave = false;
    }
  }

  delete(person: Person) {
    this.poDialog.confirm({
      title: 'Excluir Pessoa',
      message: `Tem certeza que deseja excluir ${person.nome}?`,
      confirm: async () => {
        this.isLoading = true;
        try {
          await this.db.delete('pessoas', person.id!);
          this.poNotification.warning('Pessoa excluída!');
          await this.loadPeople();
        } catch (error) {
          this.poNotification.error('Erro ao excluir pessoa.');
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  get documentMask(): string {
    return this.person.tipo_pessoa === 'Física' ? '999.999.999-99' : '99.999.999/9999-99';
  }
}