# 📚 HC GeoGestão — Handbook

Documentação técnica completa do sistema HC GeoGestão (ERP para empresa de sondagem geotécnica).

---

## Índice

| # | Arquivo | Conteúdo |
|---|---|---|
| 01 | [Visão Geral](./01-visao-geral.md) | Stack tecnológica, infraestrutura, estrutura de diretórios, módulos, padrões arquiteturais |
| 02 | [Banco de Dados](./02-banco-de-dados.md) | Schema completo: 26 tabelas com todos os campos, tipos, defaults, FKs, diagrama ER, RPCs |
| 03 | [Componentes & Páginas](./03-componentes-paginas.md) | Mapa completo de componentes, árvore de rotas, padrão de formulários, fluxo de negócio |
| 04 | [Regras de Negócio](./04-regras-negocio.md) | Status/enums, tipos de serviço, categorias, alertas de vencimento, geração automática, DRE |

---

## Contexto Rápido

- **Domínio**: Sondagem geotécnica, geofísica, poços tubulares
- **Stack**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui + Supabase
- **Banco**: PostgreSQL (26 tabelas, RLS por `user_id`)
- **Auth**: Supabase GoTrue (email/senha)
- **Módulos**: Dashboard, CRM (Leads), Clientes, Propostas & OS, Obras & Medições, Estoque & Fornecedores & Veículos, RH & Colaboradores, Financeiro (com DRE), Relatórios

---

## Plano de Migração (Legado)

O arquivo original `readme.md` continha um plano de migração de Supabase para Docker Self-Hosted. Esse plano continua documentado nas conversas anteriores do projeto mas não reflete o estado atual da aplicação, que **ainda roda em Supabase Cloud**.
