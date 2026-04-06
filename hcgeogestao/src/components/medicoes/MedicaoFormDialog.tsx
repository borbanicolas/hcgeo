import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Upload, X, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MedicaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicao?: any;
  onSuccess: () => void;
  defaultObraId?: string;
}

const climaOptions = ["Ensolarado", "Nublado", "Chuvoso", "Parcialmente nublado", "Tempestade"];
const unidadeOptions = ["m", "m²", "m³", "un", "h", "km"];
const tipoServicoOptions = ["Sondagem SPT", "Sondagem Rotativa", "Geofísica", "Poço Tubular", "Instrumentação", "Topografia", "Outro"];

export function MedicaoFormDialog({ open, onOpenChange, medicao, onSuccess, defaultObraId }: MedicaoFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [obras, setObras] = useState<any[]>([]);
  const [fotos, setFotos] = useState<any[]>([]);
  const [newFotos, setNewFotos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    obra_id: medicao?.obra_id || defaultObraId || "",
    titulo: medicao?.titulo || "",
    tipo_servico: medicao?.tipo_servico || "",
    quantidade: medicao?.quantidade || 0,
    unidade: medicao?.unidade || "m",
    profundidade_de: medicao?.profundidade_de || 0,
    profundidade_ate: medicao?.profundidade_ate || 0,
    clima: medicao?.clima || "",
    hora_inicio: medicao?.hora_inicio || "",
    hora_fim: medicao?.hora_fim || "",
    descricao_atividades: medicao?.descricao_atividades || "",
    ocorrencias: medicao?.ocorrencias || "",
    coordenadas_gps: medicao?.coordenadas_gps || "",
    observacoes: medicao?.observacoes || "",
  });
  const [dataRegistro, setDataRegistro] = useState<Date | undefined>(
    medicao?.data_registro ? new Date(medicao.data_registro + "T12:00:00") : new Date()
  );

  useEffect(() => {
    const fetchObras = async () => {
      const { data } = await supabase.from("obras").select("id, titulo").order("titulo");
      setObras(data || []);
    };
    fetchObras();

    if (medicao?.id) {
      const fetchFotos = async () => {
        const { data } = await supabase.from("medicao_fotos").select("*").eq("medicao_id", medicao.id);
        setFotos(data || []);
      };
      fetchFotos();
    }
  }, [medicao]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewFotos((prev) => [...prev, ...files]);
  };

  const removeNewFoto = (index: number) => {
    setNewFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingFoto = async (foto: any) => {
    // Extract path from URL for storage deletion
    const path = foto.url.split("/medicao-fotos/")[1];
    if (path) {
      await supabase.storage.from("medicao-fotos").remove([path]);
    }
    await supabase.from("medicao_fotos").delete().eq("id", foto.id);
    setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    toast({ title: "Foto removida" });
  };

  const uploadFotos = async (medicaoId: string, userId: string) => {
    for (const file of newFotos) {
      const ext = file.name.split(".").pop();
      const filePath = `${userId}/${medicaoId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("medicao-fotos").upload(filePath, file);
      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage.from("medicao-fotos").getPublicUrl(filePath);

      await supabase.from("medicao_fotos").insert({
        medicao_id: medicaoId,
        user_id: userId,
        url: urlData.publicUrl,
        nome_arquivo: file.name,
      });
    }
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
        obra_id: form.obra_id || null,
        data_registro: dataRegistro ? format(dataRegistro, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        hora_inicio: form.hora_inicio || null,
        hora_fim: form.hora_fim || null,
      };

      let medicaoId = medicao?.id;

      if (medicao?.id) {
        const { error } = await supabase.from("medicoes").update(payload).eq("id", medicao.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("medicoes").insert(payload).select("id").single();
        if (error) throw error;
        medicaoId = data.id;
      }

      if (newFotos.length > 0 && medicaoId) {
        await uploadFotos(medicaoId, user.id);
      }

      toast({ title: medicao ? "Medição atualizada" : "Medição registrada" });
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
          <DialogTitle>{medicao ? "Editar Medição" : "Nova Medição / Diário"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="registro" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="registro">Registro</TabsTrigger>
            <TabsTrigger value="diario">Diário de Campo</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
          </TabsList>

          <TabsContent value="registro" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={(e) => handleChange("titulo", e.target.value)} placeholder="Ex: Furo SP-01" />
              </div>
              <div className="space-y-1.5">
                <Label>Obra</Label>
                <Select value={form.obra_id} onValueChange={(v) => handleChange("obra_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar obra" /></SelectTrigger>
                  <SelectContent>
                    {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.titulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data do Registro</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataRegistro && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataRegistro ? format(dataRegistro, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataRegistro} onSelect={setDataRegistro} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
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
                <Label>Quantidade</Label>
                <Input type="number" value={form.quantidade} onChange={(e) => handleChange("quantidade", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={form.unidade} onValueChange={(v) => handleChange("unidade", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {unidadeOptions.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Profundidade de (m)</Label>
                <Input type="number" step="0.1" value={form.profundidade_de} onChange={(e) => handleChange("profundidade_de", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Profundidade até (m)</Label>
                <Input type="number" step="0.1" value={form.profundidade_ate} onChange={(e) => handleChange("profundidade_ate", Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Coordenadas GPS</Label>
              <Input value={form.coordenadas_gps} onChange={(e) => handleChange("coordenadas_gps", e.target.value)} placeholder="Ex: -23.5505, -46.6333" />
            </div>
          </TabsContent>

          <TabsContent value="diario" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Clima</Label>
                <Select value={form.clima} onValueChange={(v) => handleChange("clima", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {climaOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Hora Início</Label>
                <Input type="time" value={form.hora_inicio} onChange={(e) => handleChange("hora_inicio", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hora Fim</Label>
                <Input type="time" value={form.hora_fim} onChange={(e) => handleChange("hora_fim", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição das Atividades</Label>
              <Textarea value={form.descricao_atividades} onChange={(e) => handleChange("descricao_atividades", e.target.value)} rows={4} placeholder="Descreva as atividades realizadas no dia..." />
            </div>
            <div className="space-y-1.5">
              <Label>Ocorrências</Label>
              <Textarea value={form.ocorrencias} onChange={(e) => handleChange("ocorrencias", e.target.value)} rows={3} placeholder="Paradas, problemas, desvios..." />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => handleChange("observacoes", e.target.value)} rows={2} />
            </div>
          </TabsContent>

          <TabsContent value="fotos" className="space-y-4 mt-4">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full border-dashed h-20">
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Clique para adicionar fotos</span>
              </div>
            </Button>

            {/* Existing photos */}
            {fotos.length > 0 && (
              <div>
                <Label className="mb-2 block">Fotos salvas</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {fotos.map((foto) => (
                    <div key={foto.id} className="relative group rounded-lg overflow-hidden border border-border aspect-square">
                      <img src={foto.url} alt={foto.nome_arquivo} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeExistingFoto(foto)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New photos preview */}
            {newFotos.length > 0 && (
              <div>
                <Label className="mb-2 block">Novas fotos ({newFotos.length})</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {newFotos.map((file, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-border aspect-square bg-muted">
                      <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeNewFoto(idx)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fotos.length === 0 && newFotos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm">Nenhuma foto adicionada</span>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : medicao ? "Salvar" : "Registrar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
