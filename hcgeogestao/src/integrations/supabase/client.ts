import { API_URL } from "@/lib/api";
import { apiAuthHeaders, apiJsonHeaders } from "@/lib/apiClient";

const getToken = () => localStorage.getItem("hcgeotoken");

class MockQueryBuilder {
  table: string;
  url: URL;
  method: string = 'GET';
  body: any = null;
  singleResult: boolean = false;

  constructor(table: string) {
    this.table = table;
    this.url = new URL(`${API_URL}/api/${table}`);
  }

  select(query?: string) {
    if (query) this.url.searchParams.set('select', query);
    if (this.table === 'medicoes') console.log(`[DEBUG FRONT] 🔍 selecione("${query || '*'}")`);
    return this;
  }

  insert(data: any | any[]) {
    this.method = 'POST';
    this.body = data;
    return this;
  }

  update(data: any) {
    this.method = 'PATCH';
    this.body = data;
    return this;
  }

  delete() {
    this.method = 'DELETE';
    return this;
  }
  
  eq(col: string, val: any) {
    this.url.searchParams.append(col, String(val));
    if (this.table === 'medicoes') console.log(`[DEBUG FRONT] 🎯 eq("${col}", "${val}")`);
    return this;
  }
  
  neq(col: string, val: any) {
    this.url.searchParams.append(col, `neq.${val}`);
    if (this.table === 'medicoes') console.log(`[DEBUG FRONT] 🎯 neq("${col}", "${val}")`);
    return this;
  }
  
  gte(col: string, val: any) {
    this.url.searchParams.append(col, `gte.${val}`);
    if (this.table === 'medicoes') console.log(`[DEBUG FRONT] 📈 gte("${col}", "${val}")`);
    return this;
  }
  
  lte(col: string, val: any) {
    this.url.searchParams.append(col, `lte.${val}`);
    if (this.table === 'medicoes') console.log(`[DEBUG FRONT] 📉 lte("${col}", "${val}")`);
    return this;
  }
  
  gt(col: string, val: any) {
    this.url.searchParams.append(col, `gt.${val}`);
    if (this.table === 'medicoes') console.log(`[DEBUG FRONT] 📈 gt("${col}", "${val}")`);
    return this;
  }
  
  lt(col: string, val: any) {
    this.url.searchParams.append(col, `lt.${val}`);
    if (this.table === 'medicoes') console.log(`[DEBUG FRONT] 📉 lt("${col}", "${val}")`);
    return this;
  }
  
  like(col: string, val: any) {
    this.url.searchParams.append(col, `like.${val}`);
    if (this.table === 'medicoes') console.log(`[DEBUG FRONT] 🔎 like("${col}", "${val}")`);
    return this;
  }
  
  in(col: string, vals: any[]) {
    this.url.searchParams.append(col, `in.(${vals.join(",")})`);
    if (this.table === 'medicoes') console.log(`[DEBUG FRONT] 📥 in("${col}", [${vals.length} itens])`);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    const isAsc = opts?.ascending !== false;
    this.url.searchParams.set('order', `${col}.${isAsc ? 'asc' : 'desc'}`);
    if (this.table === 'medicoes') console.log(`[DEBUG FRONT] ↕️ order("${col}", ${isAsc ? 'ASC' : 'DESC'})`);
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  limit(val: number) {
    this.url.searchParams.set('limit', String(val));
    return this;
  }

  async execute() {
    const shouldLog = this.table === 'medicoes' || this.table === 'propostas';
    if (shouldLog) {
      console.log(`[DEBUG FRONT] 🚀 Executando ${this.method} para tabela: ${this.table}`);
      console.log(`[DEBUG FRONT] 🔗 URL Completa:`, this.url.toString());
      if (this.body) console.log(`[DEBUG FRONT] 📦 Payload Enviado:`, this.body);
    }
    
    try {
      if (this.method === 'PATCH' || this.method === 'DELETE') {
         const id = this.url.searchParams.get('id');
         if (id) {
           this.url.pathname += `/${id}`;
           this.url.searchParams.delete('id');
         }
      }
      
      const res = await fetch(this.url.toString(), {
        method: this.method,
        headers: apiJsonHeaders(getToken()),
        body: this.body ? JSON.stringify(this.body) : undefined,
      });

      if (!res.ok) {
        const error = await res.json();
        if (shouldLog) console.error(`[DEBUG FRONT] ❌ Erro na API:`, error);
        return { data: null, error: new Error(error.error || "API Error") };
      }
      
      let data = await res.json();
      if (shouldLog) {
        console.log(`[DEBUG FRONT] ✨ Dados recebidos para ${this.table}:`, Array.isArray(data) ? `${data.length} registros` : 'objeto único', data);
      }
      
      if (this.singleResult && Array.isArray(data)) {
         data = data[0] || null;
      }
      
      return { data, error: null };
    } catch (e: any) {
      if (shouldLog) console.error(`[DEBUG FRONT] 🔥 Erro fatal no fetch:`, e);
      return { data: null, error: e };
    }
  }

  // Permite fazer "await supabase.from(...)" diretamente.
  then(resolve: any, reject: any) {
    this.execute().then(resolve).catch(reject);
  }
}

export const supabase = {
  from: (table: string) => new MockQueryBuilder(table),
  auth: {
    getUser: async () => {
      const u = localStorage.getItem("hcgeouser");
      return { data: { user: u ? JSON.parse(u) : null }, error: null };
    }
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: apiAuthHeaders(getToken()),
            body: formData,
          });
          if (!res.ok) throw new Error("Falha no upload");
          const data = await res.json();
          // Importante: O mock do Supabase geralmente retorna { path: '...' }
          // Nosso backend retorna 'url', vamos mapear para facilitar o uso uniforme
          return { data: { ...data, path: data.url }, error: null };
        } catch (e: any) {
          return { data: null, error: e };
        }
      },
      getPublicUrl: (path: string) => {
        // Garantir que a URL seja absoluta usando a API_URL configurada
        let publicUrl = path;
        if (path && !path.startsWith('http')) {
          // Remove barra inicial se houver para evitar barra dupla
          const cleanPath = path.startsWith('/') ? path.substring(1) : path;
          publicUrl = `${API_URL}/${cleanPath}`;
        }
        return { data: { publicUrl } };
      },
      remove: async (paths: string[]) => {
        // Implement removal if needed, for now just mock success
        return { data: null, error: null };
      }
    })
  },
  rpc: async (func: string, args: any) => {
    try {
      const res = await fetch(`${API_URL}/rpc/${func}`, {
        method: 'POST',
        headers: apiJsonHeaders(getToken()),
        body: JSON.stringify(args)
      });
      if (!res.ok) throw new Error("RPC falhou");
      const data = await res.json();
      return { data: data.result || data, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  }
} as any;