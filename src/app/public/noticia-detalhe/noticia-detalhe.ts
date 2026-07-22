import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LojaService } from '../../services/loja';

@Component({
  selector: 'app-noticia-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './noticia-detalhe.html',
  styleUrl: './noticia-detalhe.scss'
})
export class NoticiaDetalheComponent implements OnInit {
  parametros: any = {
    empresa_nome: 'Alvorada Veículos',
    logo_url: 'logo-alvorada-horizontal.png',
    loja_cor_primaria: '#f5c400',
    loja_rodape_texto: 'Sistema de Gestão Alvorada'
  };

  noticia: any = null;
  carregando = true;
  naoEncontrada = false;

  constructor(private route: ActivatedRoute, private loja: LojaService) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const [parametros, noticia] = await Promise.all([
      this.loja.getParametros(),
      this.loja.buscarNoticia(id!)
    ]);
    if (parametros) this.parametros = { ...this.parametros, ...parametros };
    this.atualizarFavicon(this.parametros.favicon_url);

    if (!noticia) {
      this.naoEncontrada = true;
    } else {
      this.noticia = noticia;
    }
    this.carregando = false;
  }

  private atualizarFavicon(url: string) {
    if (!url) return;
    const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (link) link.href = url;
  }
}
