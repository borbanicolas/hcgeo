import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { API_URL } from "@/lib/api";

interface ClienteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente?: any;
  onSaved: () => void;
}

function autoClassify(cnpj_cpf: string, razao_social: string): string {
  const doc = cnpj_cpf.replace(/\D/g, "");
  if (doc.length === 11) return "Pessoa Física";
  if (doc.length === 14 || razao_social) return "Pessoa Jurídica";
  return "Pessoa Jurídica";
}

export function ClienteFormDialog({ open, onOpenChange, cliente, onSaved }: ClienteFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj_cpf: "",
    contato_principal: "",
    telefone: "",
    email: "",
    endereco: "",
    cidade_uf: "",
    observacoes: "",
    tipo_cliente: "Pessoa Jurídica",
  });

  useEffect(() => {
    if (cliente) {
      setForm({
        razao_social: cliente.razao_social || "",
        nome_fantasia: cliente.nome_fantasia || "",
        cnpj_cpf: cliente.cnpj_cpf || "",
        contato_principal: cliente.contato_principal || "",
        telefone: cliente.telefone || "",
        email: cliente.email || "",
        endereco: cliente.endereco || "",
        cidade_uf: cliente.cidade_uf || "",
        observacoes: cliente.observacoes || "",
        tipo_cliente: cliente.tipo_cliente || "Pessoa Jurídica",
      });
    } else {
      setForm({
        razao_social: "", nome_fantasia: "", cnpj_cpf: "", contato_principal: "",
        telefone: "", email: "", endereco: "", cidade_uf: "", observacoes: "",
        tipo_cliente: "Pessoa Jurídica",
      });
    }
  }, [cliente, open]);

  // Auto-classify when cnpj_cpf changes
  const handleCnpjChange = (val: string) => {
    const tipo = autoClassify(val, form.razao_social);
    setForm(f => ({ ...f, cnpj_cpf: val, tipo_cliente: tipo }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.razao_social.trim()) {
      toast.error("Razão social é obrigatória");
      return;
    }
    setLoading(true);
    try {
      const userStr = localStorage.getItem("hcgeouser");
      const token = localStorage.getItem("hcgeotoken");
      if (!userStr || !token) throw new Error("Não autenticado");

      const payload = { ...form };

      const endpoint = cliente ? `${API_URL}/api/clientes/${cliente.id}` : `${API_URL}/api/clientes`;
      const method = cliente ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro ao salvar cliente");
      }

      toast.success(cliente ? "Cliente atualizado!" : "Cliente cadastrado!");
      
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          <DialogDescription className="hidden">Detalhes do Cliente</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Razão Social / Nome *</Label>
              <Input value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
            </div>
            <div>
              <Label>Nome Fantasia</Label>
              <Input value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
            </div>
            <div>
              <Label>CNPJ / CPF</Label>
              <Input value={form.cnpj_cpf} onChange={(e) => handleCnpjChange(e.target.value)} />
            </div>
            <div>
              <Label>Tipo de Cliente</Label>
              <Select value={form.tipo_cliente} onValueChange={(v) => setForm({ ...form, tipo_cliente: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                  <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contato Principal</Label>
              <Input value={form.contato_principal} onChange={(e) => setForm({ ...form, contato_principal: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Cidade / UF</Label>
              <Input value={form.cidade_uf} onChange={(e) => setForm({ ...form, cidade_uf: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Endereço</Label>
              <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : cliente ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
