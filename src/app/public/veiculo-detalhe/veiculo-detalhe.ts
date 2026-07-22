import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LojaService } from '../../services/loja';
import { ClienteAuthComponent } from '../cliente-auth/cliente-auth';
import { AssistenteChatComponent } from '../assistente-chat/assistente-chat';

@Component({
  selector: 'app-veiculo-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule, ClienteAuthComponent, AssistenteChatComponent],
  templateUrl: './veiculo-detalhe.html',
  styleUrl: './veiculo-detalhe.scss'
})
export class VeiculoDetalheComponent implements OnInit {
  parametros: any = {
    empresa_nome: 'Alvorada Veículos',
    logo_url: 'logo-alvorada-horizontal.png',
    telefone: '',
    loja_cor_primaria: '#f5c400',
    loja_rodape_texto: 'Sistema de Gestão Alvorada',
    loja_marca_dagua_ativa: false,
    loja_marca_dagua_url: null,
    loja_marca_dagua_opacidade: 30
  };
  veiculo: any = null;
  estatisticas: any = null;
  estatisticasEscopo: 'modelo' | 'marca' | null = null;
  carregando = true;
  naoEncontrado = false;
  fotoAtual = 0;
  favorito = false;
  assistenteAtivo = false;
  mostrarAuth = false;

  constructor(private route: ActivatedRoute, private loja: LojaService) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const [parametros, veiculo, assistenteAtivo] = await Promise.all([
      this.loja.getParametros(),
      this.loja.buscarVeiculo(id!),
      this.loja.assistenteStatus()
    ]);
    if (parametros) this.parametros = { ...this.parametros, ...parametros };
    this.assistenteAtivo = assistenteAtivo;
    this.atualizarFavicon(this.parametros.favicon_url);

    if (!veiculo) {
      this.naoEncontrado = true;
    } else {
      this.veiculo = veiculo;
      await this.checarFavorito();
      await this.carregarEstatisticas();
    }
    this.carregando = false;
  }

  private atualizarFavicon(url: string) {
    if (!url) return;
    const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (link) link.href = url;
  }

  // Tabela de valores comparando este veículo com outros anúncios do mesmo modelo — e, se o
  // modelo tiver poucos (ou nenhum) outro anúncio, com os da mesma marca, pra sempre ter uma
  // comparação útil em vez de "comparado com 1 anúncio: o próprio".
  private async carregarEstatisticas() {
    if (this.veiculo.modelo_id) {
      const porModelo = await this.loja.estatisticas({ modelo_id: this.veiculo.modelo_id });
      if (porModelo?.total > 1) {
        this.estatisticasEscopo = 'modelo';
        this.estatisticas = porModelo;
        return;
      }
    }
    if (this.veiculo.marca_id) {
      this.estatisticasEscopo = 'marca';
      this.estatisticas = await this.loja.estatisticas({ marca_id: this.veiculo.marca_id });
    }
  }

  get clienteLogado() {
    return this.loja.clienteLogado;
  }

  async checarFavorito() {
    if (!this.loja.clienteToken) {
      this.favorito = false;
      return;
    }
    const favoritos = await this.loja.listarFavoritos();
    this.favorito = favoritos.some((f: any) => f.id === this.veiculo.id);
  }

  async alternarFavorito() {
    if (!this.loja.clienteToken) {
      this.mostrarAuth = true;
      return;
    }
    if (this.favorito) {
      await this.loja.desfavoritar(this.veiculo.id);
    } else {
      await this.loja.favoritar(this.veiculo.id);
    }
    this.favorito = !this.favorito;
  }

  onAutenticado() {
    this.mostrarAuth = false;
    this.checarFavorito();
  }

  get precoVeiculo(): number | null {
    return this.veiculo?.valor_avaliacao || this.veiculo?.valor_fipe || null;
  }

  get temFichaTecnica(): boolean {
    const v = this.veiculo;
    return !!(v?.motor || v?.potencia || v?.torque || v?.cambio || v?.tracao || v?.consumo_cidade || v?.consumo_estrada || v?.porta_malas || v?.tanque);
  }

  get linkWhatsapp(): string {
    const digits = (this.parametros.telefone || '').replace(/\D/g, '');
    const numero = digits.length <= 11 ? `55${digits}` : digits;
    const veiculoNome = `${this.veiculo?.marca_nome || ''} ${this.veiculo?.modelo_nome || ''}`.trim();
    const mensagem = encodeURIComponent(`Olá! Tenho interesse no ${veiculoNome} (${this.veiculo?.ano_fabricacao}/${this.veiculo?.ano_modelo}) que vi no site.`);
    return `https://wa.me/${numero}?text=${mensagem}`;
  }
}
