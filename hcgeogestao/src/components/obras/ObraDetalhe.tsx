import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MedicaoFormDialog } from "@/components/medicoes/MedicaoFormDialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Pencil, Trash2, CalendarDays, MapPin, CloudSun, Camera, Ruler,
  Users, Hotel, UtensilsCrossed, Truck as TruckIcon, FileText, ClipboardList,
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

const climaIcons: Record<string, string> = {
  Ensolarado: "☀️", Nublado: "☁️", Chuvoso: "🌧️", "Parcialmente nublado": "⛅", Tempestade: "⛈️",
};

interface ObraDetalheProps {
  obra: any;
  onBack: () => void;
  onEdit: () => void;
}

export function ObraDetalhe({ obra, onBack, onEdit }: ObraDetalheProps) {
  const { toast } = useToast();
  const [medicoes, setMedicoes] = useState<any[]>([]);
  const [fotoCounts, setFotoCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMedicao, setEditingMedicao] = useState<any>(null);

  const fetchMedicoes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("medicoes")
      .select("*")
      .eq("obra_id", obra.id)
      .order("data_registro", { ascending: false });
    setMedicoes(data || []);

    if (data && data.length > 0) {
      const ids = data.map((m) => m.id);
      const { data: fotosData } = await supabase
        .from("medicao_fotos")
        .select("medicao_id")
        .in("medicao_id", ids);
      const counts: Record<string, number> = {};
      (fotosData || []).forEach((f) => {
        counts[f.medicao_id] = (counts[f.medicao_id] || 0) + 1;
      });
      setFotoCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { fetchMedicoes(); }, [obra.id]);

  const handleDeleteMedicao = async (id: string) => {
    const { data: fotos } = await supabase.from("medicao_fotos").select("url").eq("medicao_id", id);
    if (fotos) {
      const paths = fotos.map((f) => {
        const parts = f.url.split("/medicao-fotos/");
        return parts[1] || "";
      }).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("medicao-fotos").remove(paths);
      }
    }
    const { error } = await supabase.from("medicoes").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Medição excluída" });
      fetchMedicoes();
    }
  };

  const formatDate = (d?: string) => (d ? format(new Date(d + "T12:00:00"), "dd/MM/yyyy") : "—");

  // Calculate totals
  const totalQtd = medicoes.reduce((sum, m) => sum + (Number(m.quantidade) || 0), 0);
  const unidades = [...new Set(medicoes.map((m) => m.unidade).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 mt-0.5">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">{obra.titulo}</h1>
            <Badge className={cn("shrink-0 text-xs", statusColors[obra.status] || "bg-muted text-muted-foreground")}>
              {obra.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{obra.cliente_nome || "Sem cliente"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
          <Pencil className="h-4 w-4 mr-1" /> Editar
        </Button>
      </div>

      {/* Obra summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Progresso</p>
            <p className="text-lg font-bold text-foreground">{obra.progresso}%</p>
            <Progress value={obra.progresso} className="h-1.5 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Medições</p>
            <p className="text-lg font-bold text-foreground">{medicoes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Realizado</p>
            <p className="text-lg font-bold text-foreground">
              {totalQtd.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
              {unidades.length === 1 ? ` ${unidades[0]}` : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Período</p>
            <p className="text-sm font-medium text-foreground">
              {formatDate(obra.data_inicio)}
            </p>
            <p className="text-xs text-muted-foreground">→ {formatDate(obra.data_previsao_fim)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Obra details */}
      <Card>
        <CardContent className="p-4 space-y-2 text-sm">
          {obra.local_obra && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> <span>{obra.local_obra}</span>
            </div>
          )}
          {obra.responsavel && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>{obra.responsavel}{obra.equipe_campo ? ` | ${obra.equipe_campo}` : ""}</span>
            </div>
          )}
          {obra.tipo_servico && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5 shrink-0" /> <span>{obra.tipo_servico}</span>
            </div>
          )}
          {(obra.hotel || obra.alimentacao || obra.transporte) && (
            <div className="flex items-center gap-3 pt-1 border-t border-border mt-2">
              {obra.hotel && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Hotel className="h-3 w-3" /> Hotel</div>}
              {obra.alimentacao && <div className="flex items-center gap-1 text-xs text-muted-foreground"><UtensilsCrossed className="h-3 w-3" /> Alim.</div>}
              {obra.transporte && <div className="flex items-center gap-1 text-xs text-muted-foreground"><TruckIcon className="h-3 w-3" /> Transp.</div>}
            </div>
          )}
          {obra.data_entrega_relatorio && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border mt-2">
              <FileText className="h-3.5 w-3.5" /> Entrega relatório: {formatDate(obra.data_entrega_relatorio)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medições section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Medições / Diário de Campo</h2>
          <Button size="sm" onClick={() => { setEditingMedicao(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova Medição
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
          </div>
        ) : medicoes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Ruler className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Nenhuma medição registrada para esta obra</p>
              <Button variant="link" size="sm" onClick={() => { setEditingMedicao(null); setDialogOpen(true); }}>
                Registrar primeira medição
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {medicoes.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{m.titulo}</h3>
                        {m.tipo_servico && (
                          <Badge variant="secondary" className="text-[10px]">{m.tipo_servico}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" /> {formatDate(m.data_registro)}
                        </span>
                        {m.clima && (
                          <span className="flex items-center gap-1">
                            <CloudSun className="h-3.5 w-3.5" /> {climaIcons[m.clima] || ""} {m.clima}
                          </span>
                        )}
                        {m.quantidade > 0 && (
                          <span className="flex items-center gap-1">
                            <Ruler className="h-3.5 w-3.5" /> {m.quantidade} {m.unidade}
                          </span>
                        )}
                        {(m.hora_inicio || m.hora_fim) && (
                          <span>{m.hora_inicio || "?"} — {m.hora_fim || "?"}</span>
                        )}
                        {fotoCounts[m.id] > 0 && (
                          <span className="flex items-center gap-1">
                            <Camera className="h-3.5 w-3.5" /> {fotoCounts[m.id]} foto(s)
                          </span>
                        )}
                      </div>
                      {m.descricao_atividades && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{m.descricao_atividades}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingMedicao(m); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir medição?</AlertDialogTitle>
                            <AlertDialogDescription>Fotos associadas também serão removidas. Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMedicao(m.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <MedicaoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        medicao={editingMedicao}
        onSuccess={fetchMedicoes}
        defaultObraId={obra.id}
      />
    </div>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
