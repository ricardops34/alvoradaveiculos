import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LojaService } from '../../services/loja';

// Modal de login/cadastro do Cliente da loja pública (autenticação própria, só usada pra
// favoritar veículos e conversar com o assistente — não tem nada a ver com o login de
// usuários do CRM em /auth/login).
@Component({
  selector: 'app-cliente-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cliente-auth.html',
  styleUrl: './cliente-auth.scss'
})
export class ClienteAuthComponent {
  @Output() autenticado = new EventEmitter<void>();
  @Output() fechar = new EventEmitter<void>();

  modo: 'login' | 'cadastro' = 'login';
  carregando = false;
  erro = '';

  login = { cpf: '', senha: '' };
  cadastro = {
    nome: '', cpf: '', data_nascimento: '', email: '', email_confirma: '',
    telefone: '', telefone_secundario: '', senha: '', senha_confirma: ''
  };

  constructor(private loja: LojaService) {}

  async fazerLogin() {
    this.erro = '';
    this.carregando = true;
    const resultado = await this.loja.loginCliente(this.login.cpf, this.login.senha);
    this.carregando = false;
    if (resultado.ok) {
      this.autenticado.emit();
    } else {
      this.erro = resultado.erro || 'CPF ou senha inválidos.';
    }
  }

  async fazerCadastro() {
    this.erro = '';
    if (this.cadastro.email !== this.cadastro.email_confirma) {
      this.erro = 'Os e-mails informados não conferem.';
      return;
    }
    if (this.cadastro.senha !== this.cadastro.senha_confirma) {
      this.erro = 'As senhas informadas não conferem.';
      return;
    }
    if (!this.cadastro.senha || this.cadastro.senha.length < 6) {
      this.erro = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }

    this.carregando = true;
    const resultado = await this.loja.registrarCliente({
      nome: this.cadastro.nome,
      cpf: this.cadastro.cpf,
      data_nascimento: this.cadastro.data_nascimento || null,
      email: this.cadastro.email,
      senha: this.cadastro.senha,
      telefone: this.cadastro.telefone || null,
      telefone_secundario: this.cadastro.telefone_secundario || null
    });
    this.carregando = false;
    if (resultado.ok) {
      this.autenticado.emit();
    } else {
      this.erro = resultado.erro || 'Erro ao criar conta.';
    }
  }
}
