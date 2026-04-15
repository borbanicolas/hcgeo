import { useState } from "react";
import { motion } from "framer-motion";
import {
  Pencil,
  Trash2,
  GripVertical,
  MapPin,
  CalendarDays,
  Users,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const OBRA_KANBAN_STATUSES = [
  "Planejada",
  "Em Mobilização",
  "Em Andamento",
  "Pausada",
  "Concluída",
  "Cancelada",
] as const;

const statusMeta: Record<string, { dotColor: string }> = {
  Planejada: { dotColor: "bg-muted-foreground/40" },
  "Em Mobilização": { dotColor: "bg-[hsl(var(--info))]" },
  "Em Andamento": { dotColor: "bg-[hsl(var(--warning))]" },
  Pausada: { dotColor: "bg-destructive/80" },
  Concluída: { dotColor: "bg-[hsl(var(--success))]" },
  Cancelada: { dotColor: "bg-destructive" },
};

function normalizeStatus(raw: string | undefined | null): string {
  if (!raw) return "Planejada";
  if (OBRA_KANBAN_STATUSES.includes(raw as (typeof OBRA_KANBAN_STATUSES)[number])) return raw;
  return "Planejada";
}

interface ObraKanbanProps {
  obras: any[];
  onEdit: (obra: any) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (obra: any) => void;
  onRefresh: () => void;
}

export function ObraKanban({
  obras,
  onEdit,
  onDelete,
  onOpenDetail,
  onRefresh,
}: ObraKanbanProps) {
  const { toast } = useToast();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try {
      const date = new Date(d.includes("T") ? d : d + "T12:00:00");
      if (isNaN(date.getTime())) return "—";
      return format(date, "dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

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
    const obraId = e.dataTransfer.getData("text/plain");
    if (!obraId) return;

    const obra = obras.find((o) => o.id === obraId);
    const current = normalizeStatus(obra?.status);
    if (!obra || current === newStatus) {
      setDraggedId(null);
      return;
    }

    const { error } = await supabase.from("obras").update({ status: newStatus }).eq("id", obraId);
    if (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } else {
      toast({ title: `Obra movida para “${newStatus}”` });
      onRefresh();
    }
    setDraggedId(null);
  };

  return (
    <div
      className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2 snap-x"
      style={{ minHeight: 400 }}
    >
      {OBRA_KANBAN_STATUSES.map((status) => {
        const colObras = obras.filter((o) => normalizeStatus(o.status) === status);
        const avgProgress =
          colObras.length > 0
            ? Math.round(
                colObras.reduce((s, o) => s + (Number(o.progresso) || 0), 0) / colObras.length
              )
            : 0;
        const meta = statusMeta[status];
        const isOver = overColumn === status;

        return (
          <div
            key={status}
            className={cn(
              "flex-shrink-0 w-[260px] snap-start flex flex-col rounded-xl border transition-colors duration-150",
              isOver ? "border-accent bg-accent/5" : "border-border bg-muted/30"
            )}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", meta?.dotColor)} />
                <span className="text-xs font-semibold text-foreground truncate">{status}</span>
                <span className="ml-auto text-[10px] font-medium bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                  {colObras.length}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                {colObras.length === 0 ? "—" : `${avgProgress}% progresso médio`}
              </p>
            </div>

            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[60vh]">
              {colObras.length === 0 && (
                <div className="text-center py-6 text-[11px] text-muted-foreground">
                  Arraste obras aqui
                </div>
              )}
              {colObras.map((obra) => (
                <motion.div key={obra.id} layout className="block">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, obra.id)}
                    onClick={() => onOpenDetail(obra)}
                    className={cn(
                      "bg-card rounded-lg border border-border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group",
                      draggedId === obra.id && "opacity-40"
                    )}
                  >
                  <div className="flex items-start gap-1.5">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-foreground line-clamp-2">
                        {obra.titulo}
                      </span>
                      {obra.cliente_nome && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {obra.cliente_nome}
                        </p>
                      )}

                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Progresso</span>
                          <span className="font-medium text-foreground">{obra.progresso ?? 0}%</span>
                        </div>
                        <Progress value={obra.progresso ?? 0} className="h-1" />
                      </div>

                      {obra.local_obra && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{obra.local_obra}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {formatDate(obra.data_inicio)} → {formatDate(obra.data_previsao_fim)}
                        </span>
                      </div>

                      {obra.responsavel && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                          <Users className="h-3 w-3 shrink-0" />
                          <span className="truncate">{obra.responsavel}</span>
                        </div>
                      )}

                      <div
                        className="flex items-center justify-end gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onEdit(obra)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(obra.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
