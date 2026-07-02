# Status do Projeto: Alvorada Veículos (Marcas, Modelos e Tipo)

**Data da Sessão:** 22 de Abril de 2026
**Objetivo:** Transição do cadastro de veículos de campos estáticos para um modelo relacional e inclusão de "Tipos de Veículo".

## 1. O que foi concluído (Feito ✔️)

### Banco de Dados & Backend
*   **Schema (seed.ts):** Adição das tabelas `marcas` e `modelos`. Alteração da tabela `veiculos` para referenciar `marca_id` e `modelo_id`, além de um novo campo enum `tipo_veiculo`.
*   **População (Seed):** Implementação de script para carregar as 16 principais marcas de mercado (Toyota, Honda, etc.) e seus respectivos modelos na tabela.
*   **Rotas (API):**
    *   Criados arquivos `marcas.ts` e `modelos.ts` (com endpoints genéricos de CRUD `GET`, `POST`, `PUT`, `DELETE`).
    *   `veiculos.ts`: Queries de GET modificadas utilizando `LEFT JOIN` nas tabelas `marcas` e `modelos` para retornar `marca_nome` e `modelo_nome` (usados na datatable do frontend).
    *   `index.ts`: Rotas de marcas e modelos devidamente expostas.

### Frontend (Angular & PO-UI)
*   **Interface (vehicle.ts):** Tipo `Vehicle` atualizado com as propriedades `marca_id`, `modelo_id` e `tipo_veiculo`.
*   **Tela de Veículos (veiculos.html / veiculos.ts):**
    *   Substituição dos `po-input` originais de Marca e Modelo por componentes `po-combo`.
    *   Lógica cascata: O combo de "Modelo" fica desabilitado até que a "Marca" seja preenchida. Quando preenchida, o evento `onMarcaChange` filtra os modelos correspondentes àquela marca.
    *   Adicionado o componente `po-combo` para "Tipo" com as opções `Carro, Moto, Caminhão, Ônibus, Vans`.
*   **Adição Rápida (QuickAddComponent):**
    *   O `<app-quick-add>` foi configurado e incluído no HTML do veículo.
    *   Botões de adição rápida `(+)` renderizados ao lado de Marca e Modelo.
    *   A tela salva automaticamente a seleção criada com a técnica do método `handleQuickAdd($event, field)` que já atualiza o formulário do veículo sem refresh na página inteira.
*   **Menu do Sistema (layout.component.ts):**
    *   As novas telas foram embutidas sob o módulo de segurança/rotas (`app.routes.ts`).
    *   O menu principal foi refatorado. "Veículos" deixou de ser um link simples e agora é um **submenu (dropdown)**, contendo as opções: Gerenciar Veículos, Marcas e Modelos.

### Testes
*   O comando `npm run build` na pasta do frontend compila o projeto sem nenhum erro typescript, apontando que toda a tipagem e serviços estão sincronizados.

---

## 2. Ponto de Parada e Próximos Passos (A Fazer 🚧)

Nós finalizamos todas as regras de negócios e design de UI locais para a nova hierarquia, e deixamos o ambiente Frontend compilando adequadamente. 

**Ao retomar o projeto, você deve focar nas seguintes ações:**

1.  **Testes de Fluxo Completo:** Levantar a aplicação (`npm start` para o server e `npm run dev` para o frontend) para garantir que a gravação do carro está enviando as FK's corretas e que a lista da datatable está exibindo o nome da marca e modelo por extenso através dos JOINS.
2.  **Sincronizar Banco Local / Nuvem:** Executar o `npx ts-node src/seed.ts` no backend (ou via `npm run seed`) para criar as tabelas recém-programadas no PostgreSQL e testar o funcionamento online (VPS).
3.  **Deploy (Envio VPS):** Efetuar o `git commit`, dar o push das alterações para o GitHub e rodar a pipeline do Portainer para atualizar a imagem Docker online no Alvorada Veículos.
