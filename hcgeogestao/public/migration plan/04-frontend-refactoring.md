# 04 — Frontend Refactoring

## Estratégia

Ao invés de alterar cada arquivo individualmente com `fetch()`, vamos criar uma **camada de serviço** (`apiClient`) que imita a interface do Supabase SDK, minimizando mudanças nos componentes.

---

## Passo 1: Criar o API Client (`src/lib/apiClient.ts`)

Este módulo substitui `@supabase/supabase-js`. Ele oferece a mesma interface fluente de `supabase.from('tabela').select()`.

```typescript
// src/lib/apiClient.ts

const API_URL = import.meta.env.VITE_API_URL || '';

// ─── Token Management ───
function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

function setToken(token: string) {
  localStorage.setItem('auth_token', token);
}

function removeToken() {
  localStorage.removeItem('auth_token');
}

// ─── Base fetch with auth ───
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const json = await res.json();

  if (!res.ok) {
    return { data: null, error: { message: json.error || 'Erro desconhecido' } };
  }

  return { data: json.data, error: null };
}

// ─── Query Builder (imita supabase.from().select().eq().order()) ───
class QueryBuilder {
  private table: string;
  private queryParams: URLSearchParams;
  private method: string = 'GET';
  private body: any = null;
  private selectColumns: string = '*';
  private filters: Array<{ type: string; column: string; value: any }> = [];

  constructor(table: string) {
    this.table = table;
    this.queryParams = new URLSearchParams();
  }

  select(columns: string = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.queryParams.set('orderBy', column);
    this.queryParams.set('ascending', String(options?.ascending ?? false));
    return this;
  }

  async insert(data: any) {
    const result = await apiFetch(`/api/${this.table}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result;
  }

  async update(data: any) {
    // update precisa de .eq('id', value) antes
    const idFilter = this.filters.find(f => f.column === 'id');
    if (!idFilter) {
      return { data: null, error: { message: 'update() requer .eq("id", value)' } };
    }

    const result = await apiFetch(`/api/${this.table}/${idFilter.value}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result;
  }

  async delete() {
    const idFilter = this.filters.find(f => f.column === 'id');
    if (!idFilter) {
      return { data: null, error: { message: 'delete() requer .eq("id", value)' } };
    }

    const result = await apiFetch(`/api/${this.table}/${idFilter.value}`, {
      method: 'DELETE',
    });
    return result;
  }

  async single() {
    const result = await this._execute();
    if (result.data && Array.isArray(result.data)) {
      return { data: result.data[0] || null, error: result.error };
    }
    return result;
  }

  // Executar a query (select)
  async then(resolve: (value: any) => void) {
    const result = await this._execute();
    resolve(result);
  }

  private async _execute() {
    // Montar URL com filtros
    let url = `/api/${this.table}`;

    // Se há filtros que não são ID, enviar como query params
    const idFilter = this.filters.find(f => f.column === 'id');
    if (idFilter && this.filters.length === 1) {
      url = `/api/${this.table}/${idFilter.value}`;
    } else {
      // Filtros como query params
      for (const f of this.filters) {
        this.queryParams.set(f.column, String(f.value));
      }
    }

    if (this.selectColumns !== '*') {
      this.queryParams.set('columns', this.selectColumns);
      url = `/api/${this.table}/select`;
    }

    const qs = this.queryParams.toString();
    if (qs) url += `?${qs}`;

    return apiFetch(url);
  }
}

// ─── Auth Client ───
const auth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { data: null, error: { message: json.error } };
    }

    setToken(json.token);
    return {
      data: { user: json.user, session: { access_token: json.token } },
      error: null,
    };
  },

  async signUp({ email, password, options }: any) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        full_name: options?.data?.full_name || '',
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { data: null, error: { message: json.error } };
    }

    setToken(json.token);
    return {
      data: { user: json.user, session: { access_token: json.token } },
      error: null,
    };
  },

  async signOut() {
    removeToken();
    return { error: null };
  },

  async getUser() {
    const result = await apiFetch('/auth/me');
    return {
      data: { user: result.data?.user || null },
      error: result.error,
    };
  },

  async getSession() {
    const token = getToken();
    if (!token) {
      return { data: { session: null }, error: null };
    }

    const result = await apiFetch('/auth/me');
    if (result.error) {
      removeToken();
      return { data: { session: null }, error: null };
    }

    return {
      data: {
        session: {
          access_token: token,
          user: result.data.user,
        },
      },
      error: null,
    };
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    // Check initial state
    const token = getToken();
    if (token) {
      apiFetch('/auth/me').then((result) => {
        if (result.data?.user) {
          callback('SIGNED_IN', { access_token: token, user: result.data.user });
        } else {
          removeToken();
          callback('SIGNED_OUT', null);
        }
      });
    } else {
      setTimeout(() => callback('SIGNED_OUT', null), 0);
    }

    // Listen for storage changes (multi-tab support)
    const listener = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        if (e.newValue) {
          callback('SIGNED_IN', { access_token: e.newValue });
        } else {
          callback('SIGNED_OUT', null);
        }
      }
    };

    window.addEventListener('storage', listener);

    return {
      data: {
        subscription: {
          unsubscribe: () => window.removeEventListener('storage', listener),
        },
      },
    };
  },
};

// ─── Storage Client ───
const storage = {
  from(bucket: string) {
    return {
      async upload(filePath: string, file: File) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', filePath);

        const token = getToken();
        const res = await fetch(`${API_URL}/api/upload/${bucket}`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });

        const json = await res.json();
        if (!res.ok) return { data: null, error: { message: json.error } };
        return { data: json.data, error: null };
      },

      getPublicUrl(filePath: string) {
        return { data: { publicUrl: `${API_URL}/uploads/${bucket}/${filePath}` } };
      },

      async remove(paths: string[]) {
        for (const p of paths) {
          const parts = p.split('/');
          const filename = parts[parts.length - 1];
          await apiFetch(`/api/upload/${bucket}/${filename}`, { method: 'DELETE' });
        }
        return { error: null };
      },
    };
  },
};

// ─── RPC Client ───
async function rpc(functionName: string, params: Record<string, any>) {
  // Map Supabase RPC names to API endpoints
  const rpcMap: Record<string, string> = {
    generate_proposta_number: '/api/propostas/generate-number',
    generate_os_number: '/api/ordens-servico/generate-number',
    generate_relatorio_number: '/api/relatorios/generate-number',
  };

  const endpoint = rpcMap[functionName];
  if (!endpoint) {
    return { data: null, error: { message: `RPC ${functionName} não encontrada` } };
  }

  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ─── Export: mesma interface do supabase ───
export const api = {
  from: (table: string) => new QueryBuilder(table),
  auth,
  storage,
  rpc,
};

// Alias para facilitar a migração
export { api as supabase };
```

---

## Passo 2: Alterar o Import em Cada Arquivo

### A mudança é **uma única linha** por arquivo:

```diff
// ANTES (em cada arquivo)
-import { supabase } from "@/integrations/supabase/client";

// DEPOIS (em cada arquivo)
+import { supabase } from "@/lib/apiClient";
```

### Arquivos que precisam dessa mudança (38 arquivos):

| # | Arquivo | Tipo de uso |
|---|---|---|
| **Auth** | | |
| 1 | `src/hooks/useAuth.ts` | `auth.onAuthStateChange`, `auth.getSession`, `auth.signOut` |
| 2 | `src/pages/Auth.tsx` | `auth.signInWithPassword`, `auth.signUp` |
| **Pages (data fetching)** | | |
| 3 | `src/pages/Dashboard.tsx` | `.from().select()` (11 queries) |
| 4 | `src/pages/Leads.tsx` | `.from().select()`, `.delete()` |
| 5 | `src/pages/Clientes.tsx` | `.from().select()`, `.delete()` |
| 6 | `src/pages/Propostas.tsx` | `.from().select()`, `.rpc()`, `.auth.getUser()` |
| 7 | `src/pages/Obras.tsx` | `.from().select()`, `.delete()` |
| 8 | `src/pages/Medicoes.tsx` | `.from().select()`, `.delete()`, `.storage.remove()` |
| 9 | `src/pages/Estoque.tsx` | `.from().select()`, `.delete()`, `.update()` |
| 10 | `src/pages/Fornecedores.tsx` | `.from().select()`, `.delete()` |
| 11 | `src/pages/Colaboradores.tsx` | `.from().select()`, `.delete()` |
| 12 | `src/pages/Financeiro.tsx` | `.from().select()`, `.insert()`, `.update()`, `.delete()` |
| 13 | `src/pages/Relatorios.tsx` | `.from().select("*, obras(...)")`, `.delete()` |
| **Components (forms)** | | |
| 14 | `src/components/leads/LeadFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()` |
| 15 | `src/components/leads/LeadKanban.tsx` | `.from().select()`, `.update()` |
| 16 | `src/components/clientes/ClienteFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()` |
| 17 | `src/components/propostas/PropostaFormDialog.tsx` | `.auth.getUser()`, `.rpc()`, `.storage.upload()`, `.from().insert()`, `.update()` |
| 18 | `src/components/propostas/OSFormDialog.tsx` | `.from().select()`, `.insert()`, `.update()` |
| 19 | `src/components/propostas/ImportPropostaDialog.tsx` | `.auth.getUser()`, `.from().insert()` |
| 20 | `src/components/propostas/PropostasRelatorio.tsx` | `.from().select()` |
| 21 | `src/components/obras/ObraFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()` |
| 22 | `src/components/obras/ObraDetalhe.tsx` | `.from().select()`, `.delete()`, `.storage.remove()` |
| 23 | `src/components/medicoes/MedicaoFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()`, `.delete()`, `.storage.upload()`, `.storage.remove()` |
| 24 | `src/components/relatorios/RelatorioFormDialog.tsx` | `.auth.getUser()`, `.rpc()`, `.from().insert()`, `.update()` |
| 25 | `src/components/estoque/EstoqueFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()` |
| 26 | `src/components/estoque/SaidaFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()` |
| 27 | `src/components/fornecedores/FornecedorFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()` |
| 28 | `src/components/veiculos/VeiculoFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()` |
| 29 | `src/components/veiculos/VeiculoDetalhe.tsx` | `.from().select()`, `.delete()` |
| 30 | `src/components/veiculos/AbastecimentoFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()` |
| 31 | `src/components/veiculos/RegistroUsoFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()` |
| 32 | `src/components/colaboradores/ColaboradorFormDialog.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()` |
| 33 | `src/components/colaboradores/ColaboradorDocumentos.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()`, `.delete()`, `.storage.upload()`, `.storage.remove()` |
| 34 | `src/components/colaboradores/ColaboradorFolhaPonto.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()`, `.delete()` |
| 35 | `src/components/empresa/DocumentosEmpresa.tsx` | `.auth.getUser()`, `.from().insert()`, `.update()`, `.delete()`, `.storage.upload()` |
| 36 | `src/components/financeiro/DesempenhoTab.tsx` | `.from().select()` |
| 37 | `src/components/financeiro/DespesasTab.tsx` | `.from().select()` |
| **Lib** | | |
| 38 | `src/lib/clienteSync.ts` | `.from().select()`, `.insert()`, `.update()` |

---

## Passo 3: Ajustes Pontuais (além da troca de import)

### 3.1. `useAuth.ts` — Mudar para JWT-based

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/apiClient';

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar token existente
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return { session, loading, signOut };
}
```

### 3.2. `Auth.tsx` — Sem mudança funcional

O apiClient já implementa `auth.signInWithPassword` e `auth.signUp` com a mesma assinatura. Basta trocar o import.

### 3.3. Queries com `.select("*, tabela(col1, col2)")` (joins)

O frontend usa joins do PostgREST em poucos lugares:

| Arquivo | Query Supabase | Adaptação necessária |
|---|---|---|
| `Relatorios.tsx` | `.select("*, obras(titulo, cliente_nome)")` | API retorna o join diretamente |
| `ObraDetalhe.tsx` | `.select("*, propostas(numero)")` | API retorna o join |
| `PropostasRelatorio.tsx` | `.select("*, proposta_itens(*)")` | API retorna itens aninhados |

A API já foi desenhada para retornar esses joins nativamente (ver `03-api-backend.md`).

### 3.4. Remover `getUser()` desnecessários

Muitos componentes fazem `supabase.auth.getUser()` apenas para obter o `user_id` para o `INSERT`. No novo sistema, a API injeta o `user_id` via JWT automaticamente — então esses campos podem ser **omitidos do body**.

**Porém**, para minimizar mudanças, o `apiClient.auth.getUser()` ainda funciona e retorna o user. Então os componentes continuam funcionando sem alteração.

---

## Passo 4: Variável de Ambiente

### Remover do `.env`:
```diff
-VITE_SUPABASE_URL=https://uixhyywpqiwpjghbbtju.supabase.co
-VITE_SUPABASE_PUBLISHABLE_KEY=eyJhb...
-VITE_SUPABASE_PROJECT_ID=uixhyywpqiwpjghbbtju
```

### Adicionar ao `.env`:
```diff
+VITE_API_URL=http://localhost:3001
```

---

## Passo 5: Remover Dependências

```bash
npm uninstall @supabase/supabase-js
```

### Arquivos a deletar:
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- Diretório `src/integrations/` inteiro

---

## Passo 6: Atualizar `vite.config.ts`

Se a API roda em porta diferente durante desenvolvimento:

```typescript
// vite.config.ts
export default defineConfig({
  // ...
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    }
  }
});
```

Com o proxy, o `VITE_API_URL` pode ficar vazio (string vazia = mesmo domínio).

---

## Resumo de Impacto

| Ação | Quantidade |
|---|---|
| Trocar import (1 linha por arquivo) | 38 arquivos |
| Criar novo arquivo | 1 (`src/lib/apiClient.ts`) |
| Deletar arquivos | 2 (`client.ts`, `types.ts`) |
| Alterar `.env` | 1 arquivo |
| Alterar `vite.config.ts` | 1 arquivo |
| Zero mudança na lógica de componentes | ✅ |
| Zero mudança no CSS/UI | ✅ |
