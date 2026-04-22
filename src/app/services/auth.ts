import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { DatabaseService } from './database';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  permissoes: string[];
  theme?: 'light' | 'dark';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(private db: DatabaseService) {
    this.currentUserSubject = new BehaviorSubject<User | null>(
      JSON.parse(localStorage.getItem('currentUser') || 'null')
    );
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(email: string, password: string): Observable<User | null> {
    return from(this.db.init()).pipe(
      map(() => {
        const users = this.db.getAll('usuarios');
        const userFound = users.find(u => u.email === email && u.senha === password);
        
        if (userFound) {
          const profiles = this.db.getAll('perfis');
          const profile = profiles.find(p => p.id === userFound.perfil_id);
          
          const user: User = {
            id: userFound.id.toString(),
            email: userFound.email,
            name: userFound.nome,
            role: (userFound.perfil_id === 1) ? 'admin' : 'user',
            permissoes: profile ? profile.rotinas : [],
            theme: userFound.theme || 'light'
          };
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          return user;
        } else {
          return null;
        }
      }),
      catchError(err => {
        console.error('Login error:', err);
        throw err;
      })
    );
  }

  register(name: string, email: string, password: string): Observable<User> {
    return from(this.db.init()).pipe(
      map(() => {
        const newUser = { 
          nome: name, 
          email, 
          senha: password, 
          perfil_id: 2 // Default to Vendedor
        };
        this.db.insert('usuarios', newUser);
        
        // Find it back to get ID and Profile
        const users = this.db.getAll('usuarios');
        const userFound = users.find(u => u.email === email);
        const profiles = this.db.getAll('perfis');
        const profile = profiles.find(p => p.id === userFound.perfil_id);
        
        const user: User = {
          id: userFound.id.toString(),
          email,
          name,
          role: 'user',
          permissoes: profile ? profile.rotinas : []
        };
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user;
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

      // Persistir no banco real
      const dbUsers = this.db.getAll('usuarios');
      const userIdx = dbUsers.findIndex(u => u.id.toString() === user.id);
      if (userIdx !== -1) {
        dbUsers[userIdx].theme = theme;
        this.db.update('usuarios', dbUsers[userIdx].id, dbUsers[userIdx]);
      }
    }
  }
}
