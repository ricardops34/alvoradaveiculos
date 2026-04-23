import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoModule, PoNotificationService } from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './configuracoes.html'
})
export class ConfiguracoesComponent implements OnInit {
  loading = false;
  marcasCount = 0;

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  parametros: any = {
    empresa_nome: '',
    favicon_url: '',
    logo_url: '',
    background_url: ''
  };

  async ngOnInit() {
    await this.checkData();
    await this.carregarParametros();
  }

  async carregarParametros() {
    try {
      this.parametros = await this.db.http.get('/api/config/parametros').toPromise();
    } catch (e) {
      console.error('Erro ao carregar parâmetros', e);
    }
  }

  async salvarParametros() {
    this.loading = true;
    try {
      await this.db.http.put('/api/config/parametros', this.parametros).toPromise();
      this.poNotification.success('Configurações salvas com sucesso!');
    } catch (e) {
      this.poNotification.error('Erro ao salvar configurações.');
    } finally {
      this.loading = false;
    }
  }

  onUploadSuccess(event: any, field: string) {
    if (event && event.body && event.body.filename) {
      this.parametros[field] = event.body.filename;
      this.poNotification.success(`Arquivo ${event.body.filename} enviado com sucesso!`);
    }
  }

  async checkData() {
    try {
      const marcas = await this.db.getAll('marcas');
      this.marcasCount = marcas.length;
    } catch (e) {
      console.error(e);
    }
  }

  async importarDados() {
    this.loading = true;
    try {
      // Usando o endpoint customizado
      const response: any = await this.db.http.post('/api/config/importar-marcas-modelos', {}).toPromise();
      this.poNotification.success(response.message || 'Importação concluída!');
      await this.checkData();
    } catch (e: any) {
      this.poNotification.error(e.error?.error || 'Erro ao importar dados.');
    } finally {
      this.loading = false;
    }
  }
}
