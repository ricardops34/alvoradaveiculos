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
  PoSelectOption 
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

  people: Person[] = [];
  person: Person = this.getEmptyPerson();
  isEditing: boolean = false;

  public readonly actions: PoPageAction[] = [
    { label: 'Nova Pessoa', action: this.openNew.bind(this), icon: 'po-icon-plus' }
  ];

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'nome', label: 'Nome' },
    { property: 'documento', label: 'CPF/CNPJ' },
    { property: 'tipo_pessoa', label: 'Tipo', type: 'label', labels: [
      { value: 'Física', color: 'color-01', label: 'Física' },
      { value: 'Jurídica', color: 'color-02', label: 'Jurídica' }
    ]},
    { property: 'tipo_cadastro', label: 'Categoria', type: 'subtitle', subtitles: [
      { value: 'Cliente', color: 'color-10', label: 'Cliente', content: 'CL' },
      { value: 'Fornecedor', color: 'color-11', label: 'Fornecedor', content: 'FO' },
      { value: 'Vendedor', color: 'color-07', label: 'Vendedor', content: 'VE' },
      { value: 'Sócio', color: 'color-08', label: 'Sócio', content: 'SO' }
    ]},
    { property: 'telefone', label: 'Telefone' },
    { property: 'cidade', label: 'Cidade' },
    { property: 'estado', label: 'UF' }
  ];

  public readonly typeOptions: PoSelectOption[] = [
    { label: 'Física', value: 'Física' },
    { label: 'Jurídica', value: 'Jurídica' }
  ];

  public readonly categoryOptions: PoSelectOption[] = [
    { label: 'Cliente', value: 'Cliente' },
    { label: 'Fornecedor', value: 'Fornecedor' },
    { label: 'Vendedor', value: 'Vendedor' },
    { label: 'Sócio', value: 'Sócio' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    await this.db.init();
    this.loadPeople();
  }

  loadPeople() {
    this.people = this.db.getAll('pessoas');
  }

  getEmptyPerson(): Person {
    return {
      nome: '',
      documento: '',
      tipo_pessoa: 'Física',
      tipo_cadastro: 'Cliente',
      estado: ''
    };
  }

  openNew() {
    this.isEditing = false;
    this.person = this.getEmptyPerson();
    this.personModal.open();
  }

  openEdit(person: Person) {
    this.isEditing = true;
    this.person = { ...person };
    this.personModal.open();
  }

  save() {
    if (this.isEditing) {
      this.db.update('pessoas', this.person.id!, this.person);
      this.poNotification.success('Pessoa atualizada com sucesso!');
    } else {
      this.db.insert('pessoas', this.person);
      this.poNotification.success('Pessoa cadastrada com sucesso!');
    }
    this.loadPeople();
    this.personModal.close();
  }

  delete(person: Person) {
    this.db.delete('pessoas', person.id!);
    this.poNotification.warning('Pessoa excluída!');
    this.loadPeople();
  }

  get documentMask(): string {
    return this.person.tipo_pessoa === 'Física' ? '999.999.999-99' : '99.999.999/9999-99';
  }
}