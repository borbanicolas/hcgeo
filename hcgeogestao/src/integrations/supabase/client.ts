import { API_URL } from "@/lib/api";

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
    return this;
  }

  insert(data: any | any[]) {
    this.method = 'POST';
    this.body = Array.isArray(data) ? data[0] : data;
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
    this.url.searchParams.set(col, String(val));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    const isAsc = opts?.ascending !== false;
    this.url.searchParams.set('order', `${col}.${isAsc ? 'asc' : 'desc'}`);
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  async execute() {
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: this.body ? JSON.stringify(this.body) : undefined,
      });

      if (!res.ok) {
        const error = await res.json();
        return { data: null, error: new Error(error.error || "API Error") };
      }
      
      let data = await res.json();
      
      if (this.singleResult && Array.isArray(data)) {
         data = data[0] || null;
      }
      
      return { data, error: null };
    } catch (e: any) {
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
  rpc: async (func: string, args: any) => {
    try {
      const res = await fetch(`${API_URL}/rpc/${func}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
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