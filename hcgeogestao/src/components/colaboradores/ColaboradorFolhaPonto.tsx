import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Clock, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isWeekend, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  colaborador: any;
}

function timeToMinutes(t?: string | null): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToHM(min: number): string {
  if (min <= 0) return "0h";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function calcHorasTrabalhadas(r: any): number {
  if (!r.entrada || !r.saida) return 0;
  const entrada = timeToMinutes(r.entrada);
  const saida = timeToMinutes(r.saida);
  let total = saida - entrada;
  if (r.saida_almoco && r.retorno_almoco) {
    const almoco = timeToMinutes(r.retorno_almoco) - timeToMinutes(r.saida_almoco);
    total -= almoco;
  }
  return Math.max(0, total);
}

export function ColaboradorFolhaPonto({ open, onOpenChange, colaborador }: Props) {
  const { toast } = useToast();
  const [registros, setRegistros] = useState<any[]>([]);
  const [mesRef, setMesRef] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    data: format(new Date(), "yyyy-MM-dd"),
    entrada: "07:00",
    saida_almoco: "12:00",
    retorno_almoco: "13:00",
    saida: "17:00",
    horas_extras: "",
    observacoes: "",
  });

  // Helper para evitar RangeError: Invalid time value
  const safeFormat = (dateStr: string, formatStr: string) => {
    try {
      if (!dateStr) return "Data ausente";
      // Remove fuso horário se vier do banco como ISO completa para evitar confusão com o T12:00:00
      const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
      const date = parseISO(cleanDate + "T12:00:00");
      if (isNaN(date.getTime())) {
        console.error(`[DEBUG FRONT] ❌ Data inválida detectada: "${dateStr}"`);
        return "Data inválida";
      }
      return format(date, formatStr, { locale: ptBR });
    } catch (e) {
      console.error(`[DEBUG FRONT] 🔥 Erro ao formatar data "${dateStr}":`, e);
      return "Erro na data";
    }
  };

  useEffect(() => {
    if (open && colaborador) fetchRegistros();
  }, [open, colaborador, mesRef]);

  const fetchRegistros = async () => {
    try {
      const inicio = format(startOfMonth(mesRef), "yyyy-MM-dd");
      const fim = format(endOfMonth(mesRef), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*")
        .eq("colaborador_id", colaborador.id)
        .gte("data", inicio)
        .lte("data", fim)
        .order("data");
      
      if (error) {
        console.error("Erro ao buscar registros:", error);
        toast({ title: "Erro ao buscar registros", variant: "destructive" });
        return;
      }
      setRegistros(data || []);
    } catch (err) {
      console.error("Falha ao buscar registros:", err);
    }
  };

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  const openNew = (dateStr?: string) => {
    setEditingId(null);
    setForm({
      data: dateStr || format(new Date(), "yyyy-MM-dd"),
      entrada: "07:00",
      saida_almoco: "12:00",
      retorno_almoco: "13:00",
      saida: "17:00",
      horas_extras: "",
      observacoes: "",
    });
    setFormOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      data: r.data,
      entrada: r.entrada || "",
      saida_almoco: r.saida_almoco || "",
      retorno_almoco: r.retorno_almoco || "",
      saida: r.saida || "",
      horas_extras: r.horas_extras || "",
      observacoes: r.observacoes || "",
    });
    setFormOpen(true);
  };

  const save = async () => {
    const uid = await getUserId();
    if (!uid) return;
    const payload = {
      ...form,
      entrada: form.entrada || null,
      saida_almoco: form.saida_almoco || null,
      retorno_almoco: form.retorno_almoco || null,
      saida: form.saida || null,
      horas_extras: form.horas_extras || null,
      user_id: uid,
      colaborador_id: colaborador.id,
    };

    console.log("[DEBUG FRONT] 💾 Salvando registro de ponto:", payload);

    let error;
    if (editingId) {
      ({ error } = await supabase.from("ponto_registros").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("ponto_registros").insert(payload));
    }
    if (error) toast({ title: "Erro ao salvar", variant: "destructive" });
    else { toast({ title: editingId ? "Registro atualizado" : "Registro salvo" }); setFormOpen(false); fetchRegistros(); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("ponto_registros").delete().eq("id", id);
    toast({ title: "Registro excluído" });
    fetchRegistros();
  };

  // Summary
  const totalMinutes = useMemo(() => registros.reduce((s, r) => s + calcHorasTrabalhadas(r), 0), [registros]);
  const diasTrabalhados = registros.filter(r => r.entrada && r.saida).length;

  // Calendar days
  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mesRef), end: endOfMonth(mesRef) });

  const getRegistroDia = (dia: Date) => {
    const dateStr = format(dia, "yyyy-MM-dd");
    return registros.find(r => r.data === dateStr);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Folha de Ponto — {colaborador?.nome}
          </DialogTitle>
        </DialogHeader>

        {/* Month nav + summary */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMesRef(subMonths(mesRef, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-sm min-w-[140px] text-center capitalize">
              {format(mesRef, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMesRef(addMonths(mesRef, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="text-muted-foreground">
              <span className="font-medium text-foreground">{diasTrabalhados}</span> dias trabalhados
            </div>
            <div className="text-muted-foreground">
              Total: <span className="font-medium text-foreground">{minutesToHM(totalMinutes)}</span>
            </div>
            <Button size="sm" onClick={() => openNew()}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 mt-4">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {/* Empty cells for start of month offset */}
          {Array.from({ length: startOfMonth(mesRef).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {diasDoMes.map(dia => {
            const reg = getRegistroDia(dia);
            const weekend = isWeekend(dia);
            const horas = reg ? calcHorasTrabalhadas(reg) : 0;
            return (
              <button
                key={dia.toISOString()}
                onClick={() => reg ? openEdit(reg) : openNew(format(dia, "yyyy-MM-dd"))}
                className={`relative rounded-md border p-1.5 text-left text-xs transition-colors hover:bg-accent/50
                  ${weekend ? "bg-muted/50 border-border/50" : "border-border"}
                  ${reg ? "bg-primary/5 border-primary/30" : ""}
                `}
              >
                <span className={`font-medium ${weekend ? "text-muted-foreground" : "text-foreground"}`}>
                  {format(dia, "d")}
                </span>
                {reg && (
                  <div className="mt-0.5">
                    <span className="text-[9px] text-primary font-medium">{minutesToHM(horas)}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail list */}
        <div className="space-y-1.5 mt-4">
          <h4 className="text-sm font-semibold text-foreground">Registros do mês</h4>
          {registros.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum registro neste mês</p>
          ) : (
            registros.map(r => {
              const horas = calcHorasTrabalhadas(r);
              return (
                <Card key={r.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => openEdit(r)}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="font-medium text-sm min-w-[80px]">
                        {safeFormat(r.data, "dd/MM (EEE)")}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {r.entrada && <Badge variant="outline" className="text-[10px]">E: {r.entrada?.slice(0,5)}</Badge>}
                        {r.saida_almoco && <span>→ {r.saida_almoco?.slice(0,5)}</span>}
                        {r.retorno_almoco && <span>→ {r.retorno_almoco?.slice(0,5)}</span>}
                        {r.saida && <Badge variant="outline" className="text-[10px]">S: {r.saida?.slice(0,5)}</Badge>}
                      </div>
                      <Badge className="bg-primary/10 text-primary text-[10px]">{minutesToHM(horas)}</Badge>
                      {r.horas_extras && <Badge variant="secondary" className="text-[10px]">HE: {r.horas_extras?.slice(0,5)}</Badge>}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={e => e.stopPropagation()}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(r.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Registro" : "Novo Registro de Ponto"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} />
            </div>
            <div>
              <Label>Entrada</Label>
              <Input type="time" value={form.entrada} onChange={e => setForm(p => ({ ...p, entrada: e.target.value }))} />
            </div>
            <div>
              <Label>Saída Almoço</Label>
              <Input type="time" value={form.saida_almoco} onChange={e => setForm(p => ({ ...p, saida_almoco: e.target.value }))} />
            </div>
            <div>
              <Label>Retorno Almoço</Label>
              <Input type="time" value={form.retorno_almoco} onChange={e => setForm(p => ({ ...p, retorno_almoco: e.target.value }))} />
            </div>
            <div>
              <Label>Saída</Label>
              <Input type="time" value={form.saida} onChange={e => setForm(p => ({ ...p, saida: e.target.value }))} />
            </div>
            <div>
              <Label>Horas Extras</Label>
              <Input type="time" value={form.horas_extras} onChange={e => setForm(p => ({ ...p, horas_extras: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Falta justificada, atestado, etc." />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
