import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PoModule, PoNotificationService } from '@po-ui/ng-components';
import { AuthService, User } from '../../services/auth';
import { DatabaseService } from '../../services/database';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PoModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  rememberMe = false;
  loading = false;

  parametros: any = {
    empresa_nome: 'Alvorada Veículos',
    logo_url: 'icone.png',
    background_url: 'fundologin.png'
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private poNotification: PoNotificationService,
    private db: DatabaseService
  ) {}

  async ngOnInit() {
    try {
      const p: any = await this.db.http.get('/api/config/parametros').toPromise();
      if (p) {
        this.parametros = {
          ...p,
          empresa_nome: p.empresa_nome || 'BJ Software'
        };
      }
    } catch (e) {
      console.error('Erro ao carregar parametros no login', e);
    }
  }

  onLogin(form: any): void {
    if (!this.email || !this.password) {
      return;
    }

    this.loading = true;

    this.authService.login(this.email, this.password).subscribe({
      next: (user: User | null) => {
        this.loading = false;
        if (user) {
          this.router.navigate(['/home']);
        } else {
          this.poNotification.error('Usuário ou senha inválidos!');
        }
      },
      error: () => {
        this.loading = false;
        this.poNotification.error('Erro ao tentar realizar login. Tente novamente.');
      }
    });
  }
}