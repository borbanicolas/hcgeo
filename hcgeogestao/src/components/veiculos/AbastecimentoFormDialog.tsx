import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AbastecimentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculoId: string;
  abastecimento: any;
  onSaved: () => void;
}

export function AbastecimentoFormDialog({ open, onOpenChange, veiculoId, abastecimento, onSaved }: AbastecimentoFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    data: new Date().toISOString().split("T")[0],
    litros: "",
    valor_total: "",
    valor_litro: "",
    km_atual: "",
    combustivel: "Diesel",
    posto: "",
    observacoes: "",
  });

  useEffect(() => {
    if (abastecimento) {
      setForm({
        data: abastecimento.data || new Date().toISOString().split("T")[0],
        litros: String(abastecimento.litros || ""),
        valor_total: String(abastecimento.valor_total || ""),
        valor_litro: String(abastecimento.valor_litro || ""),
        km_atual: String(abastecimento.km_atual || ""),
        combustivel: abastecimento.combustivel || "Diesel",
        posto: abastecimento.posto || "",
        observacoes: abastecimento.observacoes || "",
      });
    } else {
      setForm({
        data: new Date().toISOString().split("T")[0],
        litros: "", valor_total: "", valor_litro: "", km_atual: "",
        combustivel: "Diesel", posto: "", observacoes: "",
      });
    }
  }, [abastecimento, open]);

  // Auto-calc valor_litro
  useEffect(() => {
    const litros = parseFloat(form.litros);
    const total = parseFloat(form.valor_total);
    if (litros > 0 && total > 0) {
      setForm((p) => ({ ...p, valor_litro: (total / litros).toFixed(3) }));
    }
  }, [form.litros, form.valor_total]);

  const handleSave = async () => {
    if (!form.litros || !form.km_atual) {
      toast.error("Litros e KM atual são obrigatórios");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login"); setLoading(false); return; }

    const payload = {
      veiculo_id: veiculoId,
      user_id: user.id,
      data: form.data,
      litros: parseFloat(form.litros) || 0,
      valor_total: parseFloat(form.valor_total) || 0,
      valor_litro: parseFloat(form.valor_litro) || 0,
      km_atual: parseFloat(form.km_atual) || 0,
      combustivel: form.combustivel,
      posto: form.posto,
      observacoes: form.observacoes,
    };

    let error;
    if (abastecimento?.id) {
      ({ error } = await supabase.from("abastecimentos" as any).update(payload as any).eq("id", abastecimento.id));
    } else {
      ({ error } = await supabase.from("abastecimentos" as any).insert(payload as any));
    }

    if (error) toast.error("Erro ao salvar abastecimento");
    else { toast.success("Abastecimento salvo"); onOpenChange(false); onSaved(); }
    setLoading(false);
  };

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{abastecimento ? "Editar Abastecimento" : "Novo Abastecimento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
            </div>
            <div>
              <Label>KM Atual *</Label>
              <Input type="number" value={form.km_atual} onChange={(e) => set("km_atual", e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Litros *</Label>
              <Input type="number" step="0.01" value={form.litros} onChange={(e) => set("litros", e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Valor Total</Label>
              <Input type="number" step="0.01" value={form.valor_total} onChange={(e) => set("valor_total", e.target.value)} placeholder="R$" />
            </div>
            <div>
              <Label>R$/Litro</Label>
              <Input type="number" step="0.001" value={form.valor_litro} readOnly className="bg-muted" />
            </div>
          </div>
          <div>
            <Label>Posto</Label>
            <Input value={form.posto} onChange={(e) => set("posto", e.target.value)} placeholder="Nome do posto" />
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
