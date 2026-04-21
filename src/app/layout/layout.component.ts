import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { 
  PoModule, 
  PoMenuItem, 
  PoToolbarProfile, 
  PoToolbarAction 
} from '@po-ui/ng-components';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, PoModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit {
  
  public readonly profile: PoToolbarProfile = {
    avatar: '',
    title: 'Usuário',
    subtitle: 'Bem-vindo'
  };

  public readonly profileActions: Array<PoToolbarAction> = [
    { label: 'Sair', action: this.logout.bind(this), icon: 'po-icon-exit', type: 'danger' }
  ];

  public readonly menus: Array<PoMenuItem> = [
    { label: 'Início', link: '/home/dashboard', icon: 'po-icon-home', shortLabel: 'Início' },
    { label: 'Veículos', link: '/home/veiculos', icon: 'po-icon-truck', shortLabel: 'Veículos' },
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

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.profile.title = user.name;
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }
}