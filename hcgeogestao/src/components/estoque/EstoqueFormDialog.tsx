import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categorias = ["Sondagem à Percussão", "Sondagem Rotativa", "Instrumentação", "Poços de Monitoramento", "Poço Tubular Profundo", "Material", "Equipamentos", "Geofísica", "EPI", "Escritório", "Veículos", "Outro"];
const unidades = ["un", "m", "m²", "m³", "kg", "L", "cx", "pç", "rolo", "pacote"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any | null;
  onSaved: () => void;
}

export function EstoqueFormDialog({ open, onOpenChange, item, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", categoria: "Sondagem à Percussão", unidade: "un",
    quantidade: "0", quantidade_minima: "0", localizacao: "", observacoes: "",
  });

  useEffect(() => {
    if (item) {
      setForm({
        nome: item.nome || "",
        categoria: item.categoria || "Material",
        unidade: item.unidade || "un",
        quantidade: String(item.quantidade ?? 0),
        quantidade_minima: String(item.quantidade_minima ?? 0),
        localizacao: item.localizacao || "",
        observacoes: item.observacoes || "",
      });
    } else {
      setForm({ nome: "", categoria: "Sondagem à Percussão", unidade: "un", quantidade: "0", quantidade_minima: "0", localizacao: "", observacoes: "" });
    }
  }, [item, open]);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Usuário não autenticado"); setLoading(false); return; }

    const payload = {
      ...form,
      quantidade: Number(form.quantidade) || 0,
      quantidade_minima: Number(form.quantidade_minima) || 0,
      user_id: user.id,
    };

    const { error } = item
      ? await supabase.from("estoque").update(payload).eq("id", item.id)
      : await supabase.from("estoque").insert(payload);

    if (error) toast.error("Erro ao salvar item");
    else { toast.success(item ? "Item atualizado" : "Item cadastrado"); onSaved(); onOpenChange(false); }
    setLoading(false);
  };

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Editar Item" : "Novo Item de Estoque"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={form.unidade} onValueChange={(v) => set("unidade", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{unidades.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={(e) => set("quantidade", e.target.value)} /></div>
            <div><Label>Qtd. Mínima</Label><Input type="number" value={form.quantidade_minima} onChange={(e) => set("quantidade_minima", e.target.value)} /></div>
          </div>

          <div><Label>Localização</Label><Input value={form.localizacao} onChange={(e) => set("localizacao", e.target.value)} placeholder="Ex: Galpão A, Prateleira 3" /></div>
          <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} /></div>

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
