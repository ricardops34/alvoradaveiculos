import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoModule, PoPageAction, PoTableColumn, PoTableAction, PoModalComponent, PoNotificationService } from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './marcas.html',
})
export class MarcasComponent implements OnInit {
  @ViewChild('marcaModal', { static: true }) marcaModal!: PoModalComponent;
  @ViewChild('marcaForm', { static: false }) marcaForm!: any;

  marcas: any[] = [];
  isEditing = false;
  marca: any = { nome: '' };

  public readonly actions: PoPageAction[] = [
    { label: 'Nova Marca', action: this.openNew.bind(this), icon: 'po-icon-plus' }
  ];

  public readonly tableActions: PoTableAction[] = [
    { label: 'Editar', action: this.openEdit.bind(this), icon: 'po-icon-edit' },
    { label: 'Excluir', action: this.delete.bind(this), icon: 'po-icon-delete', type: 'danger' }
  ];

  public readonly columns: PoTableColumn[] = [
    { property: 'id', label: 'ID', width: '10%' },
    { property: 'nome', label: 'Nome da Marca' }
  ];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  ngOnInit() {
    this.loadMarcas();
  }

  async loadMarcas() {
    this.marcas = await this.db.getAll('marcas');
  }

  openNew() {
    this.isEditing = false;
    this.marca = { nome: '' };
    this.marcaModal.open();
  }

  openEdit(marca: any) {
    this.isEditing = true;
    this.marca = { ...marca };
    this.marcaModal.open();
  }

  async save() {
    if (this.marcaForm && this.marcaForm.invalid) {
      Object.values(this.marcaForm.controls).forEach((c: any) => {
        c.markAsTouched(); c.markAsDirty();
      });
      this.poNotification.warning('Preencha os campos obrigatórios.');
      return;
    }

    try {
      if (this.isEditing) {
        await this.db.update('marcas', this.marca.id, this.marca);
        this.poNotification.success('Marca atualizada!');
      } else {
        await this.db.insert('marcas', this.marca);
        this.poNotification.success('Marca cadastrada!');
      }
      await this.loadMarcas();
      this.marcaModal.close();
    } catch (e) {
      this.poNotification.error('Erro ao salvar marca.');
    }
  }

  async delete(marca: any) {
    try {
      await this.db.delete('marcas', marca.id);
      this.poNotification.warning('Marca excluída!');
      await this.loadMarcas();
    } catch (e) {
      this.poNotification.error('Erro ao excluir marca. Verifique se existem veículos vinculados.');
    }
  }
}
