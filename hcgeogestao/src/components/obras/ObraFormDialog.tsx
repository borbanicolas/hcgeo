import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ObraFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obra?: any;
  onSuccess: () => void;
}

const statusOptions = ["Planejada", "Em Mobilização", "Em Andamento", "Pausada", "Concluída", "Cancelada"];
const tipoServicoOptions = ["Sondagem SPT", "Sondagem Rotativa", "Geofísica", "Poço Tubular", "Instrumentação", "Estudo Hidrogeológico", "Outro"];

function DatePickerField({ label, value, onChange }: { label: string; value?: Date; onChange: (d?: Date) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd/MM/yyyy") : "Selecionar"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ObraFormDialog({ open, onOpenChange, obra, onSuccess }: ObraFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    titulo: obra?.titulo || "",
    cliente_nome: obra?.cliente_nome || "",
    local_obra: obra?.local_obra || "",
    tipo_servico: obra?.tipo_servico || "",
    status: obra?.status || "Planejada",
    progresso: obra?.progresso || 0,
    responsavel: obra?.responsavel || "",
    equipe_campo: obra?.equipe_campo || "",
    hotel: obra?.hotel || "",
    alimentacao: obra?.alimentacao || "",
    transporte: obra?.transporte || "",
    observacoes_logistica: obra?.observacoes_logistica || "",
    observacoes: obra?.observacoes || "",
  });
  const [dataInicio, setDataInicio] = useState<Date | undefined>(obra?.data_inicio ? new Date(obra.data_inicio + "T12:00:00") : undefined);
  const [dataPrevisaoFim, setDataPrevisaoFim] = useState<Date | undefined>(obra?.data_previsao_fim ? new Date(obra.data_previsao_fim + "T12:00:00") : undefined);
  const [dataEntregaRelatorio, setDataEntregaRelatorio] = useState<Date | undefined>(obra?.data_entrega_relatorio ? new Date(obra.data_entrega_relatorio + "T12:00:00") : undefined);
  const [dataConclusao, setDataConclusao] = useState<Date | undefined>(obra?.data_conclusao ? new Date(obra.data_conclusao + "T12:00:00") : undefined);

  // Sync form with prop when it changes or dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        titulo: obra?.titulo || "",
        cliente_nome: obra?.cliente_nome || "",
        local_obra: obra?.local_obra || "",
        tipo_servico: obra?.tipo_servico || "",
        status: obra?.status || "Planejada",
        progresso: obra?.progresso || 0,
        responsavel: obra?.responsavel || "",
        equipe_campo: obra?.equipe_campo || "",
        hotel: obra?.hotel || "",
        alimentacao: obra?.alimentacao || "",
        transporte: obra?.transporte || "",
        observacoes_logistica: obra?.observacoes_logistica || "",
        observacoes: obra?.observacoes || "",
      });
      setDataInicio(obra?.data_inicio ? new Date(obra.data_inicio + "T12:00:00") : undefined);
      setDataPrevisaoFim(obra?.data_previsao_fim ? new Date(obra.data_previsao_fim + "T12:00:00") : undefined);
      setDataEntregaRelatorio(obra?.data_entrega_relatorio ? new Date(obra.data_entrega_relatorio + "T12:00:00") : undefined);
      setDataConclusao(obra?.data_conclusao ? new Date(obra.data_conclusao + "T12:00:00") : undefined);
    }
  }, [open, obra]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const payload = {
        ...form,
        user_id: user.id,
        data_inicio: dataInicio ? format(dataInicio, "yyyy-MM-dd") : null,
        data_previsao_fim: dataPrevisaoFim ? format(dataPrevisaoFim, "yyyy-MM-dd") : null,
        data_entrega_relatorio: dataEntregaRelatorio ? format(dataEntregaRelatorio, "yyyy-MM-dd") : null,
        data_conclusao: dataConclusao ? format(dataConclusao, "yyyy-MM-dd") : null,
      };

      if (obra?.id) {
        const { error } = await supabase.from("obras").update(payload).eq("id", obra.id);
        if (error) throw error;
        toast({ title: "Obra atualizada com sucesso" });
      } else {
        const { error } = await supabase.from("obras").insert(payload);
        if (error) throw error;
        toast({ title: "Obra criada com sucesso" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{obra ? "Editar Obra" : "Nova Obra"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="geral" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="cronograma">Cronograma</TabsTrigger>
            <TabsTrigger value="logistica">Logística</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={(e) => handleChange("titulo", e.target.value)} placeholder="Ex: Sondagem Lote 5 - Campinas" />
              </div>
              <div className="space-y-1.5">
                <Label>Cliente</Label>
                <Input value={form.cliente_nome} onChange={(e) => handleChange("cliente_nome", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Local da Obra</Label>
                <Input value={form.local_obra} onChange={(e) => handleChange("local_obra", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Serviço</Label>
                <Select value={form.tipo_servico} onValueChange={(v) => handleChange("tipo_servico", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {tipoServicoOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Progresso (%)</Label>
                <Input type="number" min={0} max={100} value={form.progresso} onChange={(e) => handleChange("progresso", Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => handleChange("observacoes", e.target.value)} rows={3} />
            </div>
          </TabsContent>

          <TabsContent value="cronograma" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DatePickerField label="Data de Início" value={dataInicio} onChange={setDataInicio} />
              <DatePickerField label="Previsão de Término" value={dataPrevisaoFim} onChange={setDataPrevisaoFim} />
              <DatePickerField label="Entrega do Relatório" value={dataEntregaRelatorio} onChange={setDataEntregaRelatorio} />
              <DatePickerField label="Data de Conclusão" value={dataConclusao} onChange={setDataConclusao} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Input value={form.responsavel} onChange={(e) => handleChange("responsavel", e.target.value)} placeholder="Nome do responsável" />
              </div>
              <div className="space-y-1.5">
                <Label>Equipe de Campo</Label>
                <Input value={form.equipe_campo} onChange={(e) => handleChange("equipe_campo", e.target.value)} placeholder="Nomes da equipe separados por vírgula" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logistica" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Hotel / Hospedagem</Label>
                <Input value={form.hotel} onChange={(e) => handleChange("hotel", e.target.value)} placeholder="Nome do hotel, endereço, reserva..." />
              </div>
              <div className="space-y-1.5">
                <Label>Alimentação</Label>
                <Input value={form.alimentacao} onChange={(e) => handleChange("alimentacao", e.target.value)} placeholder="Restaurante, valor diária..." />
              </div>
              <div className="space-y-1.5">
                <Label>Transporte</Label>
                <Input value={form.transporte} onChange={(e) => handleChange("transporte", e.target.value)} placeholder="Veículo, combustível, pedágio..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações de Logística</Label>
              <Textarea value={form.observacoes_logistica} onChange={(e) => handleChange("observacoes_logistica", e.target.value)} rows={3} placeholder="Informações adicionais sobre logística" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : obra ? "Salvar" : "Criar Obra"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
