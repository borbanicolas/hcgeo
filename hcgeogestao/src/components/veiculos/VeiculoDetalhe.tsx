import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Fuel, Clock, Pencil, Trash2, TrendingUp, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AbastecimentoFormDialog } from "./AbastecimentoFormDialog";
import { RegistroUsoFormDialog } from "./RegistroUsoFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface VeiculoDetalheProps {
  veiculo: any;
  onBack: () => void;
}

export function VeiculoDetalhe({ veiculo, onBack }: VeiculoDetalheProps) {
  const [tab, setTab] = useState("abastecimentos");

  const [abastecimentos, setAbastecimentos] = useState<any[]>([]);
  const [loadingAbast, setLoadingAbast] = useState(true);
  const [abastDialogOpen, setAbastDialogOpen] = useState(false);
  const [editingAbast, setEditingAbast] = useState<any>(null);
  const [deleteAbastId, setDeleteAbastId] = useState<string | null>(null);

  const [registros, setRegistros] = useState<any[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(true);
  const [registroDialogOpen, setRegistroDialogOpen] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState<any>(null);
  const [deleteRegistroId, setDeleteRegistroId] = useState<string | null>(null);

  const fetchAbastecimentos = useCallback(async () => {
    setLoadingAbast(true);
    const { data, error } = await supabase
      .from("abastecimentos" as any)
      .select("*")
      .eq("veiculo_id", veiculo.id)
      .order("data", { ascending: false });
    if (error) toast.error("Erro ao carregar abastecimentos");
    else setAbastecimentos((data as any[]) || []);
    setLoadingAbast(false);
  }, [veiculo.id]);

  const fetchRegistros = useCallback(async () => {
    setLoadingRegistros(true);
    const { data, error } = await supabase
      .from("registros_uso_veiculo" as any)
      .select("*")
      .eq("veiculo_id", veiculo.id)
      .order("data", { ascending: false });
    if (error) toast.error("Erro ao carregar registros");
    else setRegistros((data as any[]) || []);
    setLoadingRegistros(false);
  }, [veiculo.id]);

  useEffect(() => { fetchAbastecimentos(); fetchRegistros(); }, [fetchAbastecimentos, fetchRegistros]);

  const handleDeleteAbast = async () => {
    if (!deleteAbastId) return;
    const { error } = await supabase.from("abastecimentos" as any).delete().eq("id", deleteAbastId);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Abastecimento excluído"); fetchAbastecimentos(); }
    setDeleteAbastId(null);
  };

  const handleDeleteRegistro = async () => {
    if (!deleteRegistroId) return;
    const { error } = await supabase.from("registros_uso_veiculo" as any).delete().eq("id", deleteRegistroId);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Registro excluído"); fetchRegistros(); }
    setDeleteRegistroId(null);
  };

  // Consumo médio calculation
  const calcConsumoMedio = () => {
    if (abastecimentos.length < 2) return null;
    const sorted = [...abastecimentos].sort((a, b) => a.km_atual - b.km_atual);
    const kmTotal = sorted[sorted.length - 1].km_atual - sorted[0].km_atual;
    const litrosTotal = sorted.slice(1).reduce((acc: number, a: any) => acc + Number(a.litros), 0);
    if (litrosTotal <= 0 || kmTotal <= 0) return null;
    return (kmTotal / litrosTotal).toFixed(2);
  };

  const consumoMedio = calcConsumoMedio();

  // Total horas trabalhadas
  const calcTotalHoras = () => {
    let totalMins = 0;
    registros.forEach((r: any) => {
      if (r.hora_ligado && r.hora_desligado) {
        const [h1, m1] = r.hora_ligado.split(":").map(Number);
        const [h2, m2] = r.hora_desligado.split(":").map(Number);
        const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff > 0) totalMins += diff;
      }
    });
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return { h, m, totalMins };
  };

  const totalHoras = calcTotalHoras();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{veiculo.placa}</h1>
          <p className="text-sm text-muted-foreground">
            {veiculo.marca} {veiculo.modelo} {veiculo.ano && `· ${veiculo.ano}`}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card text-center">
          <Fuel className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">Abastecimentos</p>
          <p className="text-lg font-bold text-foreground">{abastecimentos.length}</p>
        </div>
        <div className="stat-card text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">Consumo Médio</p>
          <p className="text-lg font-bold text-foreground">{consumoMedio ? `${consumoMedio} km/L` : "—"}</p>
        </div>
        <div className="stat-card text-center">
          <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">Registros de Uso</p>
          <p className="text-lg font-bold text-foreground">{registros.length}</p>
        </div>
        <div className="stat-card text-center">
          <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">Total Horas</p>
          <p className="text-lg font-bold text-foreground">{totalHoras.h}h{totalHoras.m > 0 ? ` ${totalHoras.m}m` : ""}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="abastecimentos" className="gap-2">
            <Fuel className="h-4 w-4" />
            Abastecimentos
          </TabsTrigger>
          <TabsTrigger value="uso" className="gap-2">
            <Clock className="h-4 w-4" />
            Liga / Desliga
          </TabsTrigger>
        </TabsList>

        {/* Abastecimentos */}
        <TabsContent value="abastecimentos" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{abastecimentos.length} registro{abastecimentos.length !== 1 ? "s" : ""}</p>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => { setEditingAbast(null); setAbastDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Novo Abastecimento
            </Button>
          </div>

          {loadingAbast ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
            </div>
          ) : abastecimentos.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum abastecimento registrado</p>
              <Button variant="link" onClick={() => { setEditingAbast(null); setAbastDialogOpen(true); }}>Registrar primeiro</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {abastecimentos.map((a: any, i: number) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="stat-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">
                          {new Date(a.data + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                        <Badge variant="outline" className="text-xs">{a.combustivel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {Number(a.litros).toFixed(1)}L · R$ {Number(a.valor_total).toFixed(2)} · {Number(a.km_atual).toLocaleString("pt-BR")} km
                      </p>
                      {a.posto && <p className="text-xs text-muted-foreground mt-0.5">{a.posto}</p>}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setEditingAbast(a); setAbastDialogOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteAbastId(a.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Registros de Uso (Liga/Desliga) */}
        <TabsContent value="uso" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{registros.length} registro{registros.length !== 1 ? "s" : ""}</p>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => { setEditingRegistro(null); setRegistroDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              Novo Registro
            </Button>
          </div>

          {loadingRegistros ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
            </div>
          ) : registros.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhum registro de uso</p>
              <Button variant="link" onClick={() => { setEditingRegistro(null); setRegistroDialogOpen(true); }}>Registrar primeiro</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {registros.map((r: any, i: number) => {
                let duration = "";
                if (r.hora_ligado && r.hora_desligado) {
                  const [h1, m1] = r.hora_ligado.split(":").map(Number);
                  const [h2, m2] = r.hora_desligado.split(":").map(Number);
                  const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
                  if (diff > 0) {
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    duration = `${h}h${m > 0 ? `${m}min` : ""}`;
                  }
                }
                const kmPercorrido = r.km_fim && r.km_inicio ? Number(r.km_fim) - Number(r.km_inicio) : 0;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="stat-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">
                            {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}
                          </span>
                          <Badge variant="outline" className="text-xs">{r.colaborador_nome}</Badge>
                          {!r.hora_desligado && (
                            <Badge variant="destructive" className="text-xs animate-pulse">Em uso</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {r.hora_ligado?.substring(0, 5)} → {r.hora_desligado ? r.hora_desligado.substring(0, 5) : "—"}
                          </span>
                          {duration && <span className="font-medium text-foreground">{duration}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {kmPercorrido > 0 && <span>{kmPercorrido.toLocaleString("pt-BR")} km percorridos</span>}
                          {r.local_servico && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {r.local_servico}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setEditingRegistro(r); setRegistroDialogOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteRegistroId(r.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AbastecimentoFormDialog
        open={abastDialogOpen}
        onOpenChange={setAbastDialogOpen}
        veiculoId={veiculo.id}
        abastecimento={editingAbast}
        onSaved={fetchAbastecimentos}
      />
      <RegistroUsoFormDialog
        open={registroDialogOpen}
        onOpenChange={setRegistroDialogOpen}
        veiculoId={veiculo.id}
        registro={editingRegistro}
        onSaved={fetchRegistros}
      />

      <AlertDialog open={!!deleteAbastId} onOpenChange={(o) => !o && setDeleteAbastId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir abastecimento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAbast} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteRegistroId} onOpenChange={(o) => !o && setDeleteRegistroId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro de uso?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRegistro} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
