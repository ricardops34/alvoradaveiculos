import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
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
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
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
      {
        path: 'relatorios',
        children: [
          { 
            path: 'extrato-bancario', 
            loadComponent: () => import('./pages/relatorios/extrato-bancario/extrato-bancario').then(m => m.ExtratoBancarioComponent)
          },
          { 
            path: 'extrato-veiculo', 
            loadComponent: () => import('./pages/relatorios/extrato-veiculo/extrato-veiculo').then(m => m.ExtratoVeiculoComponent)
          },
          { 
            path: 'relatorio-despesas', 
            loadComponent: () => import('./pages/relatorios/relatorio-despesas/relatorio-despesas').then(m => m.RelatorioDespesasComponent)
          }
        ]
      },
      { 
        path: 'usuarios', 
        loadComponent: () => import('./pages/usuarios/usuarios').then(m => m.UsuariosComponent)
      }
    ]
  },
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  }
];
