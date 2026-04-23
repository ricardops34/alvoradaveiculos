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
  PoCheckboxGroupOption
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
  allPeople: any[] = [];
  filteredPeople: any[] = [];
  
  hasNext: boolean = false;
  page: number = 1;
  pageSize: number = 20;

  selectedTipos: string[] = [];
  selectedPapeis: string[] = [];
  currentSearchTerm: string = '';
  @ViewChild('advancedFilterModal', { static: true }) advancedFilterModal!: PoModalComponent;
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
    advancedAction: this.openAdvancedFilter.bind(this),
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
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    await this.db.init();
    this.loadPeople();
  }
  async loadPeople() {
    const rawPeople = await this.db.getAll('pessoas');
    this.allPeople = rawPeople.map(p => {
      const papeis = [];
      if (p.is_cliente) papeis.push('Cliente');
      if (p.is_fornecedor) papeis.push('Fornecedor');
      if (p.is_vendedor) papeis.push('Vendedor');
      if (p.is_socio) papeis.push('Sócio');
      return { ...p, papeis: papeis.join(', ') };
    });
    this.filteredPeople = [...this.allPeople];
    this.page = 1;
    this.applyPagination(true);
  }

  filterPeople(filter: string) {
    this.currentSearchTerm = filter || '';
    this.applyAllFilters();
  }

  applyAllFilters() {
    let filtered = [...this.allPeople];

    if (this.currentSearchTerm) {
      const searchTerm = this.currentSearchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.nome.toLowerCase().includes(searchTerm) ||
        p.documento?.toLowerCase().includes(searchTerm) ||
        p.cidade?.toLowerCase().includes(searchTerm) ||
        p.email?.toLowerCase().includes(searchTerm)
      );
    }

    if (this.selectedTipos.length > 0) {
      filtered = filtered.filter(p => this.selectedTipos.includes(p.tipo_pessoa));
    }
    
    if (this.selectedPapeis.length > 0) {
      filtered = filtered.filter(p => {
        return this.selectedPapeis.some(papel => p.papeis.includes(papel));
      });
    }

    this.filteredPeople = filtered;
    this.page = 1;
    this.applyPagination(true);
  }

  applyPagination(reset: boolean = true) {
    if (reset) {
      this.people = [];
    }
    const startIndex = (this.page - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const nextItems = this.filteredPeople.slice(startIndex, endIndex);
    
    this.people = [...this.people, ...nextItems];
    this.hasNext = endIndex < this.filteredPeople.length;
  }

  showMore() {
    this.page++;
    this.applyPagination(false);
  }

  openAdvancedFilter() {
    this.advancedFilterModal.open();
  }

  applyFilters() {
    const disclaimers = [
      ...this.selectedTipos.map(tipo => ({ label: tipo, property: 'tipo_pessoa', value: tipo })),
      ...this.selectedPapeis.map(papel => ({ label: papel, property: 'papel', value: papel }))
    ];
    this.disclaimerGroup.disclaimers = disclaimers;
    this.advancedFilterModal.close();
    this.applyAllFilters();
  }

  onChangeDisclaimer(disclaimers: any[]) {
    this.selectedTipos = disclaimers.filter(d => d.property === 'tipo_pessoa').map(d => d.value);
    this.selectedPapeis = disclaimers.filter(d => d.property === 'papel').map(d => d.value);
    this.applyAllFilters();
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

    // Sync roles to person object
    this.person.is_cliente = this.roles.includes('cliente');
    this.person.is_fornecedor = this.roles.includes('fornecedor');
    this.person.is_vendedor = this.roles.includes('vendedor');
    this.person.is_socio = this.roles.includes('socio');

    // Convert boolean to number for PostgreSQL
    const dataToSave = {
      ...this.person,
      is_cliente: this.person.is_cliente ? 1 : 0,
      is_fornecedor: this.person.is_fornecedor ? 1 : 0,
      is_vendedor: this.person.is_vendedor ? 1 : 0,
      is_socio: this.person.is_socio ? 1 : 0
    };
    delete (dataToSave as any).papeis;

    if (this.isEditing) {
      await this.db.update('pessoas', this.person.id!, dataToSave);
      this.poNotification.success('Pessoa atualizada!');
    } else {
      await this.db.insert('pessoas', dataToSave);
      this.poNotification.success('Pessoa cadastrada!');
    }
    await this.loadPeople();
    this.personModal.close();
  }

  async delete(person: Person) {
    await this.db.delete('pessoas', person.id!);
    this.poNotification.warning('Pessoa excluída!');
    await this.loadPeople();
  }

  get documentMask(): string {
    return this.person.tipo_pessoa === 'Física' ? '999.999.999-99' : '99.999.999/9999-99';
  }
}