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

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './usuarios.html',
})
export class UsuariosComponent implements OnInit {
  @ViewChild('userModal', { static: true }) userModal!: PoModalComponent;

  users: any[] = [];
  user: any = { nome: '', email: '', senha: '', role: 'user' };
  isEditing: boolean = false;

  public readonly actions: PoPageAction[] = [
    { label: 'Novo Usuário', action: this.openNew.bind(this), icon: 'po-icon-user-add' }
  ];

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'nome', label: 'Nome' },
    { property: 'email', label: 'E-mail' },
    { property: 'role', label: 'Perfil', type: 'label', labels: [
      { value: 'admin', color: 'color-07', label: 'Administrador' },
      { value: 'user', color: 'color-01', label: 'Usuário Padrão' }
    ]}
  ];

  public readonly roleOptions: PoSelectOption[] = [
    { label: 'Administrador', value: 'admin' },
    { label: 'Usuário Padrão', value: 'user' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    await this.db.init();
    this.loadUsers();
  }

  loadUsers() {
    this.users = this.db.getAll('usuarios');
  }

  openNew() {
    this.isEditing = false;
    this.user = { nome: '', email: '', senha: '', role: 'user' };
    this.userModal.open();
  }

  openEdit(user: any) {
    this.isEditing = true;
    this.user = { ...user };
    this.userModal.open();
  }

  save() {
    if (this.isEditing) {
      this.db.update('usuarios', this.user.id, this.user);
      this.poNotification.success('Usuário atualizado!');
    } else {
      this.db.insert('usuarios', this.user);
      this.poNotification.success('Usuário criado!');
    }
    this.loadUsers();
    this.userModal.close();
  }

  delete(user: any) {
    if (user.email === 'admin@alvorada.com') {
      this.poNotification.error('O administrador principal não pode ser excluído.');
      return;
    }
    this.db.delete('usuarios', user.id);
    this.poNotification.warning('Usuário excluído!');
    this.loadUsers();
  }
}
