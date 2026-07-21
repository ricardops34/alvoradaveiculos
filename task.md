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

### 📐 Padronização de Telas e Novos Cadastros Básicos (21/07)
- [x] **Fix: Centros de Custo sem Código**: a listagem mostrava a coluna "Código" sempre vazia — o cadastro inicial (`seed.ts`) e o de teste (`seed-teste.ts`) nunca preenchiam esse campo ao inserir os centros de custo padrão. Corrigido nos dois scripts.
- [x] **Padronização de Contas a Pagar/Receber**: era a única listagem do sistema usando `po-page-default` com filtros sempre visíveis num container, enquanto todas as outras (Bancos, Pessoas, Veículos, Marcas, Centros de Custo, Movimentos, Perfis, Usuários) usam `po-page-list` (botão "Novo" e busca no mesmo lugar em todas as telas) + modal de filtros avançados com chips. Convertida pro mesmo padrão; o filtro por Tipo/Status virou modal de filtros avançados, e a busca por texto (descrição/pessoa/placa) passou a funcionar de verdade (antes o backend não implementava esse filtro).
- [x] **Cadastros básicos de Localização (País/UF/Município)**: novas tabelas `paises`, `estados`, `municipios`, populadas via sincronização com a API pública do IBGE (botão "Sincronizar com IBGE" na nova tela Configurações > Localização, `POST /api/localizacao/sincronizar-ibge`, admin). Os campos de Cidade/UF/Cód. IBGE em Pessoas e Empresa (Configurações), que eram texto livre, viraram seleção por UF + busca de Município (evita inconsistência tipo "SP" vs "São Paulo" e já entrega o código IBGE certo, exigido pelo RENAVE). Os campos de texto antigos continuam no banco (não foram apagados, só não são mais usados pela tela) para não perder dados já digitados antes desta versão.
- [x] **Cache de CEP (`GET /api/localizacao/cep/:cep`)**: a busca de CEP nas telas de Pessoas/Configurações passou a ser feita pelo backend (antes ia direto do navegador pro ViaCEP) e alimenta incrementalmente uma tabela `ceps`, casando o município retornado com o cadastro de Localização — a cada CEP novo consultado, fica salvo pra próxima vez.
- [x] **Cadastro de Opcionais de Veículo**: a lista de opcionais (Ar Condicionado, Airbag etc.) era fixa no código do formulário de Veículos, sem tela de administração. Criada tabela `opcionais` + tela própria (Veículos > Opcionais); o formulário de Veículo agora carrega as opções do banco.
- [x] **Filtro avançado de Veículos por Marca, Modelo e Opcionais**: adicionados à busca avançada (que já tinha Tipo e Status). De passagem, corrigido um bug real: o filtro avançado de Veículos estava sem efeito nenhum desde sempre — os checkboxes do modal atualizavam variáveis (`selectedTipos`/`selectedStatus`) diferentes das que a busca de fato lia (`advancedFilters`), e o valor enviado pro backend era um objeto aninhado que a API nunca conseguia interpretar.
- [x] **Fix: filtro por papel nos `po-lookup` (Fornecedor/Cliente/Vendedor/Banco)**: o serviço genérico de lookup lia `filteredParams.params`, mas o componente `po-lookup` do PO-UI manda esses filtros extras em `filteredParams.filterParams` — ou seja, os filtros `[p-filter-params]="{ is_fornecedor: true }"` etc. usados no formulário de Veículos nunca tiveram efeito (a busca sempre trazia todas as Pessoas, não só quem tinha o papel certo). Corrigido no `GenericLookupService`.

- [x] **Fix: busca por texto sem efeito em várias telas**: Bancos, Marcas, Centros de Custo e Usuários mandavam um parâmetro `filter` que o backend correspondente nunca implementava — a caixa de busca aparecia na tela mas não filtrava nada (Contas e Veículos já haviam sido corrigidos no item acima). Corrigido nas quatro rotas (`ILIKE` por nome/código/e-mail conforme a tela). Perfis já funcionava (filtro client-side sobre a lista completa, que é pequena).

### 🗄️ Backup, E-mail e RENAVE (21/07)
- [x] **Backup: cobertura completa + agendamento automático**: o backup manual (`GET /api/backup/export` / `POST /api/backup/import`, tela Configurações) ficou defasado com o tempo — a lista de tabelas nunca ganhou `cautelares`/`veiculo_km_historico`, e a importação usava uma lista de colunas fixa no código que não acompanhou os campos de RENAVE/Localização adicionados depois. Reescrito para descobrir tabelas e colunas via `information_schema` em tempo de execução (nunca mais fica defasado). Além disso, adicionado **backup automático diário**: `server/src/backup-scheduler.ts` roda um snapshot JSON pouco depois do servidor subir (e depois verifica de hora em hora), salvo em `server/backups` (volume Docker `alvorada_backups`), mantendo os últimos 14 dias. A tela de Configurações lista os backups automáticos com opção de **restaurar** direto (sem precisar baixar/reenviar o arquivo).
- [x] **Envio de e-mail (SMTP) implementado de verdade**: os campos de SMTP em Configurações eram só decorativos (não persistiam, nada disparava envio). Adicionadas colunas `smtp_*` em `parametros` (senha write-only, mesmo padrão do certificado do RENAVE), `nodemailer` no backend, `server/src/services/email.ts`, botão "Enviar E-mail de Teste" em Configurações (`POST /api/config/testar-email`) e botões **"Enviar por E-mail"** na Proposta Comercial e nos Recibos de Compra/Venda (tela de Veículos), reaproveitando o mesmo PDF (jsPDF) já gerado como anexo (`POST /api/config/enviar-email`). Testado enviando um e-mail de configuração até a etapa de montagem/chamada ao SMTP — o envio real depende de credenciais SMTP válidas fornecidas pelo usuário, que não foram testadas nesta sessão.
- [x] **RENAVE — chamadas reais às APIs (implementado, não testado contra o RENAVE de verdade)**: criado `server/src/services/renave.ts`, cliente HTTPS com autenticação mTLS usando o certificado digital e-CNPJ já armazenado (Configurações). Compra (`POST /veiculos`) e venda (`POST /veiculos/:id/vender`) agora disparam `solicitacoes-entrada-estoque`/`solicitacoes-saida-estoque` de forma **assíncrona** (não bloqueia a resposta da venda se o RENAVE estiver fora do ar), gravando o protocolo/erro em `renave_id_estoque`/`renave_status`. Tela de Veículos ganhou coluna de status do RENAVE e ação "Reenviar ao RENAVE" (retry manual, `POST /veiculos/:id/renave/reenviar`) para pendências/erros. Instalações sem certificado configurado simplesmente não tentam (sem gerar erro falso).
  - ⚠️ **Importante**: a conexão mTLS (carregar certificado, montar requisição HTTPS) foi validada. O **formato exato do corpo JSON** que o RENAVE espera em cada endpoint é uma aproximação baseada no levantamento de schema anterior — nunca foi testado contra o ambiente real/homologação do SERPRO (não havia certificado e-CNPJ nem credenciais de teste disponíveis nesta sessão). Antes de operar com veículos reais, validar os payloads com a documentação oficial do SERPRO ou em ambiente de homologação, e ajustar `montarPayload*` em `renave.ts` conforme necessário.

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
- [x] ~~Recibo de Compra/Venda vinculado a Contas a Pagar/Receber~~: o Recibo (compra ou venda, tela de Veículos) agora consulta `GET /api/contas?veiculo_id=X&status=Pendente` antes de montar o PDF — se houver título em aberto vinculado a esse veículo (ex: diferença de troca ainda não paga/recebida), adiciona a linha "Situação: Pago parcialmente — saldo a receber/pagar: R$X (pendente em Contas a Receber/Pagar)". Validado criando um veículo + conta a receber pendente e conferindo que a consulta usada pelo recibo retorna o título corretamente.

### 🛰️ Integração RENAVE — próxima fase
- [x] ~~Chamadas reais às APIs do RENAVE~~ — implementado (ver seção "Backup, E-mail e RENAVE" acima), mas **payload não validado contra o SERPRO real** (faltou certificado/credenciais de teste). Validar antes de operar com veículos reais.
- [x] ~~Autenticação com certificado digital e-CNPJ~~ — mTLS implementado em `server/src/services/renave.ts`, usando o certificado já armazenado (fase anterior).
- [x] ~~Guardar protocolo/ID de estoque e exibir status~~ — `renave_id_estoque`/`renave_status` atualizados automaticamente, coluna de status na tela de Veículos.
- [x] ~~Tratamento de erros/pendências~~ — erros ficam em `renave_status` (prefixo "Erro:") e há ação manual "Reenviar ao RENAVE" na listagem.
- [ ] Validar os payloads reais de `solicitacoes-entrada-estoque`/`solicitacoes-saida-estoque` contra a documentação oficial do SERPRO ou ambiente de homologação (com certificado e-CNPJ e credenciais de teste reais).
- [ ] Envio da nota fiscal como etapa própria (hoje a chave da NF-e vai junto no corpo da solicitação — confirmar se o RENAVE espera uma chamada separada).

### 📧 Envio de E-mail (Propostas, Recibos, Publicidade)
- [x] ~~Implementar envio de fato~~ — feito (ver seção "Backup, E-mail e RENAVE" acima): SMTP persistido, `nodemailer`, botões de envio na Proposta e Recibos, teste de configuração em Configurações.
- [ ] Possível uso futuro para publicidade/campanhas (ex: notificar clientes/leads sobre veículos novos no estoque) — ainda não especificado, avaliar depois.

### 🛡️ Segurança e Dados
- [x] ~~Migração para API~~: já concluído — backend Node/Express + PostgreSQL rodando em produção (o item antigo previa Node/Nest com banco local).
- [x] ~~Backup do Banco~~: rotina de backup/restore implementada (ver seção "Backup, E-mail e RENAVE" acima) — dump automático diário + restauração manual (upload ou direto de um backup automático).
- [x] **Autenticação real (JWT)**: login e cadastro emitem token; todas as rotas da API exigem `Authorization: Bearer`.
- [x] **Autorização por perfil (RBAC) — (21/07)**: revisão de segurança encontrou que qualquer usuário autenticado (inclusive auto-cadastrado via `/api/auth/register`) conseguia chamar rotas de admin diretamente pela API (gerenciar usuários, ver o livro-caixa inteiro, promover a si mesmo a Administrador editando `perfil_id`). Corrigido com middleware `requireRotina`/`requireAdmin` no backend, que agora reflete server-side as mesmas `rotinas` do perfil que já eram usadas só para esconder itens de menu no frontend. Também corrigido: upload de arquivo aceitava nome de arquivo sem sanitizar (path traversal) e o segredo JWT tinha um fallback fraco hardcoded que era usado silenciosamente se `JWT_SECRET` não estivesse configurado (agora o servidor recusa iniciar em produção sem essa variável).
- [x] ~~Revisar auto-cadastro público~~: decidido e implementado — auto-cadastro desativado, usuários só são criados por um Administrador.

---
*Última atualização: 21 de Julho de 2026*
