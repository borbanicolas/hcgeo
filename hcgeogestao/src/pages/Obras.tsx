import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ObraFormDialog } from "@/components/obras/ObraFormDialog";
import { ObraDetalhe } from "@/components/obras/ObraDetalhe";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, MapPin, Users, CalendarDays, Hotel, UtensilsCrossed, Truck as TruckIcon,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [selectedObra, setSelectedObra] = useState<any>(null);

  const fetchObras = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("obras")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) {
      setObras(data || []);
      // Refresh selected obra if it exists
      if (selectedObra) {
        const updated = (data || []).find((o) => o.id === selectedObra.id);
        if (updated) setSelectedObra(updated);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchObras(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("obras").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Obra excluída" });
      fetchObras();
    }
  };

  const filtered = obras.filter((o) => {
    const matchSearch =
      o.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente_nome?.toLowerCase().includes(search.toLowerCase()) ||
      o.local_obra?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDate = (d?: string) => (d ? format(new Date(d + "T12:00:00"), "dd/MM/yyyy") : "—");

  const allStatuses = ["Todos", "Planejada", "Em Mobilização", "Em Andamento", "Pausada", "Concluída", "Cancelada"];

  // Detail view
  if (selectedObra) {
    return (
      <>
        <ObraDetalhe
          obra={selectedObra}
          onBack={() => setSelectedObra(null)}
          onEdit={() => { setEditingObra(selectedObra); setDialogOpen(true); }}
        />
        <ObraFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          obra={editingObra}
          onSuccess={() => { fetchObras(); }}
        />
      </>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Obras</h1>
          <p className="text-sm text-muted-foreground">Cronograma, equipes, medições e logística de campo</p>
        </div>
        <Button onClick={() => { setEditingObra(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Obra
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar obra..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allStatuses.map((s) => (
            <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} className="text-xs">
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma obra encontrada</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((obra) => (
            <Card
              key={obra.id}
              className="overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent/40 transition-all"
              onClick={() => setSelectedObra(obra)}
            >
              <CardContent className="p-0">
                {/* Header */}
                <div className="p-4 pb-3 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{obra.titulo}</h3>
                      <p className="text-sm text-muted-foreground truncate">{obra.cliente_nome || "Sem cliente"}</p>
                    </div>
                    <Badge className={cn("shrink-0 text-[10px]", statusColors[obra.status] || "bg-muted text-muted-foreground")}>
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

                {/* Details */}
                <div className="p-4 space-y-2 text-sm">
                  {obra.local_obra && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{obra.local_obra}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatDate(obra.data_inicio)} → {formatDate(obra.data_previsao_fim)}</span>
                  </div>
                  {obra.responsavel && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{obra.responsavel}{obra.equipe_campo ? ` | ${obra.equipe_campo}` : ""}</span>
                    </div>
                  )}

                  {(obra.hotel || obra.alimentacao || obra.transporte) && (
                    <div className="flex items-center gap-3 pt-1">
                      {obra.hotel && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Hotel className="h-3 w-3" /> Hotel</div>}
                      {obra.alimentacao && <div className="flex items-center gap-1 text-xs text-muted-foreground"><UtensilsCrossed className="h-3 w-3" /> Alim.</div>}
                      {obra.transporte && <div className="flex items-center gap-1 text-xs text-muted-foreground"><TruckIcon className="h-3 w-3" /> Transp.</div>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex border-t border-border" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs" onClick={() => { setEditingObra(obra); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir obra?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(obra.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ObraFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        obra={editingObra}
        onSuccess={fetchObras}
      />
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
