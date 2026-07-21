# 📋 Lista de Tarefas - Alvorada CRM

Este arquivo centraliza o progresso do desenvolvimento e as próximas metas do projeto.

---

## ✅ Concluído (Entregue)

### 🏗️ Infraestrutura e CI/CD
- [x] Configuração de build Angular para produção (ajuste de budgets 5MB).
- [x] Deploy em Docker Swarm com suporte a Traefik.
- [x] Identidade visual: Alteração do nome para "Alvorada" em todo o sistema.

### 🚗 Módulo de Veículos
- [x] Cadastro completo de veículos.
- [x] Campo de **Valor de Avaliação**.
- [x] Sistema de **Upload de Fotos** (Base64) com galeria de visualização.
- [x] Lógica de status (Estoque, Vendido, Preparação, etc).
- [x] **Novo: Sistema Hierárquico de Marcas e Modelos** (com anos e descrição).

### 🎨 Interface e Experiência (UX)
- [x] Implementação do **Tema Dark** (Modo Noturno) via CSS Variables.
- [x] Alternância dinâmica de tema no Toolbar (Ícone Lua/Sol).
- [x] **Persistência de Tema** no perfil do usuário (salvo no banco).

### 📊 Relatórios e Inteligência
- [x] Exportação para **Excel (XLSX)** nos extratos Bancário, Veículo e Despesas.
- [x] Exportação para **PDF** (jsPDF + AutoTable) com cabeçalho profissional.
- [x] Dashboard populado com massa de dados mock rica para 2026.

### 💰 Módulo Financeiro (Banco/Caixa e Movimentações)
Fluxo: toda movimentação (despesa ou crédito) é lançada sempre vinculada a um Banco/Conta e a um Centro de Custo (ambos obrigatórios), com a opção de informar também Pessoa e/ou Veículo — assim uma despesa de manutenção, revisão, comissão etc. pode ser presa a um carro específico sem sair da tela de Movimentos.
- [x] Cadastro de Bancos/Contas e Centros de Custo.
- [x] Tela de **Movimentos**: lançamento de Débito/Crédito com Banco/Conta + Centro de Custo obrigatórios; Pessoa e Veículo opcionais.
- [x] Reflexo automático no caixa: compra e venda de veículo já geram lançamento de Débito/Crédito no banco escolhido (módulo de Veículos → `POST /veiculos` e `POST /veiculos/:id/vender`).
- [x] **Extrato Bancário** (`relatorios/extrato-bancario`): saldo por conta, limite de crédito, saldo disponível, filtro por período, exportação XLS/PDF.
- [x] **Extrato por Veículo** (`relatorios/extrato-veiculo`): todos os lançamentos vinculados ao carro + compra/venda automáticas, cálculo de lucro/prejuízo, exportação XLS/PDF.
- [x] **Relatório de Despesas** (`relatorios/relatorio-despesas`): agrupamento por Centro de Custo, gráfico, opção de ignorar custo de aquisição de estoque.
- [x] **Fix (21/07):** `GET /api/movimentos` passou a fazer JOIN com banco/centro de custo/pessoa/veículo e aceitar filtros server-side (`banco_id`, `veiculo_id`, `centro_custo_id`, `tipo`, `data_inicio`, `data_fim`). Extrato Bancário, Extrato por Veículo, Relatório de Despesas e a listagem de Movimentos agora buscam o histórico completo em vez de só os 20 lançamentos mais recentes.
- [x] **Fix (21/07):** todo campo `po-lookup` do sistema (banco, centro de custo, pessoa, veículo, perfil) estava quebrado ao buscar/editar, porque nenhuma rota tinha `GET /:id` e o serviço de busca não tratava o novo formato paginado — corrigido em `pessoas`, `bancos`, `centros-custo`, `perfis`, `veiculos`, `marcas`. O próprio `ngOnInit` de Veículos também tinha essa quebra nos combos de fornecedor/cliente/banco/centro de custo.
- [x] **Integração WhatsApp** (Pessoas): botão que abre `https://wa.me/<telefone>` no cadastro e na listagem.
- [x] **Status de Leads** (Pessoas): campo `lead_status` (Novo/Contatado/Negociando/Convertido/Perdido) exibido quando a pessoa é Cliente.
- [x] **Comissão de vendedor**: campo `comissao_percentual` na Pessoa (quando é Vendedor); calculada automaticamente na venda e lançada como Débito.
- [x] **Ranking de Vendedores** (`relatorios/ranking-vendedores`): quantidade de vendas, valor vendido e comissão total por vendedor, com gráfico e período.
- [x] **Geração de Proposta Comercial em PDF** e **Recibo de Compra/Venda em PDF** (tela de Veículos, jsPDF).
- [x] **Auto-cadastro público desativado (21/07)**: removida a rota `/api/auth/register` e a tela de Registro — usuários agora só são criados por um Administrador (tela de Usuários). Limpou também `WelcomeComponent`/`AuthRoutingModule`, código órfão de antes da migração para standalone components.

### 💵 Contas a Pagar e a Receber (novo módulo — em construção)
Título em aberto (`status = Pendente`) que só vira lançamento de Banco/Caixa quando é dado baixa — ou seja, o valor não impacta o saldo bancário até ser efetivamente pago/recebido.
- Tabela `contas`: `tipo` (Pagar/Receber), `descricao`, `valor`, `data_emissao`, `data_vencimento`, `status` (Pendente/Pago/Cancelado), `pessoa_id`, `veiculo_id`, `centro_custo_id`, e os campos preenchidos só na baixa: `banco_id`, `data_pagamento`, `movimento_id`.
- Regra: título vinculado a veículo (ex: diferença de troca) exige veículo (placa como código) e centro de custo obrigatórios.
- **Baixa** (`POST /api/contas/:id/baixar`): recebe banco/conta + centro de custo, gera o `movimento` (Débito se Pagar, Crédito se Receber) e marca o título como Pago.
- **Integração com Venda por Troca**: ao vender um veículo do estoque recebendo outro em troca, a diferença de valor não é mais lançada na hora — vira um título:
  - Diferença positiva (o estoque vale mais que o veículo recebido) → **Conta a Receber** do cliente.
  - Diferença negativa (o veículo recebido vale mais) → **Conta a Pagar** ao cliente.
  - O valor do veículo recebido em troca em si (não a diferença) continua sendo lançado na hora, mas pela conta **Caixa** (débito na entrada do veículo recebido, crédito na baixa do vendido) — um lançamento interno que não mexe no saldo bancário real, só documenta a troca.
- Rotina de perfil: `contas` (Administrador e Financeiro por padrão; Vendedor não vê).

---

## 🚧 Em Andamento / Melhorias Imediatas
- [/] Refinamento da persistência de fotos (avaliação de impacto no LocalStorage).
- [/] **Contas a Pagar e a Receber**: schema criado, implementação de rotas/tela em andamento (ver seção acima).
- [/] **Venda por Troca**: sendo reativada com os campos do veículo recebido + integração com Contas a Pagar/Receber para a diferença (ver seção acima). Até isso ficar pronto, o modal de Venda só oferece "Banco" como forma de recebimento.

---

## 🚀 Próximos Passos (Backlog)

### 📄 Documentos e Vendas
- [ ] **Recibo de Compra/Venda vinculado a Contas a Pagar/Receber**: quando esse módulo estiver pronto, o recibo de veículos com título em aberto deveria indicar isso (ex: "Pago parcialmente, saldo a receber: R$X").

### 🛡️ Segurança e Dados
- [x] ~~Migração para API~~: já concluído — backend Node/Express + PostgreSQL rodando em produção (o item antigo previa Node/Nest com banco local).
- [ ] **Backup do Banco**: rotina de backup/restore do PostgreSQL (dump agendado + opção de restauração manual).
- [x] **Autenticação real (JWT)**: login e cadastro emitem token; todas as rotas da API exigem `Authorization: Bearer`.
- [x] **Autorização por perfil (RBAC) — (21/07)**: revisão de segurança encontrou que qualquer usuário autenticado (inclusive auto-cadastrado via `/api/auth/register`) conseguia chamar rotas de admin diretamente pela API (gerenciar usuários, ver o livro-caixa inteiro, promover a si mesmo a Administrador editando `perfil_id`). Corrigido com middleware `requireRotina`/`requireAdmin` no backend, que agora reflete server-side as mesmas `rotinas` do perfil que já eram usadas só para esconder itens de menu no frontend. Também corrigido: upload de arquivo aceitava nome de arquivo sem sanitizar (path traversal) e o segredo JWT tinha um fallback fraco hardcoded que era usado silenciosamente se `JWT_SECRET` não estivesse configurado (agora o servidor recusa iniciar em produção sem essa variável).
- [x] ~~Revisar auto-cadastro público~~: decidido e implementado — auto-cadastro desativado, usuários só são criados por um Administrador.

---
*Última atualização: 21 de Julho de 2026*
