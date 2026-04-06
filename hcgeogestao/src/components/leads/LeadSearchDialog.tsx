import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Phone, Globe, Plus, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";

interface LeadSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function LeadSearchDialog({ open, onOpenChange, onImported }: LeadSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("hcgeotoken");
      const res = await fetch(`${API_URL}/api/search/places?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.setup_required) {
          toast.error("Configuração Necessária", {
            description: "A Google API Key ainda não foi configurada no servidor."
          });
          return;
        }
        throw new Error(err.error || "Erro na busca");
      }

      const data = await res.json();
      setResults(data);
      if (data.length === 0) toast.info("Nenhum resultado encontrado para esta busca.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar com o motor de busca.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (place: any) => {
    setImportingId(place.place_id);
    try {
      const token = localStorage.getItem("hcgeotoken");
      
      // 1. Opcional: Buscar detalhes extras (site/telefone preciso) se necessário
      // Aqui vamos direto com o que temos para simplificar
      
      const payload = {
        nome_contato: place.name,
        empresa: place.name,
        cidade_uf: place.address,
        status: "Novo",
        prioridade: "Média",
        observacoes: `Importado via Search Engine. Endereço original: ${place.address}`,
        telefone_whatsapp: place.phone || ""
      };

      const res = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erro ao importar lead");

      toast.success(`${place.name} importado com sucesso!`);
      onImported();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Globe className="h-5 w-5 text-accent" />
            </div>
            <div>
              <DialogTitle>Lead Search Engine</DialogTitle>
              <DialogDescription>Encontre empresas e clientes no Google Maps e importe para seu funil.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Ex: Serralherias em São Paulo, Clínicas no Rio..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-11 px-6">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar Leads"}
          </Button>
        </form>

        <div className="flex-1 overflow-y-auto mt-6 pr-1 space-y-3 min-h-[300px]">
          {loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p>Consultando o Google...</p>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center border-2 border-dashed rounded-xl border-muted">
              <Info className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground max-w-[250px]">
                Digite o que você procura acima para encontrar novos leads.
              </p>
            </div>
          )}

          {results.map((place) => (
            <div 
              key={place.place_id} 
              className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:border-accent/30 transition-all group"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="font-bold text-foreground leading-tight">{place.name}</h4>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{place.address}</span>
                </div>
                {place.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{place.phone}</span>
                  </div>
                )}
              </div>
              
              <Button 
                size="sm" 
                onClick={() => handleImport(place)}
                disabled={importingId === place.place_id}
                className="shrink-0 bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground shadow-none h-9"
              >
                {importingId === place.place_id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Importar
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-[11px] text-muted-foreground flex items-start gap-2">
           <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
           <p>Os resultados são obtidos via Google Maps. A precisão dos dados depende das informações públicas disponíveis no Google.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
