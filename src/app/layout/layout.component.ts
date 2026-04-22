import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
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
  imports: [RouterOutlet, PoModule, CommonModule],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit {
  menus: Array<PoMenuItem> = [];
  isDarkMode: boolean = false;

  profile: PoToolbarProfile = {
    avatar: '',
    title: 'Usuário',
    subtitle: 'Bem-vindo'
  };

  profileActions: Array<PoToolbarAction> = [
    { label: 'Sair', action: this.logout.bind(this), icon: 'an an-sign-out' }
  ];

  constructor(
    private authService: AuthService, 
    private router: Router,
    private themeService: ThemeService
  ) {
    this.isDarkMode = this.themeService.getTheme() === 'dark';
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.profile.title = user.name;
        this.profile.subtitle = user.role === 'admin' ? 'Administrador' : 'Usuário';
        this.buildMenu(user);
        
        // Aplicar o tema salvo no usuário
        if (user.theme) {
          this.themeService.setTheme(user.theme);
          this.isDarkMode = user.theme === 'dark';
        }
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
      const veiculoItems = [];
      veiculoItems.push({ label: 'Gerenciar Veículos', link: '/home/veiculos', icon: 'an an-car' });
      veiculoItems.push({ label: 'Marcas e Modelos', link: '/home/marcas', icon: 'an an-tag' });
      
      allMenus.push({ label: 'Veículos', icon: 'an an-car', shortLabel: 'Veículos', subItems: veiculoItems });
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
    this.isDarkMode = this.themeService.getTheme() === 'dark';
    
    // Salvar no perfil do usuário
    this.authService.updateUserTheme(this.themeService.getTheme());
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}