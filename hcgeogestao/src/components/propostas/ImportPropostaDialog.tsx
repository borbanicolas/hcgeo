import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TIPO_SERVICO = ["Sondagem SPT", "Sondagem Rotativa", "Geofísica", "Hidrogeologia", "Instrumentação", "Poços", "Ensaios de Campo", "Misto"];
const STATUS_OPTIONS = ["Rascunho", "Enviada", "Em Análise", "Aprovada", "Reprovada", "Cancelada"];

interface ImportItem {
  numero: string;
  titulo: string;
  contratante_nome: string;
  tipo_servico: string;
  status: string;
  valor_total: string;
  data_emissao: string;
  local_obra: string;
  observacoes: string;
}

const emptyItem = (): ImportItem => ({
  numero: "", titulo: "", contratante_nome: "", tipo_servico: "Sondagem SPT",
  status: "Aprovada", valor_total: "0", data_emissao: new Date().toISOString().split("T")[0],
  local_obra: "", observacoes: "Importado de sistema anterior",
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ImportPropostaDialog({ open, onOpenChange, onSaved }: Props) {
  const [items, setItems] = useState<ImportItem[]>([emptyItem()]);
  const [loading, setLoading] = useState(false);

  const addRow = () => setItems([...items, emptyItem()]);
  const removeRow = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const update = (idx: number, key: keyof ImportItem, val: string) =>
    setItems(items.map((item, i) => i === idx ? { ...item, [key]: val } : item));

  const handleImport = async () => {
    const valid = items.filter(i => i.numero.trim() && i.titulo.trim());
    if (valid.length === 0) { toast.error("Preencha ao menos uma proposta com número e título"); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const payload = valid.map(item => ({
        user_id: user.id,
        numero: item.numero.trim(),
        titulo: item.titulo.trim(),
        contratante_nome: item.contratante_nome,
        tipo_servico: item.tipo_servico,
        status: item.status,
        valor_total: parseFloat(item.valor_total.replace(",", ".")) || 0,
        data_emissao: item.data_emissao,
        local_obra: item.local_obra,
        observacoes: item.observacoes,
      }));

      const { error } = await supabase.from("propostas").insert(payload);
      if (error) throw error;

      toast.success(`${valid.length} proposta(s) importada(s) com sucesso!`);
      setItems([emptyItem()]);
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Propostas (Histórico)</DialogTitle>
          <p className="text-sm text-muted-foreground">Importe propostas emitidas em outro sistema para manter a continuidade da numeração sequencial.</p>
        </DialogHeader>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="border rounded-lg p-4 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Proposta #{idx + 1}</span>
                {items.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Nº da Proposta *</Label>
                  <Input value={item.numero} onChange={(e) => update(idx, "numero", e.target.value)}
                    placeholder="Ex: HC_PTC_Nº15_2025_03" className="text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Título *</Label>
                  <Input value={item.titulo} onChange={(e) => update(idx, "titulo", e.target.value)}
                    placeholder="Ex: Sondagem SPT - Condomínio X" className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Contratante</Label>
                  <Input value={item.contratante_nome} onChange={(e) => update(idx, "contratante_nome", e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Tipo de Serviço</Label>
                  <Select value={item.tipo_servico} onValueChange={(v) => update(idx, "tipo_servico", v)}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPO_SERVICO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={item.status} onValueChange={(v) => update(idx, "status", v)}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Valor Total (R$)</Label>
                  <Input value={item.valor_total} onChange={(e) => update(idx, "valor_total", e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Data Emissão</Label>
                  <Input type="date" value={item.data_emissao} onChange={(e) => update(idx, "data_emissao", e.target.value)} className="text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Local da Obra</Label>
                  <Input value={item.local_obra} onChange={(e) => update(idx, "local_obra", e.target.value)} className="text-sm" />
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
            <Plus className="h-3.5 w-3.5" /> Adicionar outra proposta
          </Button>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {loading ? "Importando..." : `Importar ${items.filter(i => i.numero.trim() && i.titulo.trim()).length} proposta(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
