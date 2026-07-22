import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LojaService } from '../../services/loja';

@Component({
  selector: 'app-noticias-publicas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './noticias-publicas.html',
  styleUrl: './noticias-publicas.scss'
})
export class NoticiasPublicasComponent implements OnInit {
  parametros: any = {
    empresa_nome: 'Alvorada Veículos',
    logo_url: 'logo-alvorada-horizontal.png',
    loja_cor_primaria: '#f5c400',
    loja_rodape_texto: 'Sistema de Gestão Alvorada'
  };

  noticias: any[] = [];
  carregando = true;

  constructor(private loja: LojaService) {}

  async ngOnInit() {
    const [parametros, noticias] = await Promise.all([
      this.loja.getParametros(),
      this.loja.listarNoticias(50)
    ]);
    if (parametros) this.parametros = { ...this.parametros, ...parametros };
    this.noticias = noticias;
    this.atualizarFavicon(this.parametros.favicon_url);
    this.carregando = false;
  }

  private atualizarFavicon(url: string) {
    if (!url) return;
    const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (link) link.href = url;
  }
}
