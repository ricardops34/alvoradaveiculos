import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoModule, PoPageAction, PoTableColumn, PoTableAction, PoModalComponent, PoNotificationService, PoSelectOption } from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-modelos',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './modelos.html',
})
export class ModelosComponent implements OnInit {
  @ViewChild('modeloModal', { static: true }) modeloModal!: PoModalComponent;
  @ViewChild('modeloForm', { static: false }) modeloForm!: any;

  modelos: any[] = [];
  isEditing = false;
  modelo: any = { nome: '', marca_id: null };
  marcasOptions: PoSelectOption[] = [];

  public readonly actions: PoPageAction[] = [
    { label: 'Novo Modelo', action: this.openNew.bind(this), icon: 'po-icon-plus' }
  ];

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'id', label: 'ID', width: '10%' },
    { property: 'marca_nome', label: 'Marca' },
    { property: 'nome', label: 'Nome do Modelo' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.modelos = await this.db.getAll('modelos');
    const marcas = await this.db.getAll('marcas');
    this.marcasOptions = marcas.map(m => ({ label: m.nome, value: m.id }));
  }

  openNew() {
    this.isEditing = false;
    this.modelo = { nome: '', marca_id: null };
    this.modeloModal.open();
  }

  openEdit(modelo: any) {
    this.isEditing = true;
    this.modelo = { ...modelo };
    this.modeloModal.open();
  }

  async save() {
    if (this.modeloForm && this.modeloForm.invalid) {
      Object.values(this.modeloForm.controls).forEach((c: any) => {
        c.markAsTouched(); c.markAsDirty();
      });
      this.poNotification.warning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      if (this.isEditing) {
        await this.db.update('modelos', this.modelo.id, this.modelo);
        this.poNotification.success('Modelo atualizado!');
      } else {
        await this.db.insert('modelos', this.modelo);
        this.poNotification.success('Modelo cadastrado!');
      }
      await this.loadData();
      this.modeloModal.close();
    } catch (e) {
      this.poNotification.error('Erro ao salvar modelo.');
    }
  }

  async delete(modelo: any) {
    try {
      await this.db.delete('modelos', modelo.id);
      this.poNotification.warning('Modelo excluído!');
      await this.loadData();
    } catch (e) {
      this.poNotification.error('Erro ao excluir modelo. Verifique se existem veículos vinculados.');
    }
  }
}
