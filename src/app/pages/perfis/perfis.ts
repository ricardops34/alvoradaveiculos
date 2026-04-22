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
  PoCheckboxGroupOption
} from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-perfis',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './perfis.html',
})
export class PerfisComponent implements OnInit {
  @ViewChild('profileModal', { static: true }) profileModal!: PoModalComponent;

  profiles: any[] = [];
  profile: any = { nome: '', rotinas: [] };
  isEditing: boolean = false;

  public readonly routineOptions: PoCheckboxGroupOption[] = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: 'Veículos', value: 'veiculos' },
    { label: 'Bancos', value: 'bancos' },
    { label: 'Pessoas', value: 'pessoas' },
    { label: 'Centro de Custo', value: 'centros_custo' },
    { label: 'Movimentos', value: 'movimentos' },
    { label: 'Extrato Bancário', value: 'extrato_bancario' },
    { label: 'Extrato por Veículo', value: 'extrato_veiculo' },
    { label: 'Relatório de Despesas', value: 'relatorio_despesas' },
    { label: 'Gestão de Usuários', value: 'usuarios' },
    { label: 'Gestão de Perfis', value: 'perfis' }
  ];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo Perfil', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'an an-pencil-simple' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'an an-trash', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'nome', label: 'Nome do Perfil' },
    { property: 'qtd_rotinas', label: 'Qtd. Rotinas', type: 'number' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    await this.db.init();
    this.loadProfiles();
  }

  loadProfiles() {
    this.profiles = this.db.getAll('perfis').map(p => ({
      ...p,
      qtd_rotinas: p.rotinas?.length || 0
    }));
    console.log('Perfis carregados:', this.profiles);
  }

  openNew() {
    this.isEditing = false;
    this.profile = { nome: '', rotinas: ['dashboard'] };
    this.profileModal.open();
  }

  openEdit(profile: any) {
    this.isEditing = true;
    this.profile = { ...profile, rotinas: profile.rotinas || [] };
    this.profileModal.open();
  }

  save() {
    if (this.isEditing) {
      this.db.update('perfis', this.profile.id, this.profile);
      this.poNotification.success('Perfil atualizado!');
    } else {
      this.db.insert('perfis', this.profile);
      this.poNotification.success('Perfil criado!');
    }
    this.loadProfiles();
    this.profileModal.close();
  }

  delete(profile: any) {
    if (profile.id === 1) {
      this.poNotification.error('O perfil Administrador não pode ser excluído.');
      return;
    }
    this.db.delete('perfis', profile.id);
    this.poNotification.warning('Perfil excluído!');
    this.loadProfiles();
  }
}
