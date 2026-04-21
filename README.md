# AngularPoUiApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

# Alvorada - Controle Financeiro Automotivo

Sistema especializado para gestão financeira de revendas de veículos, focado em controle de fluxo de caixa, gestão de estoque e stakeholders.

## 📌 Objetivo do Projeto
Prover uma ferramenta ágil e offline-first para proprietários de lojas de veículos gerenciarem suas operações financeiras, integrando o cadastro de veículos diretamente com a movimentação bancária.

## 🚀 Tecnologias
- **Frontend**: Angular 21
- **UI**: PO UI (v21.10.0)
- **Database**: SQLite (via `sql.js`) com persistência em LocalStorage
- **Gerenciamento de Estado**: Serviços Reativos com RxJS

## 📂 Entidades do Sistema

### 1. Pessoas
Gestão de todos os stakeholders envolvidos na operação:
- **Clientes**: Compradores de veículos.
- **Fornecedores**: Origem de veículos ou peças.
- **Vendedores**: Responsáveis pelas vendas e comissões.
- **Sócios**: Gestão de retiradas e aportes.

### 2. Veículos
Coração do negócio, contendo:
- Marca, Modelo, Ano e Placa.
- Status (Em estoque, Vendido, Manutenção, Preparação).
- Custos agregados (Valor de compra + Manutenções).

### 3. Bancos
Controle de contas correntes e poupanças, permitindo o acompanhamento de saldos reais em múltiplas instituições.

### 4. Centro de Custo
Estrutura para categorização de receitas e despesas, permitindo análises por departamento (Vendas, Administrativo, Oficina).

### 5. Movimento Bancário
Registro de todas as entradas e saídas, com possibilidade de vínculo direto a um veículo para cálculo de lucro por unidade.

## 🛠️ Roadmap de Desenvolvimento

### Fase 1: Cadastros Fundamentais
- [x] Cadastro de Bancos
- [x] Cadastro de Pessoas (Básico)
- [x] Cadastro de Centro de Custo
- [x] Lançamentos Financeiros (Básico)
- [ ] **Novo: Cadastro de Veículos**

### Fase 2: Inteligência Financeira
- [ ] Vínculo de despesas por veículo.
- [ ] Dashboard de lucratividade por venda.
- [ ] Controle de comissões por vendedor.

### Fase 3: Documentos e Segurança
- [ ] Emissão de recibos em PDF.
- [ ] Sistema de backup do banco de dados local.
- [ ] Controle de permissões (Login).

---

## 💻 Como Rodar
1. `npm install`
2. `npm start`
3. Acesse `http://localhost:4200`

> **Nota**: Este sistema utiliza SQLite local. Seus dados ficam salvos apenas neste navegador. Lembre-se de fazer backup periodicamente.
