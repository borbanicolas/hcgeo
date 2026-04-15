import { useState, useEffect, useLayoutEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tiposRelatorio = [
  "Relatório Técnico",
  "Relatório de Sondagem SPT",
  "Relatório Geofísico",
  "Relatório Hidrogeológico",
  "Relatório de Ensaio",
  "Laudo Técnico",
  "Parecer Técnico",
];

const statusOptions = [
  "Em Elaboração",
  "Em Revisão",
  "Aprovado",
  "Entregue",
  "Cancelado",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  relatorio?: any;
  onSuccess: () => void;
}

/** HTML date inputs only accept YYYY-MM-DD; DB often returns full ISO strings. */
function toDateInputValue(v: string | null | undefined): string {
  if (v == null || v === "") return "";
  const part = String(v).split("T")[0]?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part : "";
}

function relatorioToFormState(relatorio: any | null | undefined, emptyDates: string) {
  if (!relatorio) {
    return {
      titulo: "",
      tipo: "Relatório Técnico",
      status: "Em Elaboração",
      obra_id: "",
      data_emissao: emptyDates,
      data_entrega: "",
      responsavel: "",
      revisor: "",
      versao: "1.0",
      descricao: "",
      conclusoes: "",
      recomendacoes: "",
      observacoes: "",
    };
  }
  return {
    titulo: relatorio.titulo ?? "",
    tipo: relatorio.tipo || "Relatório Técnico",
    status: relatorio.status || "Em Elaboração",
    obra_id: relatorio.obra_id != null ? String(relatorio.obra_id) : "",
    data_emissao: toDateInputValue(relatorio.data_emissao) || emptyDates,
    data_entrega: toDateInputValue(relatorio.data_entrega),
    responsavel: relatorio.responsavel ?? "",
    revisor: relatorio.revisor ?? "",
    versao: relatorio.versao != null && relatorio.versao !== "" ? String(relatorio.versao) : "1.0",
    descricao: relatorio.descricao ?? "",
    conclusoes: relatorio.conclusoes ?? "",
    recomendacoes: relatorio.recomendacoes ?? "",
    observacoes: relatorio.observacoes ?? "",
  };
}

export function RelatorioFormDialog({ open, onOpenChange, relatorio, onSuccess }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [obras, setObras] = useState<any[]>([]);

  const [form, setForm] = useState({
    titulo: "",
    tipo: "Relatório Técnico",
    status: "Em Elaboração",
    obra_id: "",
    data_emissao: new Date().toISOString().split("T")[0],
    data_entrega: "",
    responsavel: "",
    revisor: "",
    versao: "1.0",
    descricao: "",
    conclusoes: "",
    recomendacoes: "",
    observacoes: "",
  });

  useEffect(() => {
    if (open) void fetchObras();
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().split("T")[0];
    setForm(relatorioToFormState(relatorio, today));
  }, [open, relatorio]);

  const fetchObras = async () => {
    const { data } = await supabase.from("obras").select("id, titulo, cliente_nome").order("titulo");
    setObras(data || []);
  };

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const payload: any = {
      ...form,
      user_id: user.id,
      obra_id: form.obra_id || null,
      data_entrega: form.data_entrega || null,
    };

    if (relatorio) {
      const { error } = await supabase.from("relatorios").update(payload).eq("id", relatorio.id);
      if (error) toast({ title: "Erro ao atualizar", variant: "destructive" });
      else { toast({ title: "Relatório atualizado" }); onSuccess(); onOpenChange(false); }
    } else {
      // Generate number
      const { data: numData } = await supabase.rpc("generate_relatorio_number", { p_user_id: user.id });
      payload.numero = numData || "";
      const { error } = await supabase.from("relatorios").insert(payload);
      if (error) toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      else { toast({ title: "Relatório criado" }); onSuccess(); onOpenChange(false); }
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{relatorio ? "Editar Relatório" : "Novo Relatório"}</DialogTitle>
          <DialogDescription className="sr-only">Preencha os dados técnicos do relatório.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="geral" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
            <TabsTrigger value="revisao">Revisão</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Título do relatório" />
              </div>

              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tiposRelatorio.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Obra Vinculada</Label>
                <Select value={form.obra_id} onValueChange={(v) => set("obra_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma obra" /></SelectTrigger>
                  <SelectContent>
                    {obras.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.titulo} — {o.cliente_nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data Emissão</Label>
                <Input type="date" value={form.data_emissao} onChange={(e) => set("data_emissao", e.target.value)} />
              </div>
              <div>
                <Label>Data Entrega</Label>
                <Input type="date" value={form.data_entrega} onChange={(e) => set("data_entrega", e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="conteudo" className="space-y-4 mt-4">
            <div>
              <Label>Descrição / Escopo</Label>
              <Textarea rows={4} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Descreva o escopo do relatório..." />
            </div>
            <div>
              <Label>Conclusões</Label>
              <Textarea rows={4} value={form.conclusoes} onChange={(e) => set("conclusoes", e.target.value)} placeholder="Conclusões técnicas..." />
            </div>
            <div>
              <Label>Recomendações</Label>
              <Textarea rows={4} value={form.recomendacoes} onChange={(e) => set("recomendacoes", e.target.value)} placeholder="Recomendações técnicas..." />
            </div>
          </TabsContent>

          <TabsContent value="revisao" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Responsável</Label>
                <Input value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} placeholder="Autor do relatório" />
              </div>
              <div>
                <Label>Revisor</Label>
                <Input value={form.revisor} onChange={(e) => set("revisor", e.target.value)} placeholder="Revisor técnico" />
              </div>
              <div>
                <Label>Versão</Label>
                <Input value={form.versao} onChange={(e) => set("versao", e.target.value)} placeholder="1.0" />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Observações gerais..." />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : relatorio ? "Atualizar" : "Criar Relatório"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
