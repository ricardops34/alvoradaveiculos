import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DatabaseService } from './database';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  permissoes: string[];
  theme?: 'light' | 'dark';
  token?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(private http: HttpClient, private db: DatabaseService) {
    this.currentUserSubject = new BehaviorSubject<User | null>(
      JSON.parse(localStorage.getItem('currentUser') || 'null')
    );
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public getToken(): string | null {
    return this.currentUserSubject.value?.token || null;
  }

  login(email: string, password: string): Observable<User | null> {
    return this.http.post<User>('/api/auth/login', { email, senha: password }).pipe(
      map((user: User) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user;
      }),
      catchError(err => {
        console.error('Login error:', err);
        return of(null);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.currentUserValue !== null;
  }

  updateUserTheme(theme: 'light' | 'dark'): void {
    const user = this.currentUserValue;
    if (user) {
      user.theme = theme;
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUserSubject.next(user);

      // Persistir no banco via API
      this.db.updateUserTheme(user.id, theme);
    }
  }
}
