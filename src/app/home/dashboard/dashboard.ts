import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  banksCount = 3;
  peopleCount = 4;
  centersCount = 4;
  movementsCount = 4;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
  }

  get userName(): string {
    return this.user?.name || 'Usuário';
  }

  get userRole(): string {
    return this.user?.role || 'user';
  }

  get userInitial(): string {
    return this.userName.charAt(0).toUpperCase();
  }

  get currentDate(): string {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  canAccess(role: string): boolean {
    if (role === 'admin') {
      return this.userRole === 'admin';
    }
    return this.user?.role === 'admin' || this.user?.role === 'user';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }
}
