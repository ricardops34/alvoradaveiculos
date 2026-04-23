import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PoModule, PoNotificationService } from '@po-ui/ng-components';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, PoModule],
  templateUrl: './configuracoes.html'
})
export class ConfiguracoesComponent implements OnInit {
  loading = false;
  marcasCount = 0;

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService
  ) {}

  async ngOnInit() {
    await this.checkData();
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
