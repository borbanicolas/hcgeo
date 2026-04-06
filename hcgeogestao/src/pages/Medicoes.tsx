import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MedicaoFormDialog } from "@/components/medicoes/MedicaoFormDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, CalendarDays, MapPin, CloudSun, Camera, Ruler,
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Medicoes() {
  const { toast } = useToast();
  const [medicoes, setMedicoes] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [fotoCounts, setFotoCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [obraFilter, setObraFilter] = useState("Todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMedicao, setEditingMedicao] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: medicoesData }, { data: obrasData }] = await Promise.all([
      supabase.from("medicoes").select("*").order("data_registro", { ascending: false }),
      supabase.from("obras").select("id, titulo"),
    ]);
    setMedicoes(medicoesData || []);
    setObras(obrasData || []);

    // Fetch photo counts
    if (medicoesData && medicoesData.length > 0) {
      const ids = medicoesData.map((m) => m.id);
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

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    // Delete photos from storage first
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
      fetchData();
    }
  };

  const obraMap = Object.fromEntries(obras.map((o) => [o.id, o.titulo]));

  const filtered = medicoes.filter((m) => {
    const matchSearch =
      m.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      m.descricao_atividades?.toLowerCase().includes(search.toLowerCase()) ||
      m.tipo_servico?.toLowerCase().includes(search.toLowerCase());
    const matchObra = obraFilter === "Todas" || m.obra_id === obraFilter;
    return matchSearch && matchObra;
  });

  const formatDate = (d?: string) => (d ? format(new Date(d + "T12:00:00"), "dd/MM/yyyy") : "—");

  const climaIcons: Record<string, string> = {
    Ensolarado: "☀️", Nublado: "☁️", Chuvoso: "🌧️", "Parcialmente nublado": "⛅", Tempestade: "⛈️",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medições / Diário de Campo</h1>
          <p className="text-sm text-muted-foreground">Registro diário de medições, fotos e atividades</p>
        </div>
        <Button onClick={() => { setEditingMedicao(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Medição
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar medição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={obraFilter} onValueChange={setObraFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrar por obra" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas as obras</SelectItem>
            {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.titulo}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma medição encontrada</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Main info */}
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
                      {m.obra_id && obraMap[m.obra_id] && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {obraMap[m.obra_id]}
                        </span>
                      )}
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

                  {/* Actions */}
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
                          <AlertDialogAction onClick={() => handleDelete(m.id)}>Excluir</AlertDialogAction>
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

      <MedicaoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        medicao={editingMedicao}
        onSuccess={fetchData}
      />
    </div>
  );
}
