import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, UserCheck, Phone, Mail, Building2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Lead {
  id: string;
  empresa: string;
  nome_contato: string;
  telefone_whatsapp: string;
  email: string;
  cidade_uf: string;
  status: string;
  cliente_id: string | null; // Adicionado para controle de duplicidade
}

interface ImportLeadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportLeadDialog({ isOpen, onOpenChange, onSuccess }: ImportLeadDialogProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const token = localStorage.getItem("hcgeotoken");

  // Buscar Leads Existentes
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["leads_to_import"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/leads`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Falha ao buscar leads");
      return res.json();
    },
    enabled: isOpen
  });

  // Mutação para criar o Cliente e VINCULAR ao Lead
  const mutImport = useMutation({
    mutationFn: async (lead: Lead) => {
      // 1. Criar o Cliente
      const clientRes = await fetch(`${API_URL}/api/clientes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          razao_social: lead.empresa || lead.nome_contato,
          nome_fantasia: lead.empresa || "",
          contato_principal: lead.nome_contato,
          telefone: lead.telefone_whatsapp,
          email: lead.email,
          cidade_uf: lead.cidade_uf,
          tipo_cliente: lead.empresa ? "Pessoa Jurídica" : "Pessoa Física",
          observacoes: `Importado do Lead: ${lead.id}`
        })
      });

      if (!clientRes.ok) throw new Error("Não foi possível criar o cliente. Verifique os dados.");
      const clientData = await clientRes.json();

      // 2. Atualizar o Lead com o ID do novo Cliente (USANDO PATCH conforme o crud.js)
      const updateLeadRes = await fetch(`${API_URL}/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          cliente_id: clientData.id,
          status: lead.status // GARANTINDO que o status não mude e ele continue no Kanban!
        })
      });

      if (!updateLeadRes.ok) {
        throw new Error("Cliente foi criado, mas o Lead não pôde ser marcado como convertido. Remova o lead manualmente ou tente novamente.");
      }
      
      return clientData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["leads_to_import"] });
      if (onSuccess) onSuccess();
      toast({
        title: "✅ Sucesso!",
        description: "O Lead foi convertido e agora já aparece na sua lista de Clientes.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Ops! Algo deu errado",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Filtragem local: remove leads que JÁ POSSUEM cliente_id
  const filteredLeads = leads
    .filter(lead => !lead.cliente_id) // REGRA DE OURO: Não mostrar convertidos
    .filter(lead => 
      (lead.empresa?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.nome_contato?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.telefone_whatsapp?.includes(searchTerm))
    );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Importar de Leads
          </DialogTitle>
          <DialogDescription>
            Mostrando apenas leads que ainda não foram convertidos em clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, empresa ou telefone..."
              className="pl-9 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-3 pb-6">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum novo lead disponível para importação.</div>
            ) : (
              filteredLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-sm">{lead.empresa || "Sem Empresa"}</span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {lead.status}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium text-foreground/80">{lead.nome_contato}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {lead.telefone_whatsapp && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {lead.telefone_whatsapp}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {lead.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button 
                    size="sm" 
                    variant="secondary"
                    className="h-9 gap-2 group"
                    onClick={() => mutImport.mutate(lead)}
                    disabled={mutImport.isPending}
                  >
                    {mutImport.isPending ? (
                      "Convertendo..."
                    ) : (
                      <>
                        Importar <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
