# Alvorada - Controle Financeiro Automotivo 🚗💨

Sistema especializado para gestão financeira de revendas de veículos, focado em controle de fluxo de caixa, gestão de estoque e inteligência de vendas.

---

## 🌟 Principais Funcionalidades

### 🚙 Módulo de Veículos & Catálogo
- **Hierarquia de Marcas e Modelos**: Cadastro organizado com anos de produção (Inicial/Final) e descrições detalhadas.
- **Gestão de Estoque**: Controle de status (Estoque, Vendido, Preparação, Manutenção).
- **Avaliação Visual**: Sistema de upload de múltiplas fotos (Base64) com galeria integrada.
- **Venda com Troca**: Processo de venda que permite registrar a entrada de um veículo como parte do pagamento.

### 🎨 Experiência do Usuário (UX/UI)
- **Modo Dark Inteligente**: Interface totalmente adaptada para uso noturno, com persistência da escolha no perfil do usuário.
- **Design Moderno**: Desenvolvido com **PO UI**, garantindo componentes robustos e acessíveis.

### 📊 Relatórios & Exportação
- **Exportação Profissional**: Gere extratos e relatórios de despesas em **Excel (XLSX)** e **PDF**.
- **Dashboard Financeiro**: Gráficos reativos de Receitas vs Despesas e distribuição de estoque.
- **Extrato por Veículo**: Saiba exatamente quanto cada carro custou e qual foi o lucro real.

---

## 🏗️ Arquitetura Técnica

- **Frontend**: Angular 21 + PO UI
- **Backend**: Node.js com Express (TypeScript)
- **Banco de Dados**: PostgreSQL
- **Infraestrutura**: Docker Swarm + Traefik (CI/CD via GitHub Actions)
- **Relatórios**: jsPDF, AutoTable e XLSX

---

## 🛠️ Roadmap de Desenvolvimento

### ✅ Concluído
- [x] Cadastro de Bancos e Centros de Custo.
- [x] Lançamentos Financeiros e Fluxo de Caixa.
- [x] Sistema Hierárquico de Marcas e Modelos.
- [x] Galeria de Fotos e Gestão de Status.
- [x] Exportação de Relatórios (PDF/XLS).

### 🚀 Próximas Etapas
- [ ] Geração de Proposta Comercial em PDF.
- [ ] Módulo de CRM (Status de Leads).
- [ ] Ranking de Vendedores e Comissões.
- [ ] Backup automático do banco de dados.

---

## 💻 Como Rodar o Projeto

### Pré-requisitos
- Docker e Docker Compose

### Execução Local
1. Clone o repositório:
   ```bash
   git clone https://github.com/ricardops34/alvoradaveiculos.git
   ```
2. Inicie os containers:
   ```bash
   docker-compose up -d
   ```
3. Acesse a aplicação:
   - Frontend: `http://localhost:4200`
   - API: `http://localhost:3000`

---

## 👤 Autor
**Ricardo Alvorada**

> **Nota**: Este é um sistema em constante evolução para prover a melhor experiência em gestão automotiva. 🏎️🏁
