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
  @ViewChild('profileForm', { static: false }) profileForm!: any;

  profiles: any[] = [];
  allProfiles: any[] = [];
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
    { label: 'Novo', action: this.openNew.bind(this), icon: 'an an-plus' }
  ];

  public readonly filterSettings: any = {
    action: this.filterProfiles.bind(this),
    placeholder: 'Pesquisar perfis...'
  };

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

  async loadProfiles() {
    const rawPerfis = await this.db.getAll('perfis');
    this.allProfiles = rawPerfis.map(p => ({
      ...p,
      qtd_rotinas: p.rotinas?.length || 0
    }));
    this.profiles = [...this.allProfiles];
  }

  filterProfiles(filter: string) {
    if (!filter) {
      this.profiles = [...this.allProfiles];
      return;
    }
    const searchTerm = filter.toLowerCase();
    this.profiles = this.allProfiles.filter(p => 
      p.nome.toLowerCase().includes(searchTerm)
    );
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

  async save() {
    if (this.profileForm && this.profileForm.invalid) {
      Object.values(this.profileForm.controls).forEach((c: any) => { c.markAsTouched(); c.markAsDirty(); });
      this.poNotification.warning('Por favor, preencha os campos obrigatórios em vermelho.');
      return;
    }

    if (this.isEditing) {
      await this.db.update('perfis', this.profile.id, this.profile);
      this.poNotification.success('Perfil atualizado!');
    } else {
      await this.db.insert('perfis', this.profile);
      this.poNotification.success('Perfil criado!');
    }
    await this.loadProfiles();
    this.profileModal.close();
  }

  async delete(profile: any) {
    if (profile.id === 1) {
      this.poNotification.error('O perfil Administrador não pode ser excluído.');
      return;
    }
    await this.db.delete('perfis', profile.id);
    this.poNotification.warning('Perfil excluído!');
    await this.loadProfiles();
  }
}
