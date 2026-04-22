import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private activeTheme: 'light' | 'dark' = 'light';

  constructor() {
    const savedTheme = localStorage.getItem('alvorada_theme') as 'light' | 'dark';
    if (savedTheme) {
      this.setTheme(savedTheme);
    }
  }

  getTheme() {
    return this.activeTheme;
  }

  toggleTheme() {
    this.setTheme(this.activeTheme === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: 'light' | 'dark') {
    this.activeTheme = theme;
    localStorage.setItem('alvorada_theme', theme);
    
    const body = document.getElementsByTagName('body')[0];
    if (theme === 'dark') {
      body.classList.add('po-theme-dark');
    } else {
      body.classList.remove('po-theme-dark');
    }
  }
}
