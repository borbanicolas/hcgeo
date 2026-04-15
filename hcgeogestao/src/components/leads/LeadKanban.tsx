import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, Building2, Pencil, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { API_URL } from "@/lib/api";
import { apiJsonHeaders } from "@/lib/apiClient";

const STATUSES = [
  "Novo",
  "Qualificado",
  "Portfólio Enviado",
  "Reunião Agendada",
  "Proposta Enviada",
  "Negociação",
  "Fechado (Ganho)",
  "Fechado (Perdido)",
];

const statusMeta: Record<string, { color: string; dotColor: string }> = {
  "Novo": { color: "bg-[hsl(var(--pipeline-novo))]", dotColor: "bg-[hsl(var(--pipeline-novo))]" },
  "Qualificado": { color: "bg-[hsl(var(--pipeline-qualificado))]", dotColor: "bg-[hsl(var(--pipeline-qualificado))]" },
  "Portfólio Enviado": { color: "bg-[hsl(var(--pipeline-portfolio))]", dotColor: "bg-[hsl(var(--pipeline-portfolio))]" },
  "Reunião Agendada": { color: "bg-[hsl(var(--pipeline-reuniao))]", dotColor: "bg-[hsl(var(--pipeline-reuniao))]" },
  "Proposta Enviada": { color: "bg-[hsl(var(--pipeline-proposta))]", dotColor: "bg-[hsl(var(--pipeline-proposta))]" },
  "Negociação": { color: "bg-[hsl(var(--pipeline-negociacao))]", dotColor: "bg-[hsl(var(--pipeline-negociacao))]" },
  "Fechado (Ganho)": { color: "bg-[hsl(var(--pipeline-ganho))]", dotColor: "bg-[hsl(var(--pipeline-ganho))]" },
  "Fechado (Perdido)": { color: "bg-[hsl(var(--pipeline-perdido))]", dotColor: "bg-[hsl(var(--pipeline-perdido))]" },
};

const prioridadeColors: Record<string, string> = {
  "Alta": "border-destructive text-destructive",
  "Média": "border-[hsl(var(--warning))] text-accent",
  "Baixa": "border-muted-foreground text-muted-foreground",
};

interface LeadKanbanProps {
  leads: any[];
  onEdit: (lead: any) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function LeadKanban({ leads, onEdit, onDelete, onRefresh }: LeadKanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverColumn(status);
  };

  const handleDragLeave = () => setOverColumn(null);

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setOverColumn(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) {
      setDraggedId(null);
      return;
    }

    try {
      const token = localStorage.getItem("hcgeotoken");
      
      const res = await fetch(`${API_URL}/api/leads/${leadId}`, {
        method: "PATCH",
        headers: apiJsonHeaders(token),
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) throw new Error("Erro na API");
      
      toast.success(`Lead movido para "${newStatus}"`);
      onRefresh();
    } catch (err) {
      toast.error("Erro ao mover lead");
    }

    setDraggedId(null);
  };

  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2 snap-x"
      style={{ minHeight: 400 }}
    >
      {STATUSES.map((status) => {
        const colLeads = leads.filter((l) => l.status === status);
        const colTotal = colLeads.reduce((s, l) => s + (l.valor_estimado || 0), 0);
        const meta = statusMeta[status];
        const isOver = overColumn === status;

        return (
          <div
            key={status}
            className={`flex-shrink-0 w-[260px] snap-start flex flex-col rounded-xl border transition-colors duration-150 ${
              isOver
                ? "border-accent bg-accent/5"
                : "border-border bg-muted/30"
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${meta.dotColor}`} />
                <span className="text-xs font-semibold text-foreground truncate">{status}</span>
                <span className="ml-auto text-[10px] font-medium bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                  {colLeads.length}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {fmt.format(colTotal)}
              </p>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
              {colLeads.length === 0 && (
                <div className="text-center py-6 text-[11px] text-muted-foreground">
                  Arraste leads aqui
                </div>
              )}
              {colLeads.map((lead) => (
                <motion.div
                  key={lead.id}
                  layout
                  draggable
                  onDragStart={(e: any) => handleDragStart(e, lead.id)}
                  className={`bg-card rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group ${
                    draggedId === lead.id ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {lead.nome_contato}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 leading-4 ${prioridadeColors[lead.prioridade] || ""}`}
                        >
                          {lead.prioridade}
                        </Badge>
                      </div>

                      {lead.empresa && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{lead.empresa}</span>
                        </div>
                      )}

                      {lead.tipo_servico_interesse?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {lead.tipo_servico_interesse.slice(0, 2).map((s: string) => (
                            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {s}
                            </span>
                          ))}
                          {lead.tipo_servico_interesse.length > 2 && (
                            <span className="text-[9px] text-muted-foreground">
                              +{lead.tipo_servico_interesse.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] font-semibold text-foreground">
                          {fmt.format(lead.valor_estimado || 0)}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {lead.telefone_whatsapp && (
                            <a
                              href={`https://wa.me/${lead.telefone_whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-[hsl(var(--success))] transition-colors"
                            >
                              <Phone className="h-3 w-3" />
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Mail className="h-3 w-3" />
                            </a>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(lead); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
