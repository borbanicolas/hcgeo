import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  colaborador?: any;
  onSuccess: () => void;
}

const empty = {
  nome: "", cpf: "", rg: "", cargo: "", funcao: "",
  data_admissao: "", data_nascimento: "", telefone: "", email: "",
  endereco: "", cidade_uf: "", contato_emergencia: "", telefone_emergencia: "",
  observacoes: "", ativo: true,
};

export function ColaboradorFormDialog({ open, onOpenChange, colaborador, onSuccess }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) {
      setForm(colaborador ? {
        nome: colaborador.nome || "", cpf: colaborador.cpf || "", rg: colaborador.rg || "",
        cargo: colaborador.cargo || "", funcao: colaborador.funcao || "",
        data_admissao: (colaborador.data_admissao || "").split("T")[0], 
        data_nascimento: (colaborador.data_nascimento || "").split("T")[0],
        telefone: colaborador.telefone || "", email: colaborador.email || "",
        endereco: colaborador.endereco || "", cidade_uf: colaborador.cidade_uf || "",
        contato_emergencia: colaborador.contato_emergencia || "",
        telefone_emergencia: colaborador.telefone_emergencia || "",
        observacoes: colaborador.observacoes || "", ativo: colaborador.ativo ?? true,
      } : { ...empty });
    }
  }, [open, colaborador]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.nome.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const payload: any = {
      ...form, user_id: user.id,
      data_admissao: form.data_admissao || null,
      data_nascimento: form.data_nascimento || null,
    };

    const { error } = colaborador
      ? await supabase.from("colaboradores").update(payload).eq("id", colaborador.id)
      : await supabase.from("colaboradores").insert(payload);

    if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    else { toast({ title: colaborador ? "Colaborador atualizado" : "Colaborador criado" }); onSuccess(); onOpenChange(false); }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{colaborador ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="dados" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="profissional">Profissional</TabsTrigger>
            <TabsTrigger value="emergencia">Emergência</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome Completo *</Label>
                <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} />
              </div>
              <div><Label>CPF</Label><Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} /></div>
              <div><Label>RG</Label><Input value={form.rg} onChange={(e) => set("rg", e.target.value)} /></div>
              <div><Label>Data Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} /></div>
              <div><Label>E-mail</Label><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
              <div><Label>Cidade/UF</Label><Input value={form.cidade_uf} onChange={(e) => set("cidade_uf", e.target.value)} /></div>
              <div className="col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => set("endereco", e.target.value)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="profissional" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => set("cargo", e.target.value)} /></div>
              <div><Label>Função</Label><Input value={form.funcao} onChange={(e) => set("funcao", e.target.value)} /></div>
              <div><Label>Data Admissão</Label><Input type="date" value={form.data_admissao} onChange={(e) => set("data_admissao", e.target.value)} /></div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.ativo} onCheckedChange={(v) => set("ativo", v)} />
                <Label>Ativo</Label>
              </div>
            </div>
            <div><Label>Observações</Label><Textarea rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} /></div>
          </TabsContent>

          <TabsContent value="emergencia" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Contato de Emergência</Label><Input value={form.contato_emergencia} onChange={(e) => set("contato_emergencia", e.target.value)} /></div>
              <div><Label>Telefone Emergência</Label><Input value={form.telefone_emergencia} onChange={(e) => set("telefone_emergencia", e.target.value)} /></div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Salvando..." : colaborador ? "Atualizar" : "Criar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
