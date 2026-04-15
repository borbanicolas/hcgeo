import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, MapPin, Phone, Mail, Plus, Loader2, Info, Hash } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { apiAuthHeaders, apiJsonHeaders } from "@/lib/apiClient";

interface LeadCnaeSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function LeadCnaeSearchDialog({ open, onOpenChange, onImported }: LeadCnaeSearchDialogProps) {
  const [term, setTerm] = useState("");
  const [cnaeCode, setCnaeCode] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() && !cnaeCode.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("hcgeotoken");
      let url = `${API_URL}/api/external/cnae/search?`;
      if (term) url += `term=${encodeURIComponent(term)}&`;
      if (cnaeCode) url += `cnae=${encodeURIComponent(cnaeCode)}`;

      const res = await fetch(url, {
        headers: apiAuthHeaders(token),
      });

      if (!res.ok) throw new Error("Erro na busca por CNAE");
      
      const data = await res.json();
      // O formato da API listacnae costuma vir em .dados
      setResults(data.dados || []);
      if ((data.dados || []).length === 0) toast.info("Nenhuma empresa encontrada com este critério.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (company: any) => {
    setImportingId(company.cnpj);
    try {
      const token = localStorage.getItem("hcgeotoken");
      
      const payload = {
        nome_contato: company.contato_nome || company.razao_social,
        empresa: company.razao_social || company.nome_fantasia,
        cidade_uf: `${company.municipio || ""} - ${company.uf || ""}`,
        status: "Novo",
        prioridade: "Média",
        email: company.email || "",
        telefone_whatsapp: company.telefone1 || company.telefone || "",
        observacoes: `Importado via CNAE Search (ListaCNAE). CNPJ: ${company.cnpj}. CNAE: ${company.cnae_primario_descricao || company.cnae_primario_codigo}`
      };

      const res = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: apiJsonHeaders(token),
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erro ao importar lead");

      toast.success(`${company.razao_social} importado com sucesso!`);
      onImported();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Busca Especializada por CNAE</DialogTitle>
              <DialogDescription>Consulte bases oficiais de empresas por atividade econômica.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-[2]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Palavra-chave (ex: Serralheria)" 
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cód. CNAE (apenas números)" 
              value={cnaeCode}
              onChange={(e) => setCnaeCode(e.target.value.replace(/\D/g, ""))}
              className="pl-9 h-11 font-mono"
            />
          </div>

          <Button type="submit" disabled={loading} className="h-11 px-8 bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
          </Button>
        </form>

        <div className="flex-1 overflow-y-auto mt-6 pr-1 space-y-3 min-h-[350px]">
          {loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Consultando Base de Dados Oficiais...</p>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center border-2 border-dashed rounded-xl border-muted">
              <Building2 className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Digite um termo para buscar empresas ativas.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((comp) => (
              <div 
                key={comp.cnpj} 
                className="flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all group"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-foreground text-sm leading-tight uppercase line-clamp-2">
                      {comp.razao_social || comp.nome_fantasia}
                    </h4>
                    <Badge variant="outline" className="text-[9px] shrink-0">{comp.cnpj}</Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{comp.municipio} - {comp.uf}</span>
                    </div>
                    {comp.email && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{comp.email}</span>
                      </div>
                    )}
                    {(comp.telefone1 || comp.telefone) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{comp.telefone1 || comp.telefone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-1">
                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 italic">
                       {comp.cnae_primario_descricao}
                    </p>
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  onClick={() => handleImport(comp)}
                  disabled={importingId === comp.cnpj}
                  className="w-full mt-4 h-9 gap-2"
                >
                  {importingId === comp.cnpj ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Importar como Lead
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-[10px] text-muted-foreground flex items-center gap-2">
           <Info className="h-3.5 w-3.5 shrink-0" />
           <p>Dados fornecidos via Integração Oficial ListaCNAE. O uso da API consome créditos da plataforma.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
