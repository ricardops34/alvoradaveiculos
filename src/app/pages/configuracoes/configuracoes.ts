import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PoModule, PoNotificationService, PoDialogService, PoSelectOption } from '@po-ui/ng-components';
import { firstValueFrom } from 'rxjs';
import { DatabaseService } from '../../services/database';
import { AuthService } from '../../services/auth';
import { CepService } from '../../services/cep';
import { CnpjService } from '../../services/cnpj';
import { MunicipiosLookupService } from '../../services/lookups';

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
  estadoOptions: PoSelectOption[] = [];

  constructor(
    private db: DatabaseService,
    private poNotification: PoNotificationService,
    private authService: AuthService,
    private poDialog: PoDialogService,
    private cepService: CepService,
    private cnpjService: CnpjService,
    public municipiosLookup: MunicipiosLookupService
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
    smtp_pass_definida: false,
    smtp_from: '',
    cnpj: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    pais_id: 1,
    estado_id: null,
    municipio_id: null,
    renave_responsavel_nome: '',
    renave_responsavel_cpf: '',
    renave_certificado_nome_arquivo: '',
    renave_certificado_senha_definida: false,
    renave_certificado_senha: '',
    telefone: '',
    loja_ativa: false,
    grok_ativo: false,
    grok_api_key: '',
    grok_api_key_definida: false,
    invertexto_token: '',
    invertexto_token_definido: false
  };

  backupsAutomaticos: any[] = [];

  async ngOnInit() {
    await this.checkData();
    await this.carregarEstados();
    await this.carregarParametros();
    await this.carregarBackupsAutomaticos();
  }

  async carregarBackupsAutomaticos() {
    try {
      const response: any = await firstValueFrom(this.db.http.get('/api/backup/automaticos'));
      this.backupsAutomaticos = response?.items || [];
    } catch (e) {
      console.error('Erro ao listar backups automáticos', e);
    }
  }

  restaurarBackupAutomatico(item: any) {
    this.poDialog.confirm({
      title: 'Restaurar Backup',
      message: `Restaurar o backup de ${new Date(item.criado_em).toLocaleString('pt-BR')}? Isso atualiza os registros existentes com os dados desse backup (não apaga nada).`,
      confirm: async () => {
        this.backupLoading = true;
        try {
          const response: any = await firstValueFrom(this.db.http.post(`/api/backup/automaticos/${item.filename}/restaurar`, {}));
          this.poNotification.success(response.message || 'Backup restaurado com sucesso!');
        } catch (e: any) {
          this.poNotification.error(e?.error?.error || 'Erro ao restaurar backup.');
        } finally {
          this.backupLoading = false;
        }
      }
    });
  }

  async carregarEstados() {
    const response: any = await this.db.getAll('localizacao/estados', {});
    const estados = response?.items || response || [];
    this.estadoOptions = estados.map((e: any) => ({ label: `${e.sigla} - ${e.nome}`, value: e.id }));
  }

  async carregarParametros() {
    try {
      const dados: any = await this.db.http.get('/api/config/parametros/completo').toPromise();
      this.parametros = { ...this.parametros, ...dados, renave_certificado_senha: '', smtp_pass: '', grok_api_key: '', invertexto_token: '' };
    } catch (e) {
      console.error('Erro ao carregar parâmetros', e);
    }
  }

  async salvarParametros() {
    const senhaFoiAlterada = !!this.parametros.renave_certificado_senha;
    const smtpSenhaFoiAlterada = !!this.parametros.smtp_pass;
    const grokKeyFoiAlterada = !!this.parametros.grok_api_key;
    const invertextoTokenFoiAlterado = !!this.parametros.invertexto_token;
    this.loading = true;
    try {
      const salvo: any = await this.db.http.put('/api/config/parametros', this.parametros).toPromise();
      this.parametros = { ...this.parametros, ...salvo, renave_certificado_senha: '', smtp_pass: '', grok_api_key: '', invertexto_token: '' };
      if (senhaFoiAlterada) {
        this.parametros.renave_certificado_senha_definida = true;
      }
      if (smtpSenhaFoiAlterada) {
        this.parametros.smtp_pass_definida = true;
      }
      if (grokKeyFoiAlterada) {
        this.parametros.grok_api_key_definida = true;
      }
      if (invertextoTokenFoiAlterado) {
        this.parametros.invertexto_token_definido = true;
      }
      this.poNotification.success('Configurações salvas com sucesso!');
    } catch (e) {
      this.poNotification.error('Erro ao salvar configurações.');
    } finally {
      this.loading = false;
    }
  }

  testeEmailDestino = '';
  testandoEmail = false;

  async testarEmail() {
    if (!this.testeEmailDestino) {
      this.poNotification.warning('Informe um e-mail de destino para o teste.');
      return;
    }
    this.testandoEmail = true;
    try {
      const response: any = await firstValueFrom(this.db.http.post('/api/config/testar-email', { destinatario: this.testeEmailDestino }));
      this.poNotification.success(response.message || 'E-mail de teste enviado!');
    } catch (e: any) {
      this.poNotification.error(e?.error?.error || 'Erro ao enviar e-mail de teste.');
    } finally {
      this.testandoEmail = false;
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
      this.parametros.estado_id = endereco.estado_id || null;
      this.parametros.municipio_id = endereco.municipio_id || null;
      if (!endereco.municipio_id) {
        this.poNotification.warning(`Endereço preenchido, mas "${endereco.municipio_nome}" ainda não está na base de Localização. Sincronize com o IBGE em Configurações > Localização.`);
      }
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
      const municipio = await this.cepService.resolverMunicipioPorIbge(dados.codigo_municipio_ibge);
      this.parametros.estado_id = municipio?.estado_id || null;
      this.parametros.municipio_id = municipio?.municipio_id || null;
      if (!municipio) {
        this.poNotification.warning(`Endereço preenchido, mas "${dados.municipio}" ainda não está na base de Localização. Sincronize com o IBGE em Configurações > Localização.`);
      }
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
