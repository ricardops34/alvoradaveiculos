import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { DatabaseService } from './database';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
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
          const user: User = {
            id: userFound.id.toString(),
            email: userFound.email,
            name: userFound.nome,
            role: userFound.role
          };
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          return user;
        } else {
          return null;
        }
      })
    );
  }

  register(name: string, email: string, password: string): Observable<User> {
    return from(this.db.init()).pipe(
      map(() => {
        const newUser = { nome: name, email, senha: password, role: 'user' };
        this.db.insert('usuarios', newUser);
        
        // Find it back to get ID
        const users = this.db.getAll('usuarios');
        const userFound = users.find(u => u.email === email);
        
        const user: User = {
          id: userFound.id.toString(),
          email,
          name,
          role: 'user'
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
}
