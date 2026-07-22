import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LojaService } from '../../services/loja';

interface LinhaFicha {
  label: string;
  chave: string;
}

@Component({
  selector: 'app-comparador',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './comparador.html',
  styleUrl: './comparador.scss'
})
export class ComparadorComponent implements OnInit {
  parametros: any = {
    empresa_nome: 'Alvorada Veículos',
    logo_url: 'logo-alvorada-horizontal.png',
    loja_cor_primaria: '#f5c400',
    loja_rodape_texto: 'Sistema de Gestão Alvorada'
  };
  veiculos: any[] = [];
  carregando = true;

  // Só entram na comparação campos de ficha técnica onde ao menos um dos veículos tem valor —
  // evita linhas vazias quando o modelo não tem ficha técnica cadastrada.
  private readonly camposFicha: LinhaFicha[] = [
    { label: 'Motor', chave: 'motor' },
    { label: 'Potência', chave: 'potencia' },
    { label: 'Torque', chave: 'torque' },
    { label: 'Câmbio', chave: 'cambio' },
    { label: 'Tração', chave: 'tracao' },
    { label: 'Consumo Cidade', chave: 'consumo_cidade' },
    { label: 'Consumo Estrada', chave: 'consumo_estrada' },
    { label: 'Porta-malas', chave: 'porta_malas' },
    { label: 'Tanque', chave: 'tanque' }
  ];

  constructor(private route: ActivatedRoute, private router: Router, private loja: LojaService) {}

  async ngOnInit() {
    const parametros = await this.loja.getParametros();
    if (parametros) this.parametros = { ...this.parametros, ...parametros };
    this.atualizarFavicon(this.parametros.favicon_url);
    await this.carregarVeiculos();
  }

  private atualizarFavicon(url: string) {
    if (!url) return;
    const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (link) link.href = url;
  }

  private async carregarVeiculos() {
    this.carregando = true;
    const idsParam = this.route.snapshot.queryParamMap.get('ids') || '';
    const ids = idsParam.split(',').map(v => v.trim()).filter(Boolean);
    const resultados = await Promise.all(ids.map(id => this.loja.buscarVeiculo(id)));
    this.veiculos = resultados.filter(Boolean);
    this.carregando = false;
  }

  precoVeiculo(v: any): number | null {
    return v.valor_avaliacao || v.valor_fipe || null;
  }

  get opcionaisUniao(): string[] {
    const conjunto = new Set<string>();
    for (const v of this.veiculos) (v.opcionais || []).forEach((o: string) => conjunto.add(o));
    return Array.from(conjunto).sort();
  }

  get linhasFicha(): LinhaFicha[] {
    return this.camposFicha.filter(c => this.veiculos.some(v => v[c.chave]));
  }

  remover(veiculoId: number) {
    this.loja.removerComparar(veiculoId);
    this.veiculos = this.veiculos.filter(v => v.id !== veiculoId);
    if (!this.veiculos.length) {
      this.router.navigateByUrl('/');
      return;
    }
    const ids = this.veiculos.map(v => v.id).join(',');
    this.router.navigate(['/comparador'], { queryParams: { ids } });
  }
}
