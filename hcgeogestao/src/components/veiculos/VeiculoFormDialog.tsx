import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VeiculoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo: any;
  onSaved: () => void;
}

const tipos = ["Caminhão", "Caminhonete", "Van", "Carro", "Moto", "Máquina", "Reboque", "Outro"];
const combustiveis = ["Diesel", "Gasolina", "Etanol", "Flex", "Elétrico", "GNV"];
const statusOptions = ["Disponível", "Em uso", "Manutenção", "Inativo"];

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  return String(value).split("T")[0] || "";
}

export function VeiculoFormDialog({ open, onOpenChange, veiculo, onSaved }: VeiculoFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    placa: "",
    modelo: "",
    marca: "",
    ano: "",
    cor: "",
    tipo: "Caminhão",
    combustivel: "Diesel",
    km_atual: 0,
    status: "Disponível",
    responsavel: "",
    data_ultima_revisao: "",
    data_proxima_revisao: "",
    seguro_vencimento: "",
    licenciamento_vencimento: "",
    observacoes: "",
  });

  useEffect(() => {
    if (veiculo) {
      setForm({
        placa: veiculo.placa || "",
        modelo: veiculo.modelo || "",
        marca: veiculo.marca || "",
        ano: veiculo.ano || "",
        cor: veiculo.cor || "",
        tipo: veiculo.tipo || "Caminhão",
        combustivel: veiculo.combustivel || "Diesel",
        km_atual: veiculo.km_atual || 0,
        status: veiculo.status || "Disponível",
        responsavel: veiculo.responsavel || "",
        data_ultima_revisao: toDateInputValue(veiculo.data_ultima_revisao),
        data_proxima_revisao: toDateInputValue(veiculo.data_proxima_revisao),
        seguro_vencimento: toDateInputValue(veiculo.seguro_vencimento),
        licenciamento_vencimento: toDateInputValue(veiculo.licenciamento_vencimento),
        observacoes: veiculo.observacoes || "",
      });
    } else {
      setForm({
        placa: "", modelo: "", marca: "", ano: "", cor: "",
        tipo: "Caminhão", combustivel: "Diesel", km_atual: 0,
        status: "Disponível", responsavel: "",
        data_ultima_revisao: "", data_proxima_revisao: "",
        seguro_vencimento: "", licenciamento_vencimento: "",
        observacoes: "",
      });
    }
  }, [veiculo, open]);

  const handleSave = async () => {
    if (!form.placa.trim() || !form.modelo.trim()) {
      toast.error("Placa e modelo são obrigatórios");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login"); setLoading(false); return; }

    const payload = {
      ...form,
      km_atual: Number(form.km_atual) || 0,
      data_ultima_revisao: form.data_ultima_revisao || null,
      data_proxima_revisao: form.data_proxima_revisao || null,
      seguro_vencimento: form.seguro_vencimento || null,
      licenciamento_vencimento: form.licenciamento_vencimento || null,
      user_id: user.id,
    };

    let error;
    if (veiculo?.id) {
      ({ error } = await supabase.from("veiculos" as any).update(payload as any).eq("id", veiculo.id));
    } else {
      ({ error } = await supabase.from("veiculos" as any).insert(payload as any));
    }

    if (error) toast.error("Erro ao salvar veículo");
    else { toast.success(veiculo ? "Veículo atualizado" : "Veículo cadastrado"); onOpenChange(false); onSaved(); }
    setLoading(false);
  };

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{veiculo ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Placa *</Label>
              <Input value={form.placa} onChange={(e) => set("placa", e.target.value.toUpperCase())} placeholder="ABC-1D23" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Marca</Label>
              <Input value={form.marca} onChange={(e) => set("marca", e.target.value)} placeholder="Ex: Toyota" />
            </div>
            <div>
              <Label>Modelo *</Label>
              <Input value={form.modelo} onChange={(e) => set("modelo", e.target.value)} placeholder="Ex: Hilux" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Ano</Label>
              <Input value={form.ano} onChange={(e) => set("ano", e.target.value)} placeholder="2024" />
            </div>
            <div>
              <Label>Cor</Label>
              <Input value={form.cor} onChange={(e) => set("cor", e.target.value)} placeholder="Branco" />
            </div>
            <div>
              <Label>Combustível</Label>
              <Select value={form.combustivel} onValueChange={(v) => set("combustivel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{combustiveis.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>KM Atual</Label>
              <Input type="number" value={form.km_atual} onChange={(e) => set("km_atual", e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Responsável</Label>
            <Input value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} placeholder="Motorista / operador" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Última Revisão</Label>
              <Input type="date" value={form.data_ultima_revisao} onChange={(e) => set("data_ultima_revisao", e.target.value)} />
            </div>
            <div>
              <Label>Próxima Revisão</Label>
              <Input type="date" value={form.data_proxima_revisao} onChange={(e) => set("data_proxima_revisao", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Venc. Seguro</Label>
              <Input type="date" value={form.seguro_vencimento} onChange={(e) => set("seguro_vencimento", e.target.value)} />
            </div>
            <div>
              <Label>Venc. Licenciamento</Label>
              <Input type="date" value={form.licenciamento_vencimento} onChange={(e) => set("licenciamento_vencimento", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
