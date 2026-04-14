import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus, Trash2, ShieldCheck, HardHat, Stethoscope, Syringe, FolderOpen,
  Upload, Download, FileText, Eye, AlertTriangle, Paperclip,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  colaborador: any;
}

const tiposASO = ["Admissional", "Periódico", "Retorno ao trabalho", "Mudança de função", "Demissional"];
const resultadosASO = ["Apto", "Inapto", "Apto com restrição"];
const normasNR = ["NR-01", "NR-06", "NR-10", "NR-11", "NR-12", "NR-18", "NR-33", "NR-34", "NR-35"];
const categoriasArquivo = [
  "Ficha de Registro", "Contrato de Trabalho", "CTPS", "RG / CNH",
  "CPF", "Comprovante de Endereço", "Ficha de EPI", "Certificado NR",
  "ASO", "Carteira de Vacinação", "Atestado Médico", "Outro",
];

function ValidadeBadge({ dataValidade }: { dataValidade?: string }) {
  if (!dataValidade) return <Badge variant="outline" className="text-[10px]">Sem validade</Badge>;
  const dias = differenceInDays(parseISO(dataValidade), new Date());
  if (dias < 0) return <Badge className="bg-destructive text-destructive-foreground text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Vencido ({Math.abs(dias)}d)</Badge>;
  if (dias <= 30) return <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Vence em {dias}d</Badge>;
  if (dias <= 60) return <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px]">Vence em {dias}d</Badge>;
  return <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px]">Válido ({dias}d)</Badge>;
}

// Helper component for inline file attachment on records
function InlineFileAttach({ record, table, onRefresh }: { record: any; table: string; onRefresh: () => void }) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/${record.colaborador_id}/${table}/${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from("colaborador-docs").upload(filePath, file);
    if (uploadError) { toast({ title: "Erro no upload", variant: "destructive" }); setUploading(false); return; }
    
    const publicUrl = uploadData?.url || supabase.storage.from("colaborador-docs").getPublicUrl(filePath).data.publicUrl;
    
    await (supabase.from(table as any) as any).update({ arquivo_url: publicUrl, arquivo_nome: file.name }).eq("id", record.id);
    toast({ title: "Arquivo anexado" });
    setUploading(false);
    onRefresh();
    if (inputRef.current) inputRef.current.value = "";
  };

  if (record.arquivo_url) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" title={record.arquivo_nome} onClick={() => window.open(record.arquivo_url, "_blank")}>
          <Paperclip className="h-3 w-3 text-primary" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
      <Button variant="ghost" size="icon" className="h-6 w-6" title="Anexar arquivo" disabled={uploading} onClick={() => inputRef.current?.click()}>
        <Upload className="h-3 w-3 text-muted-foreground" />
      </Button>
    </>
  );
}

export function ColaboradorDocumentos({ open, onOpenChange, colaborador }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [asos, setAsos] = useState<any[]>([]);
  const [nrs, setNrs] = useState<any[]>([]);
  const [epis, setEpis] = useState<any[]>([]);
  const [vacinas, setVacinas] = useState<any[]>([]);
  const [arquivos, setArquivos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  // ASO form
  const [asoDialog, setAsoDialog] = useState(false);
  const [asoForm, setAsoForm] = useState({ tipo: "Periódico", data_realizacao: new Date().toISOString().split("T")[0], data_validade: "", resultado: "Apto", medico: "", crm: "", observacoes: "" });

  // NR form
  const [nrDialog, setNrDialog] = useState(false);
  const [nrForm, setNrForm] = useState({ norma: "NR-35", descricao: "", data_realizacao: new Date().toISOString().split("T")[0], data_validade: "", carga_horaria: "", instituicao: "", observacoes: "" });

  // EPI form
  const [epiDialog, setEpiDialog] = useState(false);
  const [epiForm, setEpiForm] = useState({ equipamento: "", ca: "", data_entrega: new Date().toISOString().split("T")[0], data_validade: "", quantidade: "1", motivo: "Entrega inicial", observacoes: "" });

  // Vacina form
  const [vacinaDialog, setVacinaDialog] = useState(false);
  const [vacinaForm, setVacinaForm] = useState({ vacina: "", data_aplicacao: new Date().toISOString().split("T")[0], data_validade: "", dose: "", local_aplicacao: "", observacoes: "" });

  // Arquivo upload
  const [arquivoCategoria, setArquivoCategoria] = useState("Outro");

  useEffect(() => {
    if (open && colaborador) fetchAll();
  }, [open, colaborador]);

  const fetchAll = async () => {
    const id = colaborador.id;
    const [a, n, e, v, arq] = await Promise.all([
      supabase.from("colaborador_asos").select("*").eq("colaborador_id", id).order("data_realizacao", { ascending: false }),
      supabase.from("colaborador_nrs").select("*").eq("colaborador_id", id).order("data_realizacao", { ascending: false }),
      supabase.from("colaborador_epis").select("*").eq("colaborador_id", id).order("data_entrega", { ascending: false }),
      supabase.from("colaborador_vacinas" as any).select("*").eq("colaborador_id", id).order("data_aplicacao", { ascending: false }),
      supabase.from("colaborador_arquivos" as any).select("*").eq("colaborador_id", id).order("created_at", { ascending: false }),
    ]);
    setAsos(a.data || []);
    setNrs(n.data || []);
    setEpis(e.data || []);
    setVacinas((v.data as any[]) || []);
    setArquivos((arq.data as any[]) || []);
  };

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  const formatDate = (d?: string) => d ? format(parseISO(d), "dd/MM/yyyy") : "—";

  // ASO
  const saveASO = async () => {
    const uid = await getUserId(); if (!uid) return;
    const { error } = await supabase.from("colaborador_asos").insert({
      ...asoForm, user_id: uid, colaborador_id: colaborador.id,
      data_validade: asoForm.data_validade || null,
    });
    if (error) toast({ title: "Erro", variant: "destructive" });
    else { toast({ title: "ASO registrado" }); setAsoDialog(false); fetchAll(); }
  };
  const deleteASO = async (id: string) => { await supabase.from("colaborador_asos").delete().eq("id", id); fetchAll(); };

  // NR
  const saveNR = async () => {
    const uid = await getUserId(); if (!uid) return;
    const { error } = await supabase.from("colaborador_nrs").insert({
      ...nrForm, user_id: uid, colaborador_id: colaborador.id,
      data_validade: nrForm.data_validade || null,
    });
    if (error) toast({ title: "Erro", variant: "destructive" });
    else { toast({ title: "NR registrada" }); setNrDialog(false); fetchAll(); }
  };
  const deleteNR = async (id: string) => { await supabase.from("colaborador_nrs").delete().eq("id", id); fetchAll(); };

  // EPI
  const saveEPI = async () => {
    if (!epiForm.equipamento.trim()) { toast({ title: "Equipamento é obrigatório", variant: "destructive" }); return; }
    const uid = await getUserId(); if (!uid) return;
    const { error } = await supabase.from("colaborador_epis").insert({
      ...epiForm, quantidade: parseInt(epiForm.quantidade) || 1,
      user_id: uid, colaborador_id: colaborador.id,
      data_validade: epiForm.data_validade || null,
    });
    if (error) toast({ title: "Erro", variant: "destructive" });
    else { toast({ title: "EPI registrado" }); setEpiDialog(false); fetchAll(); }
  };
  const deleteEPI = async (id: string) => { await supabase.from("colaborador_epis").delete().eq("id", id); fetchAll(); };

  // Vacina
  const saveVacina = async () => {
    if (!vacinaForm.vacina.trim()) { toast({ title: "Nome da vacina é obrigatório", variant: "destructive" }); return; }
    const uid = await getUserId(); if (!uid) return;
    const { error } = await (supabase.from("colaborador_vacinas" as any) as any).insert({
      ...vacinaForm, user_id: uid, colaborador_id: colaborador.id,
      data_validade: vacinaForm.data_validade || null,
    });
    if (error) toast({ title: "Erro", variant: "destructive" });
    else { toast({ title: "Vacina registrada" }); setVacinaDialog(false); fetchAll(); }
  };
  const deleteVacina = async (id: string) => { await (supabase.from("colaborador_vacinas" as any) as any).delete().eq("id", id); fetchAll(); };

  // Arquivo upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uid = await getUserId();
    if (!uid) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${uid}/${colaborador.id}/${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from("colaborador-docs").upload(filePath, file);
    if (uploadError) { toast({ title: "Erro no upload", variant: "destructive" }); setUploading(false); return; }
    
    const publicUrl = uploadData?.url || supabase.storage.from("colaborador-docs").getPublicUrl(filePath).data.publicUrl;
    
    const { error } = await (supabase.from("colaborador_arquivos" as any) as any).insert({
      colaborador_id: colaborador.id, user_id: uid,
      categoria: arquivoCategoria, nome_arquivo: file.name, url: publicUrl,
    });
    if (error) toast({ title: "Erro ao salvar arquivo", variant: "destructive" });
    else { toast({ title: "Arquivo enviado" }); fetchAll(); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteArquivo = async (arq: any) => {
    const urlParts = arq.url.split("/colaborador-docs/");
    if (urlParts[1]) {
      await supabase.storage.from("colaborador-docs").remove([urlParts[1]]);
    }
    await (supabase.from("colaborador_arquivos" as any) as any).delete().eq("id", arq.id);
    fetchAll();
  };

  // Count expiring items
  const expiringCount = [...asos, ...nrs, ...epis, ...vacinas].filter((item) => {
    const dv = item.data_validade;
    if (!dv) return false;
    const dias = differenceInDays(parseISO(dv), new Date());
    return dias <= 30;
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Documentos — {colaborador?.nome}
            {expiringCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-1" />{expiringCount} vencendo
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="aso" className="mt-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="aso" className="gap-1 text-xs"><Stethoscope className="h-3.5 w-3.5" /> ASO</TabsTrigger>
            <TabsTrigger value="nr" className="gap-1 text-xs"><ShieldCheck className="h-3.5 w-3.5" /> NRs</TabsTrigger>
            <TabsTrigger value="epi" className="gap-1 text-xs"><HardHat className="h-3.5 w-3.5" /> EPIs</TabsTrigger>
            <TabsTrigger value="vacinas" className="gap-1 text-xs"><Syringe className="h-3.5 w-3.5" /> Vacinas</TabsTrigger>
            <TabsTrigger value="arquivos" className="gap-1 text-xs"><FolderOpen className="h-3.5 w-3.5" /> Arquivos</TabsTrigger>
          </TabsList>

          {/* ASO Tab */}
          <TabsContent value="aso" className="space-y-3 mt-4">
            <Button size="sm" onClick={() => { setAsoForm({ tipo: "Periódico", data_realizacao: new Date().toISOString().split("T")[0], data_validade: "", resultado: "Apto", medico: "", crm: "", observacoes: "" }); setAsoDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo ASO
            </Button>
            {asos.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nenhum ASO registrado</p> : (
              <div className="space-y-2">
                {asos.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{a.tipo}</span>
                          <Badge variant={a.resultado === "Apto" ? "default" : "destructive"} className="text-[10px]">{a.resultado}</Badge>
                          <ValidadeBadge dataValidade={a.data_validade} />
                          {a.arquivo_url && <Badge variant="outline" className="text-[10px] gap-0.5"><Paperclip className="h-2.5 w-2.5" />Anexo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Realizado: {formatDate(a.data_realizacao)} {a.data_validade ? `| Validade: ${formatDate(a.data_validade)}` : ""}
                          {a.medico ? ` | Dr. ${a.medico}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <InlineFileAttach record={a} table="colaborador_asos" onRefresh={fetchAll} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir ASO?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteASO(a.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* NR Tab */}
          <TabsContent value="nr" className="space-y-3 mt-4">
            <Button size="sm" onClick={() => { setNrForm({ norma: "NR-35", descricao: "", data_realizacao: new Date().toISOString().split("T")[0], data_validade: "", carga_horaria: "", instituicao: "", observacoes: "" }); setNrDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova NR
            </Button>
            {nrs.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nenhuma NR registrada</p> : (
              <div className="space-y-2">
                {nrs.map((n) => (
                  <Card key={n.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{n.norma}</span>
                          <ValidadeBadge dataValidade={n.data_validade} />
                          {n.arquivo_url && <Badge variant="outline" className="text-[10px] gap-0.5"><Paperclip className="h-2.5 w-2.5" />Anexo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(n.data_realizacao)} {n.data_validade ? `→ ${formatDate(n.data_validade)}` : ""}
                          {n.instituicao ? ` | ${n.instituicao}` : ""}
                          {n.carga_horaria ? ` | ${n.carga_horaria}h` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <InlineFileAttach record={n} table="colaborador_nrs" onRefresh={fetchAll} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir NR?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteNR(n.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* EPI Tab */}
          <TabsContent value="epi" className="space-y-3 mt-4">
            <Button size="sm" onClick={() => { setEpiForm({ equipamento: "", ca: "", data_entrega: new Date().toISOString().split("T")[0], data_validade: "", quantidade: "1", motivo: "Entrega inicial", observacoes: "" }); setEpiDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo EPI
            </Button>
            {epis.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nenhum EPI registrado</p> : (
              <div className="space-y-2">
                {epis.map((e) => (
                  <Card key={e.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{e.equipamento}</span>
                          {e.ca && <Badge variant="outline" className="text-[10px]">CA {e.ca}</Badge>}
                          <ValidadeBadge dataValidade={e.data_validade} />
                          {e.arquivo_url && <Badge variant="outline" className="text-[10px] gap-0.5"><Paperclip className="h-2.5 w-2.5" />Anexo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Entrega: {formatDate(e.data_entrega)} | Qtd: {e.quantidade} | {e.motivo}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <InlineFileAttach record={e} table="colaborador_epis" onRefresh={fetchAll} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir EPI?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteEPI(e.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Vacinas Tab */}
          <TabsContent value="vacinas" className="space-y-3 mt-4">
            <Button size="sm" onClick={() => { setVacinaForm({ vacina: "", data_aplicacao: new Date().toISOString().split("T")[0], data_validade: "", dose: "", local_aplicacao: "", observacoes: "" }); setVacinaDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova Vacina
            </Button>
            {vacinas.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nenhuma vacina registrada</p> : (
              <div className="space-y-2">
                {vacinas.map((v: any) => (
                  <Card key={v.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{v.vacina}</span>
                          {v.dose && <Badge variant="outline" className="text-[10px]">{v.dose}</Badge>}
                          <ValidadeBadge dataValidade={v.data_validade} />
                          {v.arquivo_url && <Badge variant="outline" className="text-[10px] gap-0.5"><Paperclip className="h-2.5 w-2.5" />Anexo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Aplicação: {formatDate(v.data_aplicacao)}
                          {v.data_validade ? ` | Validade: ${formatDate(v.data_validade)}` : ""}
                          {v.local_aplicacao ? ` | ${v.local_aplicacao}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <InlineFileAttach record={v} table="colaborador_vacinas" onRefresh={fetchAll} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir vacina?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteVacina(v.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Arquivos Tab */}
          <TabsContent value="arquivos" className="space-y-3 mt-4">
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={arquivoCategoria} onValueChange={setArquivoCategoria}>
                  <SelectTrigger className="w-48 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{categoriasArquivo.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
                <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-1" /> {uploading ? "Enviando..." : "Enviar Arquivo"}
                </Button>
              </div>
            </div>
            {arquivos.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nenhum arquivo anexado</p> : (
              <div className="space-y-2">
                {arquivos.map((arq: any) => (
                  <Card key={arq.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{arq.nome_arquivo}</span>
                            <Badge variant="outline" className="text-[10px]">{arq.categoria}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(arq.created_at?.split("T")[0])}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(arq.url, "_blank")}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <a href={arq.url} download={arq.nome_arquivo}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir arquivo?</AlertDialogTitle><AlertDialogDescription>O arquivo será removido permanentemente.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteArquivo(arq)}>Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* ASO Dialog */}
      <Dialog open={asoDialog} onOpenChange={setAsoDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo ASO</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={asoForm.tipo} onValueChange={(v) => setAsoForm((p) => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{tiposASO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Resultado</Label>
              <Select value={asoForm.resultado} onValueChange={(v) => setAsoForm((p) => ({ ...p, resultado: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{resultadosASO.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data Realização</Label><Input type="date" value={asoForm.data_realizacao} onChange={(e) => setAsoForm((p) => ({ ...p, data_realizacao: e.target.value }))} /></div>
            <div><Label>Data Validade</Label><Input type="date" value={asoForm.data_validade} onChange={(e) => setAsoForm((p) => ({ ...p, data_validade: e.target.value }))} /></div>
            <div><Label>Médico</Label><Input value={asoForm.medico} onChange={(e) => setAsoForm((p) => ({ ...p, medico: e.target.value }))} /></div>
            <div><Label>CRM</Label><Input value={asoForm.crm} onChange={(e) => setAsoForm((p) => ({ ...p, crm: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea rows={2} value={asoForm.observacoes} onChange={(e) => setAsoForm((p) => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setAsoDialog(false)}>Cancelar</Button>
            <Button onClick={saveASO}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NR Dialog */}
      <Dialog open={nrDialog} onOpenChange={setNrDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova NR</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Norma</Label>
              <Select value={nrForm.norma} onValueChange={(v) => setNrForm((p) => ({ ...p, norma: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{normasNR.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Carga Horária</Label><Input value={nrForm.carga_horaria} onChange={(e) => setNrForm((p) => ({ ...p, carga_horaria: e.target.value }))} placeholder="Ex: 8h" /></div>
            <div><Label>Data Realização</Label><Input type="date" value={nrForm.data_realizacao} onChange={(e) => setNrForm((p) => ({ ...p, data_realizacao: e.target.value }))} /></div>
            <div><Label>Data Validade</Label><Input type="date" value={nrForm.data_validade} onChange={(e) => setNrForm((p) => ({ ...p, data_validade: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Instituição</Label><Input value={nrForm.instituicao} onChange={(e) => setNrForm((p) => ({ ...p, instituicao: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Descrição</Label><Textarea rows={2} value={nrForm.descricao} onChange={(e) => setNrForm((p) => ({ ...p, descricao: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setNrDialog(false)}>Cancelar</Button>
            <Button onClick={saveNR}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EPI Dialog */}
      <Dialog open={epiDialog} onOpenChange={setEpiDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo EPI</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Equipamento *</Label><Input value={epiForm.equipamento} onChange={(e) => setEpiForm((p) => ({ ...p, equipamento: e.target.value }))} placeholder="Ex: Capacete" /></div>
            <div><Label>CA</Label><Input value={epiForm.ca} onChange={(e) => setEpiForm((p) => ({ ...p, ca: e.target.value }))} /></div>
            <div><Label>Data Entrega</Label><Input type="date" value={epiForm.data_entrega} onChange={(e) => setEpiForm((p) => ({ ...p, data_entrega: e.target.value }))} /></div>
            <div><Label>Data Validade</Label><Input type="date" value={epiForm.data_validade} onChange={(e) => setEpiForm((p) => ({ ...p, data_validade: e.target.value }))} /></div>
            <div><Label>Quantidade</Label><Input type="number" value={epiForm.quantidade} onChange={(e) => setEpiForm((p) => ({ ...p, quantidade: e.target.value }))} /></div>
            <div><Label>Motivo</Label><Input value={epiForm.motivo} onChange={(e) => setEpiForm((p) => ({ ...p, motivo: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea rows={2} value={epiForm.observacoes} onChange={(e) => setEpiForm((p) => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setEpiDialog(false)}>Cancelar</Button>
            <Button onClick={saveEPI}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vacina Dialog */}
      <Dialog open={vacinaDialog} onOpenChange={setVacinaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Vacina</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Vacina *</Label><Input value={vacinaForm.vacina} onChange={(e) => setVacinaForm((p) => ({ ...p, vacina: e.target.value }))} placeholder="Ex: Tétano, Hepatite B" /></div>
            <div><Label>Dose</Label><Input value={vacinaForm.dose} onChange={(e) => setVacinaForm((p) => ({ ...p, dose: e.target.value }))} placeholder="Ex: 1ª dose, Reforço" /></div>
            <div><Label>Data Aplicação</Label><Input type="date" value={vacinaForm.data_aplicacao} onChange={(e) => setVacinaForm((p) => ({ ...p, data_aplicacao: e.target.value }))} /></div>
            <div><Label>Data Validade</Label><Input type="date" value={vacinaForm.data_validade} onChange={(e) => setVacinaForm((p) => ({ ...p, data_validade: e.target.value }))} /></div>
            <div className="col-span-2"><Label>Local de Aplicação</Label><Input value={vacinaForm.local_aplicacao} onChange={(e) => setVacinaForm((p) => ({ ...p, local_aplicacao: e.target.value }))} placeholder="Ex: UBS Central" /></div>
            <div className="col-span-2"><Label>Observações</Label><Textarea rows={2} value={vacinaForm.observacoes} onChange={(e) => setVacinaForm((p) => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setVacinaDialog(false)}>Cancelar</Button>
            <Button onClick={saveVacina}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
