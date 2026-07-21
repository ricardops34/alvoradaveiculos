import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoModule, PoNotificationService, PoDialogService } from '@po-ui/ng-components';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../../services/database';
import { AuthService } from '../../services/auth';
import { CepService } from '../../services/cep';
import { CnpjService } from '../../services/cnpj';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule, PoModule],
  templateUrl: './configuracoes.html',
  styleUrl: './configuracoes.scss'
})
export class ConfiguracoesComponent implements OnInit {
  loading = false;
  marcasCount = 0;

  backupLoading = false;
  buscandoCep = false;
  buscandoCnpj = false;

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    private authService: AuthService,
    private poDialog: PoDialogService,
    private cepService: CepService,
    private cnpjService: CnpjService
  ) {}

  // Os componentes po-upload fazem a requisição por fora do HttpClient (não passam
  // pelo interceptor), então o token precisa ser anexado manualmente aqui.
  get uploadHeaders() {
    return { Authorization: `Bearer ${this.authService.getToken()}` };
  }

  parametros: any = {
    empresa_nome: '',
    favicon_url: '',
    logo_url: '',
    background_url: '',
    smtp_host: '',
    smtp_port: null,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    cnpj: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    codigo_municipio_ibge: '',
    renave_responsavel_nome: '',
    renave_responsavel_cpf: '',
    renave_certificado_nome_arquivo: '',
    renave_certificado_senha_definida: false,
    renave_certificado_senha: ''
  };

  async ngOnInit() {
    await this.checkData();
    await this.carregarParametros();
  }

  async carregarParametros() {
    try {
      const dados: any = await this.db.http.get('/api/config/parametros/completo').toPromise();
      this.parametros = { ...this.parametros, ...dados, renave_certificado_senha: '' };
    } catch (e) {
      console.error('Erro ao carregar parâmetros', e);
    }
  }

  async salvarParametros() {
    const senhaFoiAlterada = !!this.parametros.renave_certificado_senha;
    this.loading = true;
    try {
      const salvo: any = await this.db.http.put('/api/config/parametros', this.parametros).toPromise();
      this.parametros = { ...this.parametros, ...salvo, renave_certificado_senha: '' };
      if (senhaFoiAlterada) {
        this.parametros.renave_certificado_senha_definida = true;
      }
      this.poNotification.success('Configurações salvas com sucesso!');
    } catch (e) {
      this.poNotification.error('Erro ao salvar configurações.');
    } finally {
      this.loading = false;
    }
  }

  onCertificadoUploadSuccess(event: any) {
    this.parametros.renave_certificado_nome_arquivo = event?.body?.nome_arquivo || this.parametros.renave_certificado_nome_arquivo;
    this.poNotification.success('Certificado digital enviado com sucesso!');
  }

  onUploadSuccess(event: any, field: string) {
    if (event && event.body && event.body.url) {
      this.parametros[field] = event.body.url;
      this.poNotification.success(`Arquivo ${event.body.filename} enviado com sucesso!`);
    }
  }

  async buscarCep() {
    if (!this.parametros.cep) return;
    this.buscandoCep = true;
    try {
      const endereco = await this.cepService.buscar(this.parametros.cep);
      if (!endereco) {
        this.poNotification.warning('CEP não encontrado.');
        return;
      }
      this.parametros.logradouro = endereco.logradouro;
      this.parametros.bairro = endereco.bairro;
      this.parametros.cidade = endereco.localidade;
      this.parametros.estado = endereco.uf;
      this.parametros.codigo_municipio_ibge = endereco.ibge;
    } catch {
      this.poNotification.error('Erro ao consultar o CEP.');
    } finally {
      this.buscandoCep = false;
    }
  }

  async buscarCnpj() {
    if (!this.parametros.cnpj) return;
    this.buscandoCnpj = true;
    try {
      const dados = await this.cnpjService.buscar(this.parametros.cnpj);
      if (!dados) {
        this.poNotification.warning('CNPJ não encontrado.');
        return;
      }
      this.parametros.cep = dados.cep;
      this.parametros.logradouro = dados.logradouro;
      this.parametros.numero = dados.numero;
      this.parametros.complemento = dados.complemento;
      this.parametros.bairro = dados.bairro;
      this.parametros.cidade = dados.municipio;
      this.parametros.estado = dados.uf;
      this.parametros.codigo_municipio_ibge = String(dados.codigo_municipio_ibge);
      this.poNotification.success(`CNPJ encontrado: ${dados.razao_social}. Endereço preenchido automaticamente.`);
    } catch {
      this.poNotification.error('Erro ao consultar o CNPJ.');
    } finally {
      this.buscandoCnpj = false;
    }
  }

  downloadModelo(tipo: string) {
    const url = `/api/config/modelos-csv/${tipo}`;
    window.open(url, '_blank');
  }

  onCsvUploadSuccess() {
    this.poNotification.success('Arquivo de modelo atualizado com sucesso! Agora você pode processar a importação.');
  }

  async checkData() {
    try {
      const response = await this.db.getAll('marcas', { limit: 1 });
      this.marcasCount = response?.total ?? (Array.isArray(response) ? response.length : 0);
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

  async exportarBackup() {
    this.backupLoading = true;
    try {
      const data: any = await firstValueFrom(this.db.http.get('/api/backup/export'));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alvorada_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      this.poNotification.success('Backup exportado com sucesso!');
    } catch (e) {
      this.poNotification.error('Erro ao exportar backup.');
    } finally {
      this.backupLoading = false;
    }
  }

  onSelecionarArquivoBackup(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result as string);
        this.confirmarImportarBackup(backup);
      } catch (e) {
        this.poNotification.error('Arquivo de backup inválido (não é um JSON válido).');
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file);
  }

  private confirmarImportarBackup(backup: any) {
    this.poDialog.confirm({
      title: 'Importar Backup',
      message: 'Isso vai atualizar os registros do banco com os dados deste arquivo (registros existentes não são apagados, só atualizados ou complementados). Deseja continuar?',
      confirm: async () => {
        this.backupLoading = true;
        try {
          const response: any = await firstValueFrom(this.db.http.post('/api/backup/import', backup));
          this.poNotification.success(response.message || 'Backup importado com sucesso!');
        } catch (e: any) {
          this.poNotification.error(e?.error?.error || 'Erro ao importar backup.');
        } finally {
          this.backupLoading = false;
        }
      }
    });
  }
}
