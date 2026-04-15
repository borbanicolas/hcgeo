import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RelatorioFormDialog } from "@/components/relatorios/RelatorioFormDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, FileText, CalendarDays, User, Eye,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  "Em Elaboração": "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]",
  "Em Revisão": "bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))]",
  "Aprovado": "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  "Entregue": "bg-primary text-primary-foreground",
  "Cancelado": "bg-destructive text-destructive-foreground",
};

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Relatorios() {
  const { toast } = useToast();
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("Todos");

  const fetchRelatorios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("relatorios")
      .select("*, obras(titulo, cliente_nome)")
      .order("created_at", { ascending: false });
    if (!error) setRelatorios(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRelatorios(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("relatorios").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
    else { toast({ title: "Relatório excluído" }); fetchRelatorios(); }
  };

  const filtered = relatorios.filter((r) => {
    const matchSearch =
      r.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      r.numero?.toLowerCase().includes(search.toLowerCase()) ||
      (r.obras as any)?.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      (r.obras as any)?.cliente_nome?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "Todos" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try {
      const dateOnly = d.split("T")[0];
      return format(new Date(dateOnly + "T12:00:00"), "dd/MM/yyyy");
    } catch {
      return "—";
    }
  };

  const allStatuses = ["Todos", "Em Elaboração", "Em Revisão", "Aprovado", "Entregue", "Cancelado"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Geração e acompanhamento de relatórios técnicos</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Relatório
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar relatório..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
        <div className="text-center py-12 text-muted-foreground">Nenhum relatório encontrado</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((rel) => {
            const obra = rel.obras as any;
            return (
              <Card key={rel.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="p-4 pb-3 border-b border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-muted-foreground mb-0.5">{rel.numero}</p>
                        <h3 className="font-semibold text-foreground truncate">{rel.titulo}</h3>
                      </div>
                      <Badge className={cn("shrink-0 text-[10px]", statusColors[rel.status] || "bg-muted text-muted-foreground")}>
                        {rel.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{rel.tipo}</span>
                    </div>

                    {obra && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Eye className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{obra.titulo} — {obra.cliente_nome}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span>Emissão: {formatDate(rel.data_emissao)}{rel.data_entrega ? ` | Entrega: ${formatDate(rel.data_entrega)}` : ""}</span>
                    </div>

                    {rel.responsavel && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{rel.responsavel}{rel.revisor ? ` | Rev: ${rel.revisor}` : ""}</span>
                      </div>
                    )}

                    {rel.versao && rel.versao !== "1.0" && (
                      <div className="text-xs text-muted-foreground pt-1 border-t border-border mt-2">
                        Versão {rel.versao}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex border-t border-border">
                    <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs" onClick={() => { setEditing(rel); setDialogOpen(true); }}>
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
                          <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(rel.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RelatorioFormDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        relatorio={editing}
        onSuccess={fetchRelatorios}
      />
    </div>
  );
}
