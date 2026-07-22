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
  parametros: any = { empresa_nome: 'Alvorada Veículos', logo_url: 'logo-alvorada-horizontal.png', telefone: '' };
  veiculo: any = null;
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

    if (!veiculo) {
      this.naoEncontrado = true;
    } else {
      this.veiculo = veiculo;
      await this.checarFavorito();
    }
    this.carregando = false;
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
