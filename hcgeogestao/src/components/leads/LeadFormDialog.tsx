import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { upsertCliente } from "@/lib/clienteSync";
import { API_URL } from "@/lib/api";
import { apiJsonHeaders } from "@/lib/apiClient";

const STATUS_OPTIONS = [
  "Novo", "Qualificado", "Portfólio Enviado", "Reunião Agendada",
  "Proposta Enviada", "Negociação", "Fechado (Ganho)", "Fechado (Perdido)",
];

const PRIORIDADE_OPTIONS = ["Alta", "Média", "Baixa"];

const SERVICOS = [
  "Sondagem SPT", "Sondagem Rotativa", "Geofísica", "Hidrogeologia",
  "Instrumentação", "Poços", "Ensaios de Campo", "Outros",
];

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: any;
  onSaved: () => void;
}

export function LeadFormDialog({ open, onOpenChange, lead, onSaved }: LeadFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome_contato: "",
    empresa: "",
    telefone_whatsapp: "",
    email: "",
    cidade_uf: "",
    status: "Novo",
    tipo_servico_interesse: [] as string[],
    valor_estimado: 0,
    prioridade: "Média",
    proximo_contato_em: "",
    observacoes: "",
  });

  useEffect(() => {
    if (lead) {
      setForm({
        nome_contato: lead.nome_contato || "",
        empresa: lead.empresa || "",
        telefone_whatsapp: lead.telefone_whatsapp || "",
        email: lead.email || "",
        cidade_uf: lead.cidade_uf || "",
        status: lead.status || "Novo",
        tipo_servico_interesse: lead.tipo_servico_interesse || [],
        valor_estimado: lead.valor_estimado || 0,
        prioridade: lead.prioridade || "Média",
        proximo_contato_em: lead.proximo_contato_em || "",
        observacoes: lead.observacoes || "",
      });
    } else {
      setForm({
        nome_contato: "", empresa: "", telefone_whatsapp: "", email: "",
        cidade_uf: "", status: "Novo", tipo_servico_interesse: [],
        valor_estimado: 0, prioridade: "Média", proximo_contato_em: "", observacoes: "",
      });
    }
  }, [lead, open]);

  const toggleServico = (s: string) => {
    setForm((f) => ({
      ...f,
      tipo_servico_interesse: f.tipo_servico_interesse.includes(s)
        ? f.tipo_servico_interesse.filter((x) => x !== s)
        : [...f.tipo_servico_interesse, s],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome_contato.trim()) {
      toast.error("Nome do contato é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const userStr = localStorage.getItem("hcgeouser");
      const token = localStorage.getItem("hcgeotoken");
      if (!userStr || !token) throw new Error("Não autenticado");
      
      const user = JSON.parse(userStr);

      const payload = {
        ...form,
        valor_estimado: Number(form.valor_estimado) || 0,
        proximo_contato_em: form.proximo_contato_em || null,
      };

      const endpoint = lead ? `${API_URL}/api/leads/${lead.id}` : `${API_URL}/api/leads`;
      const method = lead ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: apiJsonHeaders(token),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Erro ao salvar lead na API");
      }

      toast.success(lead ? "Lead atualizado!" : "Lead criado!");

      // Desativado temporariamente o upsertCliente até refatorarmos a lib clienteSync para a API
      // const clienteId = await upsertCliente({...}, user.id)

      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar Lead" : "Novo Lead"}</DialogTitle>
          <DialogDescription className="hidden">Preencha e altere os detalhes do seu lead</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Nome do Contato *</Label>
              <Input value={form.nome_contato} onChange={(e) => setForm({ ...form, nome_contato: e.target.value })} />
            </div>
            <div>
              <Label>Empresa</Label>
              <Input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
            </div>
            <div>
              <Label>Telefone / WhatsApp</Label>
              <Input value={form.telefone_whatsapp} onChange={(e) => setForm({ ...form, telefone_whatsapp: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Cidade / UF</Label>
              <Input value={form.cidade_uf} placeholder="São Paulo/SP" onChange={(e) => setForm({ ...form, cidade_uf: e.target.value })} />
            </div>
            <div>
              <Label>Valor Estimado (R$)</Label>
              <Input type="number" value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADE_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Próximo Contato</Label>
              <Input type="date" value={form.proximo_contato_em} onChange={(e) => setForm({ ...form, proximo_contato_em: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Serviços de Interesse</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {SERVICOS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleServico(s)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    form.tipo_servico_interesse.includes(s)
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-muted text-muted-foreground border-border hover:border-accent/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : lead ? "Salvar" : "Criar Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
