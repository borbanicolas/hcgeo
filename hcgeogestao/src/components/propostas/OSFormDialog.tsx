import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_OPTIONS = ["Aberta", "Em Execução", "Concluída", "Cancelada"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  os: any | null;
  onSaved: () => void;
}

export function OSFormDialog({ open, onOpenChange, os, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    cliente_nome: "", local_obra: "", tipo_servico: "", status: "Aberta",
    data_inicio: "", data_previsao_fim: "", data_conclusao: "",
    responsavel: "", equipe: "", descricao_servico: "", observacoes: "",
  });

  useEffect(() => {
    if (os) {
      setForm({
        cliente_nome: os.cliente_nome || "", local_obra: os.local_obra || "",
        tipo_servico: os.tipo_servico || "", status: os.status || "Aberta",
        data_inicio: os.data_inicio || "", data_previsao_fim: os.data_previsao_fim || "",
        data_conclusao: os.data_conclusao || "", responsavel: os.responsavel || "",
        equipe: os.equipe || "", descricao_servico: os.descricao_servico || "",
        observacoes: os.observacoes || "",
      });
    } else {
      setForm({ cliente_nome: "", local_obra: "", tipo_servico: "", status: "Aberta", data_inicio: "", data_previsao_fim: "", data_conclusao: "", responsavel: "", equipe: "", descricao_servico: "", observacoes: "" });
    }
  }, [os, open]);

  const handleSave = async () => {
    if (!os) return; // OS is only edited, not manually created
    setLoading(true);
    const payload = {
      ...form,
      data_inicio: form.data_inicio || null,
      data_previsao_fim: form.data_previsao_fim || null,
      data_conclusao: form.data_conclusao || null,
    };
    const { error } = await supabase.from("ordens_servico").update(payload).eq("id", os.id);
    if (error) toast.error("Erro ao salvar OS");
    else { toast.success("OS atualizada"); onSaved(); onOpenChange(false); }
    setLoading(false);
  };

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar OS {os?.numero}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Cliente</Label><Input value={form.cliente_nome} onChange={(e) => set("cliente_nome", e.target.value)} /></div>
            <div className="col-span-2"><Label>Local da Obra</Label><Input value={form.local_obra} onChange={(e) => set("local_obra", e.target.value)} /></div>
            <div><Label>Tipo de Serviço</Label><Input value={form.tipo_servico} onChange={(e) => set("tipo_servico", e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Responsável</Label><Input value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} /></div>
            <div><Label>Equipe</Label><Input value={form.equipe} onChange={(e) => set("equipe", e.target.value)} placeholder="Nomes separados por vírgula" /></div>
            <div><Label>Data Início</Label><Input type="date" value={form.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} /></div>
            <div><Label>Previsão Fim</Label><Input type="date" value={form.data_previsao_fim} onChange={(e) => set("data_previsao_fim", e.target.value)} /></div>
            <div className="col-span-2"><Label>Data Conclusão</Label><Input type="date" value={form.data_conclusao} onChange={(e) => set("data_conclusao", e.target.value)} /></div>
          </div>
          <div><Label>Descrição do Serviço</Label><Textarea value={form.descricao_servico} onChange={(e) => set("descricao_servico", e.target.value)} rows={3} /></div>
          <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
