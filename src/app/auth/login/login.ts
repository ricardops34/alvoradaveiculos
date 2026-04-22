import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PoModule, PoNotificationService } from '@po-ui/ng-components';
import { AuthService, User } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PoModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  rememberMe = false;
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private poNotification: PoNotificationService
  ) {}

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