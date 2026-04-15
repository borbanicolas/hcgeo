import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saida: any | null;
  estoqueItems: any[];
  onSaved: () => void;
}

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  return String(value).split("T")[0] || "";
}

export function SaidaFormDialog({ open, onOpenChange, saida, estoqueItems, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    estoque_id: "", quantidade: "1", retirado_por: "",
    data_saida: new Date().toISOString().split("T")[0],
    data_devolucao: "", devolvido: false, destino: "", observacoes: "",
    tipo_saida: "Retornável",
  });

  useEffect(() => {
    if (saida) {
      setForm({
        estoque_id: saida.estoque_id || "",
        quantidade: String(saida.quantidade ?? 1),
        retirado_por: saida.retirado_por || "",
        data_saida: toDateInputValue(saida.data_saida) || new Date().toISOString().split("T")[0],
        data_devolucao: toDateInputValue(saida.data_devolucao),
        devolvido: saida.devolvido || false,
        destino: saida.destino || "",
        observacoes: saida.observacoes || "",
        tipo_saida: saida.tipo_saida || "Retornável",
      });
    } else {
      setForm({
        estoque_id: "", quantidade: "1", retirado_por: "",
        data_saida: new Date().toISOString().split("T")[0],
        data_devolucao: "", devolvido: false, destino: "", observacoes: "",
        tipo_saida: "Retornável",
      });
    }
  }, [saida, open]);

  const handleSave = async () => {
    if (!form.estoque_id) { toast.error("Selecione o item"); return; }
    if (!form.retirado_por.trim()) { toast.error("Informe quem retirou"); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Usuário não autenticado"); setLoading(false); return; }

    const isConsumo = form.tipo_saida === "Consumo";
    const payload = {
      estoque_id: form.estoque_id,
      quantidade: Number(form.quantidade) || 1,
      retirado_por: form.retirado_por,
      data_saida: form.data_saida,
      data_devolucao: isConsumo ? null : (form.data_devolucao || null),
      devolvido: isConsumo ? true : form.devolvido,
      destino: form.destino,
      observacoes: form.observacoes,
      tipo_saida: form.tipo_saida,
      user_id: user.id,
    };

    const { error } = saida
      ? await supabase.from("estoque_saidas" as any).update(payload as any).eq("id", saida.id)
      : await supabase.from("estoque_saidas" as any).insert(payload as any);

    if (error) toast.error("Erro ao salvar saída");
    else { toast.success(saida ? "Saída atualizada" : "Saída registrada"); onSaved(); onOpenChange(false); }
    setLoading(false);
  };

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{saida ? "Editar Saída" : "Registrar Saída de Material"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Item *</Label>
            <Select value={form.estoque_id} onValueChange={(v) => set("estoque_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o item" /></SelectTrigger>
              <SelectContent>
                {estoqueItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome} ({item.quantidade} {item.unidade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantidade *</Label><Input type="number" min="1" value={form.quantidade} onChange={(e) => set("quantidade", e.target.value)} /></div>
            <div><Label>Data da Saída *</Label><Input type="date" value={form.data_saida} onChange={(e) => set("data_saida", e.target.value)} /></div>
          </div>

          <div><Label>Retirado por *</Label><Input value={form.retirado_por} onChange={(e) => set("retirado_por", e.target.value)} placeholder="Nome de quem retirou" /></div>
          <div><Label>Destino / Obra</Label><Input value={form.destino} onChange={(e) => set("destino", e.target.value)} placeholder="Ex: Obra São Paulo, Escritório" /></div>

          <div>
            <Label>Tipo de Saída *</Label>
            <Select value={form.tipo_saida} onValueChange={(v) => set("tipo_saida", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Retornável">Retornável (precisa devolver)</SelectItem>
                <SelectItem value="Consumo">Consumo (uso definitivo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.tipo_saida === "Retornável" && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Devolução</Label><Input type="date" value={form.data_devolucao} onChange={(e) => set("data_devolucao", e.target.value)} /></div>
              <div className="flex items-end pb-2 gap-2">
                <Checkbox checked={form.devolvido} onCheckedChange={(v) => set("devolvido", !!v)} id="devolvido" />
                <Label htmlFor="devolvido" className="cursor-pointer">Devolvido</Label>
              </div>
            </div>
          )}

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
