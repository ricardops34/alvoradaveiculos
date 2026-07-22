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
    logo_url: 'logo-alvorada-horizontal.png'
  };

  veiculos: any[] = [];
  marcas: any[] = [];
  modelos: any[] = [];
  anuncios: any[] = [];
  noticias: any[] = [];
  estatisticas: any = null;
  assistenteAtivo = false;
  favoritosIds = new Set<number>();
  mostrarAuth = false;
  mostrarFavoritos = false;

  page = 1;
  pageSize = 12;
  hasNext = false;
  carregando = true;
  carregandoMais = false;

  filtro = { tipo_veiculo: '', marca_id: '', modelo_id: '', texto: '' };

  public readonly tiposVeiculo = ['Carro', 'Moto', 'Caminhão', 'Náutica'];

  constructor(private loja: LojaService) {}

  async ngOnInit() {
    const [parametros, marcas, anuncios, noticias, estatisticas, assistenteAtivo] = await Promise.all([
      this.loja.getParametros(),
      this.loja.listarMarcas(),
      this.loja.listarAnuncios('lateral'),
      this.loja.listarNoticias(3),
      this.loja.estatisticas(),
      this.loja.assistenteStatus()
    ]);
    if (parametros) this.parametros = { ...this.parametros, ...parametros };
    this.marcas = marcas;
    this.anuncios = anuncios;
    this.noticias = noticias;
    this.estatisticas = estatisticas;
    this.assistenteAtivo = assistenteAtivo;
    await this.carregarFavoritos();
    await this.buscar();
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

  sair() {
    this.loja.logoutCliente();
    this.favoritosIds = new Set();
  }

  async onMarcaChange() {
    this.filtro.modelo_id = '';
    this.modelos = this.filtro.marca_id ? await this.loja.listarModelos(Number(this.filtro.marca_id)) : [];
    await this.buscar();
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
    this.carregando = false;
    this.carregandoMais = false;
  }

  precoVeiculo(v: any): number | null {
    return v.valor_avaliacao || v.valor_fipe || null;
  }
}
