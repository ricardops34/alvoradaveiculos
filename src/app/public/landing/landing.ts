import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LojaService } from '../../services/loja';
import { ClienteAuthComponent } from '../cliente-auth/cliente-auth';
import { AssistenteChatComponent } from '../assistente-chat/assistente-chat';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ClienteAuthComponent, AssistenteChatComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.scss'
})
export class LandingComponent implements OnInit {
  parametros: any = {
    empresa_nome: 'Alvorada Veículos',
    logo_url: 'logo-alvorada-horizontal.png',
    loja_cor_primaria: '#f5c400',
    loja_hero_titulo: 'Encontre o veículo ideal',
    loja_hero_subtitulo: 'Estoque atualizado, direto da loja.',
    loja_rodape_texto: 'Sistema de Gestão Alvorada',
    loja_estilo_lista: 'grid',
    loja_marca_dagua_ativa: false,
    loja_marca_dagua_url: null,
    loja_marca_dagua_opacidade: 30
  };

  veiculos: any[] = [];
  marcas: any[] = [];
  modelos: any[] = [];
  anuncios: any[] = [];
  noticias: any[] = [];
  assistenteAtivo = false;
  favoritosIds = new Set<number>();
  mostrarAuth = false;
  mostrarFavoritos = false;
  compararIds = new Set<number>();
  private readonly maxComparar = 4;

  page = 1;
  pageSize = 12;
  hasNext = false;
  totalVeiculos = 0;
  carregando = true;
  carregandoMais = false;

  filtro = { tipo_veiculo: '', marca_id: '', modelo_id: '', texto: '' };

  public readonly tiposVeiculo = ['Carro', 'Moto', 'Caminhão', 'Náutica'];
  public readonly tipoIcones: Record<string, string> = {
    Carro: '🚗',
    Moto: '🏍️',
    Caminhão: '🚚',
    Náutica: '🚤'
  };

  constructor(private loja: LojaService) {}

  async ngOnInit() {
    const [parametros, marcas, anuncios, noticias, assistenteAtivo] = await Promise.all([
      this.loja.getParametros(),
      this.loja.listarMarcas(),
      this.loja.listarAnuncios('lateral'),
      this.loja.listarNoticias(3),
      this.loja.assistenteStatus()
    ]);
    if (parametros) this.parametros = { ...this.parametros, ...parametros };
    this.marcas = marcas;
    this.anuncios = anuncios;
    this.noticias = noticias;
    this.assistenteAtivo = assistenteAtivo;
    this.atualizarFavicon(this.parametros.favicon_url);
    this.compararIds = new Set(this.loja.getCompararIds());
    await this.carregarFavoritos();
    await this.buscar();
  }

  private atualizarFavicon(url: string) {
    if (!url) return;
    const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (link) link.href = url;
  }

  get clienteLogado() {
    return this.loja.clienteLogado;
  }

  async carregarFavoritos() {
    if (!this.loja.clienteToken) {
      this.favoritosIds = new Set();
      return;
    }
    const favoritos = await this.loja.listarFavoritos();
    this.favoritosIds = new Set(favoritos.map((f: any) => f.id));
  }

  async alternarFavorito(veiculo: any, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.loja.clienteToken) {
      this.mostrarAuth = true;
      return;
    }

    if (this.favoritosIds.has(veiculo.id)) {
      await this.loja.desfavoritar(veiculo.id);
      this.favoritosIds.delete(veiculo.id);
    } else {
      await this.loja.favoritar(veiculo.id);
      this.favoritosIds.add(veiculo.id);
    }
  }

  onAutenticado() {
    this.mostrarAuth = false;
    this.carregarFavoritos();
  }

  get podeAdicionarComparar(): boolean {
    return this.compararIds.size < this.maxComparar;
  }

  alternarComparar(veiculo: any, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.compararIds.has(veiculo.id) && !this.podeAdicionarComparar) return;
    this.compararIds = new Set(this.loja.alternarComparar(veiculo.id, this.maxComparar));
  }

  limparComparar() {
    this.loja.limparComparar();
    this.compararIds = new Set();
  }

  get compararQueryParams() {
    return { ids: Array.from(this.compararIds).join(',') };
  }

  sair() {
    this.loja.logoutCliente();
    this.favoritosIds = new Set();
  }

  async onMarcaChange() {
    this.filtro.modelo_id = '';
    this.modelos = this.filtro.marca_id ? await this.loja.listarModelos(Number(this.filtro.marca_id)) : [];
    await this.buscar();
  }

  async selecionarTipo(tipo: string) {
    this.filtro.tipo_veiculo = tipo;
    await this.buscar();
  }

  async selecionarMarca(marcaId: number | string) {
    this.filtro.marca_id = marcaId ? String(marcaId) : '';
    await this.onMarcaChange();
  }

  async buscar() {
    this.page = 1;
    this.veiculos = [];
    await this.carregar();
  }

  async carregarMais() {
    this.page++;
    await this.carregar(true);
  }

  private async carregar(maisResultados = false) {
    if (maisResultados) this.carregandoMais = true;
    else this.carregando = true;

    const params: any = { page: this.page, limit: this.pageSize };
    if (this.filtro.tipo_veiculo) params.tipo_veiculo = this.filtro.tipo_veiculo;
    if (this.filtro.marca_id) params.marca_id = this.filtro.marca_id;
    if (this.filtro.modelo_id) params.modelo_id = this.filtro.modelo_id;
    if (this.filtro.texto) params.filter = this.filtro.texto;

    const response = await this.loja.listarVeiculos(params);
    this.veiculos = [...this.veiculos, ...(response.items || [])];
    this.hasNext = response.hasNext || false;
    this.totalVeiculos = response.total || 0;
    this.carregando = false;
    this.carregandoMais = false;
  }

  precoVeiculo(v: any): number | null {
    return v.valor_avaliacao || v.valor_fipe || null;
  }
}
