import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LojaService } from '../../services/loja';

interface Mensagem {
  role: 'user' | 'assistant';
  content: string;
}

// Ícone flutuante de assistente de IA (Grok) — só deve ser renderizado pelo componente pai
// quando `assistenteAtivo` (ver LojaService.assistenteStatus) for verdadeiro, ou seja, quando a
// loja tiver a chave da xAI configurada em Configurações.
@Component({
  selector: 'app-assistente-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './assistente-chat.html',
  styleUrl: './assistente-chat.scss'
})
export class AssistenteChatComponent {
  @Input() nomeEmpresa = 'Alvorada Veículos';

  aberto = false;
  pergunta = '';
  enviando = false;
  mensagens: Mensagem[] = [
    { role: 'assistant', content: 'Olá! Sou o assistente virtual da loja. Pode perguntar sobre os veículos disponíveis no estoque — marca, modelo, ano, preço ou opcionais.' }
  ];

  constructor(private loja: LojaService) {}

  toggle() {
    this.aberto = !this.aberto;
  }

  async enviar() {
    const texto = this.pergunta.trim();
    if (!texto || this.enviando) return;

    this.mensagens.push({ role: 'user', content: texto });
    this.pergunta = '';
    this.enviando = true;

    try {
      const historico = this.mensagens.map(m => ({ role: m.role, content: m.content }));
      const resposta = await this.loja.perguntarAssistente(texto, historico);
      this.mensagens.push({ role: 'assistant', content: resposta });
    } catch {
      this.mensagens.push({ role: 'assistant', content: 'Não consegui responder agora — tente novamente em instantes.' });
    } finally {
      this.enviando = false;
    }
  }
}
