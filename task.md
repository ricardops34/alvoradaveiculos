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

---

## 🚧 Em Andamento / Melhorias Imediatas
- [/] Refinamento da persistência de fotos (avaliação de impacto no LocalStorage).
- [/] Geração de Proposta Comercial em PDF.

---

## 🚀 Próximos Passos (Backlog)

### 📄 Documentos e Vendas
- [ ] **Geração de Proposta Comercial**: Gerar PDF de oferta para enviar ao cliente.
- [ ] **Recibo de Compra/Venda**: Emissão automática de recibos vinculados aos movimentos.

### 🤝 CRM (Módulo Pessoas)
- [ ] **Status de Leads**: Acompanhamento de interessados por veículo.
- [ ] **Integração WhatsApp**: Botão para iniciar conversa direta do cadastro.

### 📈 Inteligência de Negócio
- [ ] **Ranking de Vendedores**: Gráfico de performance por profissional.
- [ ] **Cálculo de Comissão Automático**: Baseado em regras fixas ou percentuais.

### 🛡️ Segurança e Dados
- [ ] **Backup do Banco**: Opção de exportar/importar o JSON do banco local.
- [ ] **Migração para API**: Preparação do sistema para um backend real (Node/Nest).

---
*Última atualização: 22 de Abril de 2026*
