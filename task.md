# 📋 Lista de Tarefas - Alvorada CRM

Este arquivo centraliza o progresso do desenvolvimento e as próximas metas do projeto.

---

## ✅ Concluído (Entregue)

### 🏗️ Infraestrutura e CI/CD
- [x] Configuração de build Angular para produção (ajuste de budgets 5MB).
- [x] Deploy em Docker Swarm com suporte a Traefik.
- [x] Identidade visual: Alteração do nome para "Alvorada" em todo o sistema.
- [x] **Uploads persistentes (21/07)**: criado `server/src/uploads.ts` com pasta compartilhada de uploads (`server/uploads` em dev, `/app/uploads` em produção) e volume Docker nomeado (`alvorada_uploads`) no `docker-compose.yml`, para sobreviver a redeploys. Corrigido também um bug pré-existente: o `Dockerfile` de produção da API nunca copiava/criava a pasta `public` usada pelo multer, então o upload de logo/favicon/fundo de login e a movimentação de CSV de marcas/modelos (`/api/config/upload-csv`) estavam quebrados em produção (contagem errada de `..` no `path.join`). Corrigido em `config.ts`.
- [x] **Base de dados de teste — Seed-Teste (21/07)**: novo `server/src/seed-teste.ts` (`npm run seed:teste`), populando pessoas, veículos (todos os status, incluindo um caso de **recompra** com o mesmo chassi pra testar o Histórico do Veículo), bancos, centros de custo, movimentos, contas a pagar/receber, cautelares e histórico de KM. Idempotente (não duplica se rodar de nascer), e se recusa a rodar com `NODE_ENV=production` sem `FORCE_SEED_TESTE=true`. Validado rodando de ponta a ponta contra um Postgres novo em um container descartável — isso revelou e corrigiu dois bugs reais e pré-existentes no `seed.ts` principal que só apareciam num banco genuinamente vazio: o índice `idx_veiculos_chassi` era criado antes da coluna `chassi` existir, e a sequence de `bancos` nunca era resetada após o insert com ID fixo do banco "Caixa" (quebrava qualquer insert de banco subsequente sem ID explícito).

### 🚗 Módulo de Veículos
- [x] Cadastro completo de veículos.
- [x] Campo de **Valor de Avaliação**.
- [x] **Upload de Fotos em disco (21/07)**: a galeria de fotos havia se perdido num refactor anterior (só sobrava o campo `fotos` no tipo, sem UI). Reconstruída no formulário de Veículos usando `po-upload` (múltiplo, até 10MB/arquivo) + grade de thumbnails com remoção — arquivos gravados em `uploads/veiculos` (nome único por upload) em vez de Base64 no banco, resolvendo o item de "persistência de fotos" do backlog. Registros antigos em Base64 (se existirem) continuam renderizando normalmente.
- [x] Lógica de status (Estoque, Vendido, Preparação, etc).
- [x] **Novo: Sistema Hierárquico de Marcas e Modelos** (com anos e descrição).
- [x] **Histórico do Veículo e Recompra (21/07)**: até então não existia nenhum controle disso — `quilometragem` era um valor único sobrescrito a cada edição, sem Cautelar/Vistoria, e uma recompra (veículo que a loja já vendeu antes e volta pro estoque) sempre virava uma linha nova em `veiculos` desconectada da anterior (mesmo chassi, histórico perdido).
  - **Detecção de recompra**: botão "Verificar Histórico" ao lado do Chassi no cadastro de veículo novo — busca por `chassi` (`GET /api/veiculos/historico/:chassi`) e avisa se esse veículo já passou pela loja antes.
  - **Histórico de quilometragem**: nova tabela `veiculo_km_historico` (não sobrescreve mais — cada leitura fica registrada, com origem Cadastro/Venda/Manual), populada automaticamente no cadastro, na edição (quando o KM muda) e na venda (novo campo "Km na Entrega").
  - **Módulo de Cautelar/Vistoria**: nova tabela `cautelares` (empresa, data, resultado, laudo anexado, custo) — rotas em `server/src/routes/cautelares.ts`; se tiver custo + banco + centro de custo, gera o lançamento (Débito) automaticamente, igual ao padrão já usado na compra de veículo.
  - **Tela de Histórico do Veículo**: nova ação "Histórico do Veículo" na listagem, abre modal com a linha do tempo completa por chassi — Proprietários (quem vendeu/comprou em cada passagem), Estadias na loja, Histórico de KM e Cautelares, cadastro de nova cautelar direto do modal.

### 🛰️ Preparação para integração RENAVE (21/07)
Levantamento feito direto no schema real da API (`https://renave.estaleiro.serpro.gov.br/renave-ws`, grupo "Estabelecimento/Revenda"). Esta etapa cobre só **cadastro e base de dados** — a chamada às APIs do RENAVE (entrada/saída de estoque, autenticação via certificado digital e-CNPJ) ainda não foi implementada, fica para uma próxima fase.
- [x] **Veículos**: novos campos `tipo_crv` (Azul/Verde/Branco/Digital), `numero_crv`, `codigo_seguranca_crv`, `data_medicao_hodometro`, `nota_fiscal_compra_chave` (no cadastro) e `nota_fiscal_venda_chave` (no modal de Venda). Colunas de controle `renave_id_estoque`/`renave_status` já existem no banco, prontas para quando a integração ao vivo for implementada.
- [x] **Pessoas**: endereço completo (CEP, logradouro, número, complemento, bairro, UF) + `codigo_municipio_ibge`, exigido pelo RENAVE nos dados do comprador. Botão de busca automática por **CEP (ViaCEP)** e, para Pessoa Jurídica, por **CNPJ (minhareceita.org)** — preenche nome/endereço/telefone automaticamente, incluindo o código IBGE do município.
- [x] **Empresa (Configurações)**: novo campo CNPJ + endereço completo do estabelecimento, com os mesmos botões de busca por CEP e CNPJ.
- [x] **Usuários**: campo CPF (útil como identificação geral do usuário do sistema).
- [x] **Responsável e credenciais RENAVE (empresa/tenant)**: o manual confirma que o RENAVE autentica via **certificado digital e-CNPJ (mTLS, .p12/.pfx)** — não usuário/senha — e que o "operador responsável" de cada solicitação é uma pessoa física (normalmente o dono da loja), não necessariamente um usuário do sistema. Adicionado em Configurações: nome/CPF do responsável, upload do certificado digital e senha do certificado.
  - O certificado é gravado em um diretório **privado** (`server/src/uploads.ts` → `PRIVATE_ROOT`), fora da pasta `/uploads` servida publicamente, com volume Docker próprio (`alvorada_private`) — nunca acessível via HTTP.
  - A senha do certificado é *write-only*: `PUT /api/config/parametros` só a atualiza se um valor novo for enviado (senão preserva a atual) e nenhum endpoint a devolve — a tela de Configurações só recebe um indicador booleano de que já foi configurada.
  - `GET /api/config/parametros` (usado pela tela de login, sem autenticação) agora devolve só nome/logo/favicon/fundo; um novo `GET /api/config/parametros/completo` (admin) devolve os demais dados da empresa/RENAVE — separação necessária para não expor esses dados e segredos futuros por um endpoint público.
- [x] Corrigido de passagem: o interceptor HTTP anexava o token de autenticação em **toda** chamada, inclusive para APIs externas (ViaCEP, minhareceita.org) — isso derrubava o CORS preflight delas. Agora só anexa o token em chamadas para a própria API (`/api/...`).

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

### 💵 Contas a Pagar e a Receber
Título em aberto (`status = Pendente`) que só vira lançamento de Banco/Caixa quando é dado baixa — ou seja, o valor não impacta o saldo bancário até ser efetivamente pago/recebido.
- [x] Tabela `contas`: `tipo` (Pagar/Receber), `descricao`, `valor`, `data_emissao`, `data_vencimento`, `status` (Pendente/Pago/Cancelado), `pessoa_id`, `veiculo_id`, `centro_custo_id`, e os campos preenchidos só na baixa: `banco_id`, `data_pagamento`, `movimento_id`.
- [x] Regra: título vinculado a veículo (ex: diferença de troca) exige veículo (placa como código) e centro de custo obrigatórios.
- [x] **Baixa** (`POST /api/contas/:id/baixar`): recebe banco/conta + centro de custo, gera o `movimento` (Débito se Pagar, Crédito se Receber) e marca o título como Pago.
- [x] Tela `contas` (listagem com filtro por tipo/status, cadastro, edição, baixa) e item de menu, protegida pela rotina de perfil `contas` (Administrador e Financeiro por padrão; Vendedor não vê).
- [x] **Integração com Venda por Troca**: ao vender um veículo do estoque recebendo outro em troca, a diferença de valor não é mais lançada na hora — vira um título:
  - Diferença positiva (o estoque vale mais que o veículo recebido) → **Conta a Receber** do cliente.
  - Diferença negativa (o veículo recebido vale mais) → **Conta a Pagar** ao cliente.
  - O valor do veículo recebido em troca em si (não a diferença) continua sendo lançado na hora, mas pela conta **Caixa** (débito na entrada do veículo recebido, crédito na baixa do vendido) — um lançamento interno que não mexe no saldo bancário real, só documenta a troca.

### 🔄 Venda por Troca
- [x] Modal de Venda oferece "Banco" e "Troca" como forma de recebimento.
- [x] Formulário de troca (placa, marca/modelo, ano, cor, km, chassi, valor FIPE, valor de negociação) e cálculo automático da diferença.
- [x] Veículo recebido entra automaticamente no estoque (`status = Estoque`, `forma_compra = Troca`).
- [x] Comissão do vendedor lançada mesmo em vendas por Troca (usa o Caixa como conta quando não há banco real envolvido).

---

## 🚧 Em Andamento / Melhorias Imediatas
*(nenhum item em andamento no momento)*

---

## 🚀 Próximos Passos (Backlog)

### 📄 Documentos e Vendas
- [ ] **Recibo de Compra/Venda vinculado a Contas a Pagar/Receber**: quando esse módulo estiver pronto, o recibo de veículos com título em aberto deveria indicar isso (ex: "Pago parcialmente, saldo a receber: R$X").

### 🛰️ Integração RENAVE — próxima fase
- [ ] Chamadas reais às APIs do RENAVE (`solicitacoes-entrada-estoque` na compra, `solicitacoes-saida-estoque` na venda, envio da nota fiscal) a partir dos fluxos de Compra/Venda de Veículos.
- [ ] Autenticação com certificado digital e-CNPJ (A1/A3) — decidir onde/como guardar o certificado com segurança no servidor.
- [ ] Guardar o protocolo/ID de estoque retornado pelo RENAVE (`renave_id_estoque`/`renave_status`, colunas já criadas em `veiculos`) e exibir o status da integração na tela de Veículos.
- [ ] Tratamento de erros/pendências do RENAVE (ex: veículo com estoque já solicitado, aptidão de veículo reprovada).

### 📧 Envio de E-mail (Propostas, Recibos, Publicidade)
A tela de Configurações já tem campos de SMTP (host, porta, usuário, senha, remetente) com botão "Salvar", mas é uma funcionalidade fantasma: não existe coluna `smtp_*` no banco, `PUT /parametros` não os recebe, não há biblioteca de e-mail (`nodemailer` etc.) no backend, e nada dispara envio — Proposta Comercial e Recibos hoje são só PDF baixado no navegador.
- [ ] Decidir: implementar o envio de fato (persistir SMTP, instalar `nodemailer`, endpoint de envio) ou remover os campos falsos da tela até ser implementado.
- [ ] Se implementado: botão "Enviar por E-mail" na Proposta Comercial e nos Recibos (compra/venda), reaproveitando o PDF já gerado (jsPDF) como anexo.
- [ ] Possível uso futuro para publicidade/campanhas (ex: notificar clientes/leads sobre veículos novos no estoque) — ainda não especificado, avaliar quando o envio básico estiver funcionando.

### 🛡️ Segurança e Dados
- [x] ~~Migração para API~~: já concluído — backend Node/Express + PostgreSQL rodando em produção (o item antigo previa Node/Nest com banco local).
- [ ] **Backup do Banco**: rotina de backup/restore do PostgreSQL (dump agendado + opção de restauração manual).
- [x] **Autenticação real (JWT)**: login e cadastro emitem token; todas as rotas da API exigem `Authorization: Bearer`.
- [x] **Autorização por perfil (RBAC) — (21/07)**: revisão de segurança encontrou que qualquer usuário autenticado (inclusive auto-cadastrado via `/api/auth/register`) conseguia chamar rotas de admin diretamente pela API (gerenciar usuários, ver o livro-caixa inteiro, promover a si mesmo a Administrador editando `perfil_id`). Corrigido com middleware `requireRotina`/`requireAdmin` no backend, que agora reflete server-side as mesmas `rotinas` do perfil que já eram usadas só para esconder itens de menu no frontend. Também corrigido: upload de arquivo aceitava nome de arquivo sem sanitizar (path traversal) e o segredo JWT tinha um fallback fraco hardcoded que era usado silenciosamente se `JWT_SECRET` não estivesse configurado (agora o servidor recusa iniciar em produção sem essa variável).
- [x] ~~Revisar auto-cadastro público~~: decidido e implementado — auto-cadastro desativado, usuários só são criados por um Administrador.

---
*Última atualização: 21 de Julho de 2026*
