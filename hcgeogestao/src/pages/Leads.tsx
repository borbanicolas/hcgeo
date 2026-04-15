import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Phone, Mail, Building2, Pencil, Trash2, LayoutGrid, List, Globe, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LeadFormDialog } from "@/components/leads/LeadFormDialog";
import { LeadKanban } from "@/components/leads/LeadKanban";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { apiAuthHeaders } from "@/lib/apiClient";
import { LeadSearchDialog } from "@/components/leads/LeadSearchDialog";
import { LeadCnaeSearchDialog } from "@/components/leads/LeadCnaeSearchDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  "Novo": "bg-[hsl(var(--pipeline-novo))] text-info-foreground",
  "Qualificado": "bg-[hsl(var(--pipeline-qualificado))] text-info-foreground",
  "Portfólio Enviado": "bg-[hsl(var(--pipeline-portfolio))] text-warning-foreground",
  "Reunião Agendada": "bg-[hsl(var(--pipeline-reuniao))] text-info-foreground",
  "Proposta Enviada": "bg-[hsl(var(--pipeline-proposta))] text-info-foreground",
  "Negociação": "bg-[hsl(var(--pipeline-negociacao))] text-warning-foreground",
  "Fechado (Ganho)": "bg-[hsl(var(--pipeline-ganho))] text-success-foreground",
  "Fechado (Perdido)": "bg-[hsl(var(--pipeline-perdido))] text-destructive-foreground",
};

const prioridadeColors: Record<string, string> = {
  "Alta": "border-destructive text-destructive",
  "Média": "border-[hsl(var(--warning))] text-accent",
  "Baixa": "border-muted-foreground text-muted-foreground",
};

const Leads = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [cnaeSearchOpen, setCnaeSearchOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoadingData(true);
    try {
      const token = localStorage.getItem("hcgeotoken");
      const res = await fetch(`${API_URL}/api/leads`, {
        headers: apiAuthHeaders(token),
      });
      
      const data = await res.json();
      setLeads(data || []);
    } catch (error) {
      toast.error("Erro ao carregar leads");
      setLeads([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem("hcgeotoken");
      const res = await fetch(`${API_URL}/api/leads/${deleteId}`, {
        method: "DELETE",
        headers: apiAuthHeaders(token),
      });
      if (!res.ok) throw new Error("Erro na exclusão");
      toast.success("Lead excluído");
      fetchLeads();
    } catch (err) {
      toast.error("Erro ao excluir lead");
    } finally {
      setDeleteId(null);
    }
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.nome_contato?.toLowerCase().includes(search.toLowerCase()) ||
      l.empresa?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (lead: any) => { setEditingLead(lead); setDialogOpen(true); };

  // Pipeline summary
  const totalPipeline = leads.reduce((s, l) => s + (l.valor_estimado || 0), 0);
  const ganhos = leads.filter((l) => l.status === "Fechado (Ganho)").length;
  const abertos = leads.filter((l) => !l.status.startsWith("Fechado")).length;
  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} no funil
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "kanban" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
            <Button 
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10" 
                onClick={() => setCnaeSearchOpen(true)}
              >
                <Hash className="h-4 w-4" />
                CNAE Search
              </Button>

              <Button 
                variant="outline"
                className="gap-2 border-accent text-accent hover:bg-accent/10" 
                onClick={() => setSearchDialogOpen(true)}
              >
                <Globe className="h-4 w-4" />
                Search Engine
              </Button>

              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => { setEditingLead(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4" />
                Novo Lead
              </Button>
        </div>
      </div>

      {/* Pipeline KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card py-3 px-4">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Pipeline</p>
          <p className="text-lg font-bold text-foreground">{fmt.format(totalPipeline)}</p>
        </div>
        <div className="stat-card py-3 px-4">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Abertos</p>
          <p className="text-lg font-bold text-foreground">{abertos}</p>
        </div>
        <div className="stat-card py-3 px-4">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Ganhos</p>
          <p className="text-lg font-bold text-[hsl(var(--success))]">{ganhos}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="stat-card flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhum lead encontrado</p>
          <Button variant="link" onClick={() => { setEditingLead(null); setDialogOpen(true); }}>Criar primeiro lead</Button>
        </div>
      ) : viewMode === "kanban" ? (
        <LeadKanban
          leads={filteredLeads}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
          onRefresh={fetchLeads}
        />
      ) : (
        /* LIST VIEW */
        <div className="space-y-3">
          {filteredLeads.map((lead, i) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="stat-card cursor-pointer group"
              onClick={() => openEdit(lead)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{lead.nome_contato}</h3>
                    <Badge variant="outline" className={prioridadeColors[lead.prioridade] || ""}>
                      {lead.prioridade}
                    </Badge>
                  </div>
                  {lead.empresa && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{lead.empresa}</span>
                      {lead.cidade_uf && <><span className="mx-1">·</span><span className="truncate">{lead.cidade_uf}</span></>}
                    </div>
                  )}
                </div>
                <span className={`pipeline-badge ${statusColors[lead.status] || "bg-muted text-muted-foreground"}`}>
                  {lead.status}
                </span>
              </div>

              {lead.tipo_servico_interesse?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {lead.tipo_servico_interesse.map((s: string) => (
                    <span key={s} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">
                  {fmt.format(lead.valor_estimado || 0)}
                </span>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {lead.telefone_whatsapp && (
                    <a href={`https://wa.me/${lead.telefone_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[hsl(var(--success))] transition-colors">
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="text-muted-foreground hover:text-foreground transition-colors">
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={() => openEdit(lead)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteId(lead.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <LeadFormDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={editingLead} onSaved={fetchLeads} />

      <LeadSearchDialog 
        open={searchDialogOpen} 
        onOpenChange={setSearchDialogOpen} 
        onImported={fetchLeads} 
      />

      <LeadCnaeSearchDialog
        open={cnaeSearchOpen}
        onOpenChange={setCnaeSearchOpen}
        onImported={fetchLeads}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Leads;
