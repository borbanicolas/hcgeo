import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RegistroUsoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId: string;
  registro: any;
  onSaved: () => void;
}

export function RegistroUsoFormDialog({ open, onOpenChange, veiculoId, registro, onSaved }: RegistroUsoFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    colaborador_nome: "",
    data: new Date().toISOString().split("T")[0],
    hora_ligado: "",
    hora_desligado: "",
    km_inicio: "",
    km_fim: "",
    local_servico: "",
    observacoes: "",
  });

  useEffect(() => {
    if (registro) {
      setForm({
        colaborador_nome: registro.colaborador_nome || "",
        data: registro.data || new Date().toISOString().split("T")[0],
        hora_ligado: registro.hora_ligado || "",
        hora_desligado: registro.hora_desligado || "",
        km_inicio: String(registro.km_inicio || ""),
        km_fim: String(registro.km_fim || ""),
        local_servico: registro.local_servico || "",
        observacoes: registro.observacoes || "",
      });
    } else {
      setForm({
        colaborador_nome: "", data: new Date().toISOString().split("T")[0],
        hora_ligado: "", hora_desligado: "", km_inicio: "", km_fim: "",
        local_servico: "", observacoes: "",
      });
    }
  }, [registro, open]);

  const handleSave = async () => {
    if (!form.colaborador_nome.trim() || !form.hora_ligado) {
      toast.error("Colaborador e hora ligado são obrigatórios");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login"); setLoading(false); return; }

    const payload = {
      veiculo_id: veiculoId,
      user_id: user.id,
      colaborador_nome: form.colaborador_nome,
      data: form.data,
      hora_ligado: form.hora_ligado,
      hora_desligado: form.hora_desligado || null,
      km_inicio: parseFloat(form.km_inicio) || 0,
      km_fim: parseFloat(form.km_fim) || 0,
      local_servico: form.local_servico,
      observacoes: form.observacoes,
    };

    let error;
    if (registro?.id) {
      ({ error } = await supabase.from("registros_uso_veiculo" as any).update(payload as any).eq("id", registro.id));
    } else {
      ({ error } = await supabase.from("registros_uso_veiculo" as any).insert(payload as any));
    }

    if (error) toast.error("Erro ao salvar registro");
    else { toast.success("Registro salvo"); onOpenChange(false); onSaved(); }
    setLoading(false);
  };

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Calc duration
  const calcDuration = () => {
    if (!form.hora_ligado || !form.hora_desligado) return null;
    const [h1, m1] = form.hora_ligado.split(":").map(Number);
    const [h2, m2] = form.hora_desligado.split(":").map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  };

  const duration = calcDuration();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{registro ? "Editar Registro de Uso" : "Novo Registro de Uso"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Colaborador *</Label>
            <Input value={form.colaborador_nome} onChange={(e) => set("colaborador_nome", e.target.value)} placeholder="Nome do operador/motorista" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
            </div>
            <div>
              <Label>Local de Serviço</Label>
              <Input value={form.local_servico} onChange={(e) => set("local_servico", e.target.value)} placeholder="Ex: Obra X" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Hora Ligado *</Label>
              <Input type="time" value={form.hora_ligado} onChange={(e) => set("hora_ligado", e.target.value)} />
            </div>
            <div>
              <Label>Hora Desligado</Label>
              <Input type="time" value={form.hora_desligado} onChange={(e) => set("hora_desligado", e.target.value)} />
            </div>
          </div>
          {duration && (
            <p className="text-sm text-muted-foreground">Duração: <span className="font-semibold text-foreground">{duration}</span></p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>KM Início</Label>
              <Input type="number" value={form.km_inicio} onChange={(e) => set("km_inicio", e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>KM Fim</Label>
              <Input type="number" value={form.km_fim} onChange={(e) => set("km_fim", e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
