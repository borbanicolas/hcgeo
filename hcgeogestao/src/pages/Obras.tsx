import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ObraFormDialog } from "@/components/obras/ObraFormDialog";
import { ObraDetalhe } from "@/components/obras/ObraDetalhe";
import { ObraKanban } from "@/components/obras/ObraKanban";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MapPin,
  Users,
  CalendarDays,
  Hotel,
  UtensilsCrossed,
  Truck as TruckIcon,
  LayoutGrid,
  List,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  Planejada: "bg-muted text-muted-foreground",
  "Em Mobilização": "bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]",
  "Em Andamento": "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]",
  Pausada: "bg-destructive/80 text-destructive-foreground",
  Concluída: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  Cancelada: "bg-destructive text-destructive-foreground",
};

export default function Obras() {
  const { toast } = useToast();
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObra, setEditingObra] = useState<any>(null);
  const [selectedObra, setSelectedObra] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchObras = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("obras")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) {
      setObras(data || []);
      setSelectedObra((prev: any) => {
        if (!prev) return null;
        const updated = (data || []).find((o: any) => o.id === prev.id);
        return updated ?? null;
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchObras();
  }, [fetchObras]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("obras").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Obra excluída" });
      fetchObras();
    }
    setDeleteId(null);
  };

  const filtered = obras.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.titulo?.toLowerCase().includes(q) ||
      o.cliente_nome?.toLowerCase().includes(q) ||
      o.local_obra?.toLowerCase().includes(q)
    );
  });

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

  const total = obras.length;
  const concluidas = obras.filter((o) => o.status === "Concluída").length;
  const ativas = obras.filter((o) => o.status !== "Concluída" && o.status !== "Cancelada").length;

  const openEdit = (obra: any) => {
    setEditingObra(obra);
    setDialogOpen(true);
  };

  // Detail view (form dialog stays mounted so "Editar" from detail works)
  if (selectedObra) {
    return (
      <>
        <ObraDetalhe
          obra={selectedObra}
          onBack={() => setSelectedObra(null)}
          onEdit={() => {
            setEditingObra(selectedObra);
            setDialogOpen(true);
          }}
        />
        <ObraFormDialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setEditingObra(null);
          }}
          obra={editingObra}
          onSuccess={() => {
            void fetchObras();
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Obras</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} obra{total !== 1 ? "s" : ""} · cronograma, equipes e campo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "kanban"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Kanban"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
            onClick={() => {
              setEditingObra(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nova Obra
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card py-3 px-4">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total</p>
          <p className="text-lg font-bold text-foreground">{total}</p>
        </div>
        <div className="stat-card py-3 px-4">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Ativas</p>
          <p className="text-lg font-bold text-foreground">{ativas}</p>
        </div>
        <div className="stat-card py-3 px-4">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Concluídas</p>
          <p className="text-lg font-bold text-[hsl(var(--success))]">{concluidas}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título, cliente ou local..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Nenhuma obra encontrada</p>
          <Button variant="link" onClick={() => { setEditingObra(null); setDialogOpen(true); }}>
            Criar primeira obra
          </Button>
        </div>
      ) : viewMode === "kanban" ? (
        <ObraKanban
          obras={filtered}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
          onOpenDetail={setSelectedObra}
          onRefresh={fetchObras}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((obra, i) => (
            <motion.div
              key={obra.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent/40 transition-all"
                onClick={() => setSelectedObra(obra)}
              >
                <CardContent className="p-0">
                  <div className="p-4 pb-3 border-b border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{obra.titulo}</h3>
                        <p className="text-sm text-muted-foreground truncate">{obra.cliente_nome || "Sem cliente"}</p>
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 text-[10px]",
                          statusColors[obra.status] || "bg-muted text-muted-foreground"
                        )}
                      >
                        {obra.status}
                      </Badge>
                    </div>
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Progresso</span>
                        <span className="font-medium">{obra.progresso}%</span>
                      </div>
                      <Progress value={obra.progresso} className="h-1.5" />
                    </div>
                  </div>

                  <div className="p-4 space-y-2 text-sm">
                    {obra.local_obra && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{obra.local_obra}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {formatDate(obra.data_inicio)} → {formatDate(obra.data_previsao_fim)}
                      </span>
                    </div>
                    {obra.responsavel && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {obra.responsavel}
                          {obra.equipe_campo ? ` | ${obra.equipe_campo}` : ""}
                        </span>
                      </div>
                    )}

                    {(obra.hotel || obra.alimentacao || obra.transporte) && (
                      <div className="flex items-center gap-3 pt-1">
                        {obra.hotel && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Hotel className="h-3 w-3" /> Hotel
                          </div>
                        )}
                        {obra.alimentacao && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UtensilsCrossed className="h-3 w-3" /> Alim.
                          </div>
                        )}
                        {obra.transporte && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TruckIcon className="h-3 w-3" /> Transp.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex border-t border-border" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 rounded-none text-xs"
                      onClick={() => openEdit(obra)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 rounded-none text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(obra.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ObraFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditingObra(null);
        }}
        obra={editingObra}
        onSuccess={() => {
          void fetchObras();
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir obra?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
