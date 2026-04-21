import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoModule, PoMenuItem, PoToolbarProfile, PoToolbarAction } from '@po-ui/ng-components';
import { AuthService, User } from '../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, PoModule],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit {
  
  menus: Array<PoMenuItem> = [];
  user: User | null = null;

  profile: PoToolbarProfile = {
    title: 'Usuário',
    subtitle: 'user@alvorada.com'
  };

  profileActions: Array<PoToolbarAction> = [
    { label: 'Sair', action: this.logout.bind(this), icon: 'po-icon-exit' }
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.profile.title = user.name;
        this.profile.subtitle = user.email;
        this.updateMenu(user.role);
      }
    });
  }

  updateMenu(role: string) {
    const allMenus: Array<PoMenuItem> = [
      { label: 'Início', link: '/home/dashboard', icon: 'po-icon-home', shortLabel: 'Início' },
      { label: 'Veículos', link: '/home/veiculos', icon: 'po-icon-car', shortLabel: 'Veículos' },
      { label: 'Bancos', link: '/home/bancos', icon: 'po-icon-finance', shortLabel: 'Bancos' },
      { label: 'Pessoas', link: '/home/pessoas', icon: 'po-icon-user', shortLabel: 'Pessoas' },
      { label: 'Centro de Custo', link: '/home/centros-custo', icon: 'po-icon-Target', shortLabel: 'C. Custo' },
      { label: 'Movimentos', link: '/home/movimentos', icon: 'po-icon-finance-secure', shortLabel: 'Movimentos' },
      { label: 'Relatórios', icon: 'po-icon-document-filled', shortLabel: 'Relatórios', subItems: [
        { label: 'Extrato Bancário', link: '/home/relatorios/extrato-bancario' },
        { label: 'Extrato por Veículo', link: '/home/relatorios/extrato-veiculo' },
        { label: 'Relatório de Despesas', link: '/home/relatorios/relatorio-despesas' }
      ]}
    ];

    // Menu Administrativo (Apenas para Admin)
    if (role === 'admin') {
      allMenus.push({
        label: 'Configurações', icon: 'po-icon-settings', shortLabel: 'Config', subItems: [
          { label: 'Usuários e Permissões', link: '/home/usuarios' }
        ]
      });
    }

    this.menus = allMenus;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }
}