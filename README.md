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
2. Opcionalmente, copie `.env.dev.example` para `.env` e ajuste as portas ou credenciais.
3. Construa e inicie os containers de desenvolvimento:
   ```bash
   docker compose -f docker-compose.dev.yml up -d --build
   ```
4. Acesse a aplicação:
   - Frontend: `http://localhost:4200`
   - API/health check: `http://localhost:3000/api/health`

Para acompanhar os logs, use
`docker compose -f docker-compose.dev.yml logs -f`. Para encerrar os
containers, use `docker compose -f docker-compose.dev.yml down`.

### Ambiente de desenvolvimento com hot reload

Use a configuração de desenvolvimento para refletir automaticamente as
alterações feitas no frontend e na API:

```bash
docker compose -f docker-compose.dev.yml up --build
```

O frontend estará em `http://localhost:4200` e a API em
`http://localhost:3000`. Para encerrar, pressione `Ctrl+C` ou execute:

```bash
docker compose -f docker-compose.dev.yml down
```

### Publicação no Docker Hub

O script PowerShell constrói e publica as imagens da API e do frontend na
organização `bjsoftware`:

```powershell
.\publish.ps1
```

Por padrão, as imagens recebem a tag `latest`. Para publicar uma versão:

```powershell
.\publish.ps1 -Tag 1.0.0
```

Imagens geradas: `bjsoftware/alvorada-api` e `bjsoftware/alvorada-crm`.

### Stack no Portainer

Use o arquivo `docker-compose.yml` em **Stacks > Add stack** no Portainer. Use
`.env.example` como referência e defina as seguintes variáveis antes de publicar:

- `HOST_URL`: domínio do sistema, sem `https://`;
- `DB_HOST`: hostname do PostgreSQL acessível pela `network_db`;
- `DB_PORT`: porta do PostgreSQL (normalmente `5432`);
- `DB_NAME`, `DB_USER` e `DB_PASS`: credenciais do banco;
- `IMAGE_TAG`: tag das imagens (opcional, padrão `latest`).

As redes Docker externas `network_db` e `network_public` devem existir no
cluster. O Traefik deve estar conectado à `network_public` e possuir o resolver
de certificados `letsencryptresolver`.

---

## 👤 Autor
**Ricardo Alvorada**

> **Nota**: Este é um sistema em constante evolução para prover a melhor experiência em gestão automotiva. 🏎️🏁
