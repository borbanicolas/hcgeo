# HC GeoGestão — Componentes e Páginas (Mapa Completo)

## Árvore de Componentes

```
App.tsx
├── QueryClientProvider (TanStack)
├── TooltipProvider (Radix)
├── Toaster (shadcn) × 2
└── BrowserRouter
    └── AppRoutes
        ├── [!session] → Auth.tsx
        └── [session] → AppLayout
            ├── Sidebar (navItems: 10 itens)
            ├── TopBar (mobile menu)
            └── <Routes>
                ├── / → Dashboard
                ├── /leads → Leads
                ├── /clientes → Clientes
                ├── /propostas → Propostas
                ├── /obras → Obras
                ├── /estoque → Estoque
                ├── /colaboradores → Colaboradores
                ├── /financeiro → Financeiro
                ├── /relatorios → Relatorios
                ├── /configuracoes → Configuracoes
                ├── /medicoes → redirect /obras
                ├── /fornecedores → redirect /estoque
                └── * → NotFound
```

---

## Páginas Detalhadas

### 1. Auth (`src/pages/Auth.tsx` — 150 linhas)
- **Função**: Login e cadastro
- **Auth method**: `supabase.auth.signInWithPassword` / `signUp`
- **Estado**: `isLogin`, `email`, `password`, `name`, `showPassword`, `loading`
- **UI**: Logo "GeoManager" (ícone Drill), formulário centrado, toggle login/cadastro

### 2. Dashboard (`src/pages/Dashboard.tsx` — 407 linhas)
- **Função**: Visão geral do negócio
- **Queries Supabase**: leads, propostas, obras, colaboradores, asos, nrs, epis, estoque, estoque_saidas
- **Interfaces locais**:
  - `DocAlert { tipo, colaboradorNome, dataValidade, diasRestantes }`
  - `PropostaVencendo { titulo, numero, dataVencimento, diasRestantes }`
  - `PendenteDevolucao { itemNome, retiradoPor, destino, dataSaida, quantidade }`
  - `EstoqueBaixo { nome, quantidade, quantidadeMinima, unidade }`
- **Seções**:
  1. Stats grid (5 cards): Leads Ativos, Pipeline (R$), Propostas Abertas, Propostas Aprovadas, Obras em Andamento
  2. Documentos Vencendo (ASO/NR/EPI com `data_validade` ≤ 30 dias)
  3. Propostas Vencendo (`data_emissao + validade_dias` ≤ 15 dias)
  4. Pendentes de Devolução (estoque saídas Retornáveis não devolvidas)
  5. Estoque Baixo (`quantidade ≤ quantidade_minima`)
  6. Funil de Vendas (4 estágios: Qualificado, Proposta Enviada, Negociação, Ganho)
- **Urgência**: Vencido (vermelho), ≤15d (laranja), ≤30d (amarelo)

### 3. Leads (`src/pages/Leads.tsx` — 239 linhas)
- **Função**: CRM / Pipeline de vendas
- **Views**: Kanban (padrão) + Lista
- **KPIs**: Pipeline total (R$), Abertos, Ganhos
- **Status**: Novo → Qualificado → Portfólio Enviado → Reunião Agendada → Proposta Enviada → Negociação → Fechado (Ganho/Perdido)
- **Prioridades**: Alta (vermelho), Média (amarelo), Baixa (cinza)
- **Componentes filhos**:
  - `LeadFormDialog` (8.4KB) — Formulário completo com tipos de serviço em chips
  - `LeadKanban` (10KB) — Board com drag-and-drop entre colunas

### 4. Clientes (`src/pages/Clientes.tsx` — 193 linhas)
- **Função**: Cadastro de clientes PF/PJ
- **Filtros**: Busca full-text + Tipo (Todos/PJ/PF)
- **KPIs**: Total, count PJ, count PF
- **Componente filho**: `ClienteFormDialog` (6.4KB)

### 5. Propostas (`src/pages/Propostas.tsx` — 306 linhas)
- **Tabs**: Propostas | Ordens de Serviço | Relatório
- **Status Proposta**: Rascunho, Enviada, Em Análise, Aprovada, Reprovada, Cancelada
- **Status OS**: Aberta, Em Execução, Concluída, Cancelada
- **Ações especiais**:
  - "Gerar OS" (apenas quando Aprovada → chama RPC `generate_os_number`)
  - "Exportar PDF" (via `exportPropostaPDF`)
  - "Importar" (via JSON)
- **Componentes filhos**:
  - `PropostaFormDialog` (52.8KB!) — Formulário extremamente complexo com itens, grupos, cláusulas
  - `OSFormDialog` (5.2KB)
  - `ImportPropostaDialog` (7.4KB) — Import via JSON
  - `PropostaPDFExport.ts` (16KB) — Geração PDF com jsPDF
  - `PropostasRelatorio` (24KB) — Relatório analítico de propostas

### 6. Obras (`src/pages/Obras.tsx` — 234 linhas)
- **Função**: Gestão de obras de campo
- **Status**: Planejada → Em Mobilização → Em Andamento → Pausada → Concluída → Cancelada
- **Views**: Grid de cards com progresso, detalhe expandido
- **Filtros**: Busca + Status
- **Info logística**: Hotel, Alimentação, Transporte
- **Componentes filhos**:
  - `ObraFormDialog` (10.8KB)
  - `ObraDetalhe` (13.2KB) — Detalhe com medições (MedicaoFormDialog 15.7KB)

### 7. Estoque (`src/pages/Estoque.tsx` — 695 linhas)
- **Tabs**: Estoque | Saídas | Fornecedores | Veículos
- **Estoque**: Agrupado por categoria em Collapsibles, alertas de estoque baixo
- **Saídas**: Tipo Consumo vs Retornável, badge Devolvido/Pendente
- **Veículos**: Cards com alertas de revisão/seguro/licenciamento (30 dias)
- **Componentes filhos**:
  - `EstoqueFormDialog` (5.1KB)
  - `SaidaFormDialog` (6.5KB)
  - `FornecedorFormDialog` (5.2KB)
  - `VeiculoFormDialog` (8.3KB)
  - `VeiculoDetalhe` (16.5KB) — Com abastecimentos e registros de uso
  - `AbastecimentoFormDialog` (5.4KB)
  - `RegistroUsoFormDialog` (6KB)

### 8. Colaboradores (`src/pages/Colaboradores.tsx` — 313 linhas)
- **Tabs**: Colaboradores | Documentos da Empresa
- **Dashboard de Alertas**: Documentos vencidos/a vencer (ASO/NR/EPI/Vacina)
- **Filtros**: Busca + Status (Todos/Ativos/Inativos)
- **Ações por card**: Docs, Ponto, Editar, Excluir
- **Componentes filhos**:
  - `ColaboradorFormDialog` (6.6KB) — Dados pessoais
  - `ColaboradorDocumentos` (35.1KB!) — ASOs, NRs, EPIs, Vacinas, Arquivos (5 sub-tabs)
  - `ColaboradorFolhaPonto` (13.4KB) — Registros de entrada/saída/almoço
  - `DocumentosEmpresa` (18.2KB)

### 9. Financeiro (`src/pages/Financeiro.tsx` — 679 linhas)
- **Gate**: Senha fixa `G@lves05` (sessionStorage)
- **Tabs**: A Pagar | A Receber | Despesas | DRE | Gráficos | Desempenho
- **Data fetching**: React Query (não useEffect direto)
- **KPIs**: A Receber, A Pagar, Saldo, Desp. Fixas, Lucro, Atrasados
- **Filtro mensal**: `<input type="month">`
- **Ações especiais**:
  - "Gerar Cobranças" — Auto-gera 2 contas a receber (Entrada 50% + Saldo 50%) para cada proposta aprovada sem cobrança
  - "Exportar PDF" (via `exportFinanceiroPDF`)
  - "Marcar Pago/Recebido" — Quick action na tabela
- **Componentes filhos**:
  - `GenericFormDialog` — Formulário genérico baseado em array de fields
  - `DespesasTab` (29.2KB)
  - `DesempenhoTab` (21.9KB)
  - `DRETab` (19.8KB) — Demonstração de Resultado do Exercício
  - `FinanceiroCharts` (9KB) — DRE, Fluxo de Caixa, Pie charts
  - `FinanceiroPDFExport.ts` (5.6KB)

### 10. Relatorios (`src/pages/Relatorios.tsx` — 197 linhas)
- **Status**: Em Elaboração, Em Revisão, Aprovado, Entregue, Cancelado
- **Query**: `relatorios` join `obras(titulo, cliente_nome)`
- **Filtros**: Busca + Status
- **Componente filho**: `RelatorioFormDialog` (9.4KB)

---

## Componentes UI (shadcn/ui)

O projeto utiliza o design system **shadcn/ui** com os seguintes componentes instalados:

Accordion, AlertDialog, AspectRatio, Avatar, Badge, Button, Card, Carousel, Checkbox, Collapsible, Command, ContextMenu, Dialog, DropdownMenu, HoverCard, Input, Label, Menubar, NavigationMenu, Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Slider, Sonner, Switch, Table, Tabs, Textarea, Toast, Toggle, ToggleGroup, Tooltip

---

## Hooks Customizados

| Hook | Arquivo | Uso |
|---|---|---|
| `useAuth()` | `hooks/useAuth.ts` | Retorna `{ session, loading, signOut }` |
| `useToast()` | `hooks/use-toast.ts` | Toast notifications (shadcn) |
| `useIsMobile()` | `hooks/use-mobile.tsx` | Detecção de viewport mobile |

---

## Utilitários

| Arquivo | Função | Descrição |
|---|---|---|
| `lib/utils.ts` | `cn()` | Merge de classes CSS (clsx + tailwind-merge) |
| `lib/clienteSync.ts` | `upsertCliente()` | Upsert de cliente a partir de dados de lead/proposta. Busca duplicatas por CNPJ, email ou telefone. Auto-classifica PF/PJ. |
| `integrations/supabase/client.ts` | `supabase` | Cliente Supabase singleton com persistSession + autoRefreshToken |

---

## Padrão de Formulário (Dialog)

Todos os FormDialogs seguem o mesmo padrão:

```tsx
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: EntityType | null;       // null = create, object = edit
  onSaved/onSuccess: () => void;   // callback para refresh da lista
}

// Dentro do componente:
const [form, setForm] = useState({...defaults});

useEffect(() => {
  if (entity) setForm(entity);     // edit mode
  else setForm({...defaults});     // create mode
}, [entity, open]);

const handleSave = async () => {
  const user = await supabase.auth.getUser();
  if (entity?.id) {
    await supabase.from('table').update(form).eq('id', entity.id);
  } else {
    await supabase.from('table').insert({...form, user_id: user.id});
  }
  onSaved();
  onOpenChange(false);
};
```

---

## Fluxo de Negócio Principal

```
Lead (CRM)
  ↓ [Ganho]
Proposta (Comercial)
  ↓ [Aprovada]
  ├── Gerar OS (Ordem de Serviço)
  ├── Gerar Cobranças (Financeiro - 50% Entrada + 50% Saldo)
  └── Criar Obra
        ↓
        ├── Medições (campo)
        └── Relatório Técnico
              ↓
              [Entregue] → Saldo final faturado
```
