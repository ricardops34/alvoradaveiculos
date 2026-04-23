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
import { PerfisLookupService } from '../../services/lookups';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './usuarios.html',
})
export class UsuariosComponent implements OnInit {
  @ViewChild('userModal', { static: true }) userModal!: PoModalComponent;
  @ViewChild('userForm', { static: false }) userForm!: any;

  users: any[] = [];
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  profiles: any[] = [];
  
  hasNext: boolean = false;
  page: number = 1;
  pageSize: number = 20;
  user: any = { nome: '', email: '', senha: '', perfil_id: null };
  isEditing: boolean = false;

  public profileOptions: PoSelectOption[] = [];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly filterSettings: any = {
    action: this.filterUsers.bind(this),
    placeholder: 'Pesquisar usuários...'
  };

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'an an-pencil-simple' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'an an-trash', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'nome', label: 'Nome' },
    { property: 'email', label: 'E-mail' },
    { property: 'perfil_nome', label: 'Perfil' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    public perfisLookup: PerfisLookupService
  ) {}

  async ngOnInit() {
    await this.db.init();
    this.loadProfiles();
    this.loadUsers();
  }

  async loadProfiles() {
    this.profiles = await this.db.getAll('perfis');
    this.profileOptions = this.profiles.map(p => ({ label: p.nome, value: p.id }));
  }

  async loadUsers() {
    const rawUsers = await this.db.getAll('usuarios');
    this.allUsers = rawUsers.map(u => {
      const profile = this.profiles.find(p => p.id === u.perfil_id);
      return { ...u, perfil_nome: profile ? profile.nome : 'N/A' };
    });
    this.filteredUsers = [...this.allUsers];
    this.page = 1;
    this.applyPagination(true);
  }

  filterUsers(filter: string) {
    if (!filter) {
      this.filteredUsers = [...this.allUsers];
    } else {
      const searchTerm = filter.toLowerCase();
      this.filteredUsers = this.allUsers.filter(u => 
        u.nome.toLowerCase().includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm) ||
        u.perfil_nome?.toLowerCase().includes(searchTerm)
      );
    }
    this.page = 1;
    this.applyPagination(true);
  }

  applyPagination(reset: boolean = true) {
    if (reset) {
      this.users = [];
    }
    const startIndex = (this.page - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const nextItems = this.filteredUsers.slice(startIndex, endIndex);
    
    this.users = [...this.users, ...nextItems];
    this.hasNext = endIndex < this.filteredUsers.length;
  }

  showMore() {
    this.page++;
    this.applyPagination(false);
  }

  openNew() {
    this.isEditing = false;
    this.user = { nome: '', email: '', senha: '', perfil_id: 2 }; // Default to 'Vendedor'
    this.userModal.open();
  }

  openEdit(user: any) {
    this.isEditing = true;
    this.user = { ...user };
    this.userModal.open();
  }

  async save() {
    if (this.userForm && this.userForm.invalid) {
      Object.values(this.userForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    if (this.isEditing) {
      await this.db.update('usuarios', this.user.id, this.user);
      this.poNotification.success('Usuário atualizado!');
    } else {
      await this.db.insert('usuarios', this.user);
      this.poNotification.success('Usuário criado!');
    }
    await this.loadUsers();
    this.userModal.close();
  }

  async delete(user: any) {
    if (user.email === 'admin@alvorada.com') {
      this.poNotification.error('O administrador principal não pode ser excluído.');
      return;
    }
    await this.db.delete('usuarios', user.id);
    this.poNotification.warning('Usuário excluído!');
    await this.loadUsers();
  }
}
