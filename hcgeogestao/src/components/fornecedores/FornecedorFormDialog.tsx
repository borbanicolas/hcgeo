import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const tipos = ["Material", "Equipamento", "Serviço", "Escritório", "Logística", "Outro"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor: any | null;
  onSaved: () => void;
}

export function FornecedorFormDialog({ open, onOpenChange, fornecedor, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", tipo: "Material", cnpj_cpf: "", contato: "",
    telefone: "", email: "", endereco: "", cidade_uf: "",
    produtos_servicos: "", observacoes: "",
  });

  useEffect(() => {
    if (fornecedor) {
      setForm({
        nome: fornecedor.nome || "", tipo: fornecedor.tipo || "Material",
        cnpj_cpf: fornecedor.cnpj_cpf || "", contato: fornecedor.contato || "",
        telefone: fornecedor.telefone || "", email: fornecedor.email || "",
        endereco: fornecedor.endereco || "", cidade_uf: fornecedor.cidade_uf || "",
        produtos_servicos: fornecedor.produtos_servicos || "", observacoes: fornecedor.observacoes || "",
      });
    } else {
      setForm({ nome: "", tipo: "Material", cnpj_cpf: "", contato: "", telefone: "", email: "", endereco: "", cidade_uf: "", produtos_servicos: "", observacoes: "" });
    }
  }, [fornecedor, open]);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Usuário não autenticado"); setLoading(false); return; }

    const payload = { ...form, user_id: user.id };

    const { error } = fornecedor
      ? await supabase.from("fornecedores").update(payload).eq("id", fornecedor.id)
      : await supabase.from("fornecedores").insert(payload);

    if (error) toast.error("Erro ao salvar fornecedor");
    else { toast.success(fornecedor ? "Fornecedor atualizado" : "Fornecedor cadastrado"); onSaved(); onOpenChange(false); }
    setLoading(false);
  };

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>CNPJ/CPF</Label><Input value={form.cnpj_cpf} onChange={(e) => set("cnpj_cpf", e.target.value)} /></div>
            <div><Label>Contato</Label><Input value={form.contato} onChange={(e) => set("contato", e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} /></div>
            <div><Label>Cidade/UF</Label><Input value={form.cidade_uf} onChange={(e) => set("cidade_uf", e.target.value)} /></div>
          </div>

          <div><Label>Produtos/Serviços</Label><Textarea value={form.produtos_servicos} onChange={(e) => set("produtos_servicos", e.target.value)} rows={2} placeholder="Ex: Tubos de revestimento, Bentonita..." /></div>
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
