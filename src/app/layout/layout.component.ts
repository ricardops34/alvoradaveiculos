import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { 
  PoMenuItem, 
  PoToolbarAction, 
  PoToolbarProfile, 
  PoModule 
} from '@po-ui/ng-components';
import { AuthService } from '../services/auth';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, PoModule],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit {
  menus: Array<PoMenuItem> = [];

  profile: PoToolbarProfile = {
    avatar: '',
    title: 'Usuário',
    subtitle: 'Bem-vindo'
  };

  profileActions: Array<PoToolbarAction> = [
    { label: 'Sair', action: this.logout.bind(this), icon: 'an an-sign-out' }
  ];

  toolbarActions: Array<PoToolbarAction> = [
    { 
      label: 'Trocar Tema', 
      action: this.toggleTheme.bind(this), 
      icon: this.themeService.getTheme() === 'light' ? 'an an-moon' : 'an an-sun' 
    }
  ];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.profile.title = user.name;
        this.profile.subtitle = user.role === 'admin' ? 'Administrador' : 'Usuário';
        this.buildMenu(user);
      }
    });
  }

  buildMenu(user: any) {
    const permissions = user.permissoes || [];
    const allMenus: Array<PoMenuItem> = [];

    // Dashboard
    if (permissions.includes('dashboard')) {
      allMenus.push({ label: 'Dashboard', link: '/home/dashboard', icon: 'an an-gauge', shortLabel: 'Início' });
    }

    // Veículos
    if (permissions.includes('veiculos')) {
      allMenus.push({ label: 'Veículos', link: '/home/veiculos', icon: 'an an-car', shortLabel: 'Veículos' });
    }

    // Financeiro
    const financeiroItems = [];
    if (permissions.includes('bancos')) financeiroItems.push({ label: 'Contas Bancárias', link: '/home/bancos', icon: 'an an-bank' });
    if (permissions.includes('centros_custo')) financeiroItems.push({ label: 'Centros de Custo', link: '/home/centros-custo', icon: 'an an-list-bullets' });
    if (permissions.includes('movimentos')) financeiroItems.push({ label: 'Movimentações', link: '/home/movimentos', icon: 'an an-currency-dollar' });

    if (financeiroItems.length > 0) {
      allMenus.push({ label: 'Financeiro', icon: 'an an-money', shortLabel: 'Financ', subItems: financeiroItems });
    }

    // Relatórios
    const relatorioItems = [];
    if (permissions.includes('extrato_bancario')) relatorioItems.push({ label: 'Extrato Bancário', link: '/home/relatorios/extrato-bancario', icon: 'an an-file-text' });
    if (permissions.includes('extrato_veiculo')) relatorioItems.push({ label: 'Extrato por Veículo', link: '/home/relatorios/extrato-veiculo', icon: 'an an-car-profile' });
    if (permissions.includes('relatorio_despesas')) relatorioItems.push({ label: 'Relatório de Despesas', link: '/home/relatorios/relatorio-despesas', icon: 'an an-chart-bar' });

    if (relatorioItems.length > 0) {
      allMenus.push({ label: 'Relatórios', icon: 'an an-files', shortLabel: 'Relat', subItems: relatorioItems });
    }

    // Cadastros Base
    if (permissions.includes('pessoas')) {
      allMenus.push({ label: 'Pessoas', link: '/home/pessoas', icon: 'an an-users', shortLabel: 'Pessoas' });
    }

    // Configurações
    if (permissions.includes('usuarios') || user.role === 'admin') {
      const configItems = [];
      configItems.push({ label: 'Perfis de Acesso', link: '/home/perfis', icon: 'an an-shield-check' });
      configItems.push({ label: 'Usuários', link: '/home/usuarios', icon: 'an an-user' });

      allMenus.push({
        label: 'Configurações', icon: 'an an-gear-six', shortLabel: 'Config', subItems: configItems
      });
    }

    this.menus = allMenus;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    // Atualiza o ícone do botão
    this.toolbarActions[0].icon = this.themeService.getTheme() === 'light' ? 'an an-moon' : 'an an-sun';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}