import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./auth/login/login').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./auth/register/register').then(m => m.RegisterComponent)
      }
    ]
  },
  {
    path: 'home',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./home/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'veiculos',
        loadComponent: () => import('./pages/veiculos/veiculos').then(m => m.VeiculosComponent)
      },
      {
        path: 'bancos',
        loadComponent: () => import('./pages/bancos/bancos').then(m => m.BancosComponent)
      },
      {
        path: 'pessoas',
        loadComponent: () => import('./pages/pessoas/pessoas').then(m => m.PessoasComponent)
      },
      {
        path: 'centros-custo',
        loadComponent: () => import('./pages/centros-custo/centros-custo').then(m => m.CentrosCustoComponent)
      },
      {
        path: 'movimentos',
        loadComponent: () => import('./pages/movimentos/movimentos').then(m => m.MovimentosComponent)
      },
      // Relatórios
      {
        path: 'relatorios/extrato-bancario',
        loadComponent: () => import('./pages/relatorios/extrato-bancario/extrato-bancario').then(m => m.ExtratoBancarioComponent)
      },
      {
        path: 'relatorios/extrato-veiculo',
        loadComponent: () => import('./pages/relatorios/extrato-veiculo/extrato-veiculo').then(m => m.ExtratoVeiculoComponent)
      },
      {
        path: 'relatorios/relatorio-despesas',
        loadComponent: () => import('./pages/relatorios/relatorio-despesas/relatorio-despesas').then(m => m.RelatorioDespesasComponent)
      },
      // Configurações
      {
        path: 'usuarios',
        loadComponent: () => import('./pages/usuarios/usuarios').then(m => m.UsuariosComponent)
      },
      {
        path: 'perfis',
        loadComponent: () => import('./pages/perfis/perfis').then(m => m.PerfisComponent)
      }
    ]
  }
];
