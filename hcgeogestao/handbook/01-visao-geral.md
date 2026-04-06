# HC GeoGestão — Visão Geral do Projeto

## Identidade

| Campo | Valor |
|---|---|
| **Nome** | HC GeoGestão (GeoManager na tela de login) |
| **Marca** | HCGEO GESTÃO |
| **Domínio de Negócio** | Empresa de sondagem geotécnica, geofísica, poços tubulares e consultoria ambiental |
| **Tipo de Software** | ERP / SaaS interno multi-tenant (isolamento por `user_id`) |
| **Nome do pacote npm** | `vite_react_shadcn_ts` |
| **Versão** | `0.0.0` (pré-release) |

---

## Stack Tecnológica

### Frontend
| Tecnologia | Versão | Papel |
|---|---|---|
| React | 18.3 | Biblioteca de UI |
| TypeScript | 5.8 | Tipagem estática |
| Vite | 5.4 | Bundler / dev server |
| TailwindCSS | 3.4 | Estilização utility-first |
| Radix UI | vários | Primitivos acessíveis (shadcn/ui) |
| React Router DOM | 6.30 | Roteamento SPA |
| TanStack React Query | 5.83 | Cache / data fetching (usado no Financeiro) |
| Framer Motion | 12.34 | Animações |
| Recharts | 2.15 | Gráficos financeiros |
| date-fns | 3.6 | Manipulação de datas |
| Zod | 3.25 | Validação de schemas |
| React Hook Form | 7.61 | Formulários |
| jsPDF + AutoTable | 4.2 / 5.0 | Exportação PDF |
| Lucide React | 0.462 | Ícones |
| Sonner | 1.7 | Toasts |
| cmdk | 1.1 | Command palette |
| next-themes | 0.3 | Tema claro/escuro |
| vite-plugin-pwa | 1.2 | PWA (Service Worker) |

### Backend / BaaS
| Tecnologia | Versão | Papel |
|---|---|---|
| Supabase JS | 2.97 | SDK cliente (Auth + Realtime + PostgREST) |
| PostgreSQL | 14.1 (PostgREST) | Banco de dados (hospedado em `supabase.co`) |

### Dev / Quality
| Tecnologia | Papel |
|---|---|
| ESLint 9 | Linting |
| Vitest 3.2 | Testes unitários |
| Testing Library | Testes de componente |
| lovable-tagger | Tagging de componentes (Lovable platform) |

---

## Infraestrutura Atual

```
Navegador ──HTTPS──▶ Supabase Cloud (uixhyywpqiwpjghbbtju.supabase.co)
                       ├── GoTrue (Auth)
                       ├── PostgREST (API REST automática)
                       ├── PostgreSQL (Banco)
                       └── Storage (Uploads de arquivos)
```

- **Auth**: Email/Password via Supabase GoTrue
- **Segurança**: Row Level Security (RLS) por `user_id` — cada tabela tem policies `auth.uid() = user_id`
- **Variáveis de ambiente**:
  - `VITE_SUPABASE_URL` → URL do projeto Supabase
  - `VITE_SUPABASE_PUBLISHABLE_KEY` → Anon key (público)
  - `VITE_SUPABASE_PROJECT_ID` → ID do projeto

---

## Estrutura de Diretórios

```
hcgeogestao/
├── .env                          # Variáveis Supabase
├── .lovable/                     # Planos do Lovable AI
├── handbook/                     # 📚 Documentação do projeto (este handbook)
├── public/                       # Assets estáticos
├── supabase/
│   ├── config.toml               # Config do Supabase CLI
│   └── migrations/               # 23 migrations SQL (2026-02 a 2026-03)
├── src/
│   ├── main.tsx                  # Entrypoint React
│   ├── App.tsx                   # Router + Providers + Auth Gate
│   ├── App.css / index.css       # Estilos globais
│   ├── vite-env.d.ts             # Tipos do Vite
│   ├── assets/                   # Imagens (logo sidebar)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives
│   │   ├── layout/               # AppLayout (sidebar + topbar)
│   │   ├── leads/                # LeadFormDialog, LeadKanban
│   │   ├── clientes/             # ClienteFormDialog
│   │   ├── propostas/            # PropostaFormDialog, OSFormDialog, PDF, Import, Relatório
│   │   ├── obras/                # ObraFormDialog, ObraDetalhe
│   │   ├── medicoes/             # MedicaoFormDialog
│   │   ├── estoque/              # EstoqueFormDialog, SaidaFormDialog
│   │   ├── fornecedores/         # FornecedorFormDialog
│   │   ├── veiculos/             # VeiculoFormDialog, VeiculoDetalhe, Abastecimento, RegistroUso
│   │   ├── colaboradores/        # ColaboradorFormDialog, Documentos, FolhaPonto
│   │   ├── empresa/              # DocumentosEmpresa
│   │   ├── financeiro/           # DRETab, DespesasTab, DesempenhoTab, Charts, PDFExport
│   │   └── relatorios/           # RelatorioFormDialog
│   ├── hooks/
│   │   ├── useAuth.ts            # Hook de sessão/autenticação
│   │   ├── use-toast.ts          # Hook de toast (shadcn)
│   │   └── use-mobile.tsx        # Detecção mobile
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts         # createClient<Database> com autoRefreshToken
│   │       └── types.ts          # 1726 linhas — tipos gerados do schema PostgreSQL
│   ├── lib/
│   │   ├── utils.ts              # cn() helper
│   │   └── clienteSync.ts        # Upsert de clientes a partir de leads/propostas
│   ├── pages/                    # 15 páginas (ver seção Módulos)
│   └── test/                     # Testes
├── tailwind.config.ts            # Design tokens customizados
├── vite.config.ts                # Plugins, aliases, PWA config
├── tsconfig*.json                # TypeScript configs
├── components.json               # Configuração shadcn/ui
└── package.json                  # Dependências
```

---

## Módulos da Aplicação

| Rota | Página | Descrição |
|---|---|---|
| `/` | Dashboard | KPIs, funil de vendas, alertas de documentos/propostas vencendo, estoque baixo, pendentes de devolução |
| `/auth` | Auth | Login / Cadastro (Email + Senha via Supabase Auth) |
| `/leads` | Leads | CRM: Kanban + Lista. Pipeline de vendas com 8 estágios |
| `/clientes` | Clientes | Cadastro PF/PJ, auto-classificação via CNPJ/CPF |
| `/propostas` | Propostas & OS | Propostas técnicas + Ordens de Serviço + Relatório de propostas |
| `/obras` | Obras & Medições | Gestão de obras de campo, logística, medições geotécnicas |
| `/estoque` | Estoque & Fornecedores | Inventário + Saídas + Fornecedores + Frota de Veículos (4 tabs) |
| `/colaboradores` | RH & Administrativo | Colaboradores + Documentos da empresa (2 tabs) |
| `/financeiro` | Financeiro | Contas a pagar/receber, despesas fixas, DRE, gráficos, desempenho |
| `/relatorios` | Relatórios | Relatórios técnicos vinculados a obras |
| `/configuracoes` | Configurações | Placeholder (não implementado) |

---

## Padrões Arquiteturais

### Autenticação
- `useAuth()` hook → `supabase.auth.onAuthStateChange()` + `getSession()`
- Guard no `AppRoutes`: se `!session` → redireciona para `/auth`
- Session persistida em `localStorage` via Supabase SDK

### Data Fetching
- **Padrão 1 (direto)**: `useEffect` + `supabase.from().select()` — usado na maioria das páginas
- **Padrão 2 (React Query)**: `useQuery` + `useMutation` — usado no módulo Financeiro para cache otimista

### Segurança
- **RLS (Row Level Security)**: Todas as tabelas possuem policies `auth.uid() = user_id`
- **Financeiro**: Gate adicional com senha fixa (`G@lves05`) armazenada em `sessionStorage`

### Formulários
- Dialogs modais reutilizáveis (`*FormDialog.tsx`)
- `useEffect` para preencher formulário no edit, limpar no create
- Validação inline (required fields)
- Upsert de clientes via `clienteSync.ts`

### Exclusão
- Confirmação via `AlertDialog` antes de qualquer `DELETE`
- Cascata em banco via `ON DELETE CASCADE` ou `ON DELETE SET NULL`

### Exportação
- PDF via `jsPDF` + `jsPDF-autotable` (Propostas e Financeiro)
- Import de propostas via JSON

### Navegação
- Sidebar colapsável com 10 itens, logo HCGEO
- Responsive: drawer mobile com overlay
