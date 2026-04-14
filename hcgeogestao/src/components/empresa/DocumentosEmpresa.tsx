import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Pencil, Trash2, FileText, Upload, Download, ExternalLink,
  AlertTriangle, ShieldCheck, Calendar,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

const CATEGORIAS = [
  "Contrato Social",
  "Certidão Negativa Federal",
  "Certidão Negativa Estadual",
  "Certidão Negativa Municipal",
  "Certidão FGTS",
  "Certidão Trabalhista (CNDT)",
  "Alvará de Funcionamento",
  "Licença Ambiental",
  "CREA / ART",
  "Seguro de Responsabilidade Civil",
  "Balanço Patrimonial",
  "Atestado de Capacidade Técnica",
  "Registro CNPJ",
  "Inscrição Estadual",
  "Inscrição Municipal",
  "Outro",
];

interface DocEmpresa {
  id: string;
  user_id: string;
  nome_documento: string;
  categoria: string;
  data_emissao: string | null;
  data_validade: string | null;
  observacoes: string;
  arquivo_url: string;
  arquivo_nome: string;
  created_at: string;
}

export function DocumentosEmpresa() {
  const { toast } = useToast();
  const [docs, setDocs] = useState<DocEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("Todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DocEmpresa | null>(null);
  const [uploading, setUploading] = useState(false);

  // form state
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Outro");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataValidade, setDataValidade] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("documentos_empresa")
      .select("*")
      .order("categoria")
      .order("nome_documento");
    setDocs((data as DocEmpresa[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const resetForm = () => {
    setNome(""); setCategoria("Outro"); setDataEmissao(""); setDataValidade("");
    setObservacoes(""); setArquivo(null); setEditing(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (doc: DocEmpresa) => {
    setEditing(doc);
    setNome(doc.nome_documento);
    setCategoria(doc.categoria);
    setDataEmissao(doc.data_emissao || "");
    setDataValidade(doc.data_validade || "");
    setObservacoes(doc.observacoes || "");
    setArquivo(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ title: "Informe o nome do documento", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let arquivoUrl = editing?.arquivo_url || "";
    let arquivoNome = editing?.arquivo_nome || "";

    if (arquivo) {
      setUploading(true);
      const ext = arquivo.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { data: uploadData, error: upErr } = await supabase.storage.from("empresa-docs").upload(path, arquivo);
      if (upErr) {
        toast({ title: "Erro no upload", description: upErr.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      
      const publicUrl = uploadData?.url || supabase.storage.from("empresa-docs").getPublicUrl(path).data.publicUrl;
      arquivoUrl = publicUrl;
      arquivoNome = arquivo.name;
      setUploading(false);
    }

    const payload = {
      nome_documento: nome.trim(),
      categoria,
      data_emissao: dataEmissao || null,
      data_validade: dataValidade || null,
      observacoes: observacoes.trim(),
      arquivo_url: arquivoUrl,
      arquivo_nome: arquivoNome,
      user_id: user.id,
    };

    if (editing) {
      const { error } = await supabase.from("documentos_empresa").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Erro ao atualizar", variant: "destructive" });
      else toast({ title: "Documento atualizado" });
    } else {
      const { error } = await supabase.from("documentos_empresa").insert(payload);
      if (error) toast({ title: "Erro ao cadastrar", variant: "destructive" });
      else toast({ title: "Documento cadastrado" });
    }
    setDialogOpen(false);
    resetForm();
    fetchDocs();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("documentos_empresa").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
    else { toast({ title: "Documento excluído" }); fetchDocs(); }
  };

  const filtered = docs.filter((d) => {
    const matchSearch = d.nome_documento.toLowerCase().includes(search.toLowerCase()) ||
      d.categoria.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategoria === "Todas" || d.categoria === filterCategoria;
    return matchSearch && matchCat;
  });

  const vencidos = docs.filter(d => d.data_validade && differenceInDays(parseISO(d.data_validade), new Date()) < 0);
  const aVencer = docs.filter(d => d.data_validade && differenceInDays(parseISO(d.data_validade), new Date()) >= 0 && differenceInDays(parseISO(d.data_validade), new Date()) <= 30);

  const categoriasUsadas = [...new Set(docs.map(d => d.categoria))];

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {(vencidos.length > 0 || aVencer.length > 0) && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Documentos com atenção
              <Badge className="bg-destructive text-destructive-foreground text-[10px]">{vencidos.length + aVencer.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid gap-1.5 max-h-36 overflow-y-auto">
              {vencidos.map(d => (
                <div key={d.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-destructive/10">
                  <FileText className="h-3.5 w-3.5" />
                  <Badge className="bg-destructive text-destructive-foreground text-[9px] px-1.5">Vencido</Badge>
                  <span className="font-medium">{d.nome_documento}</span>
                  <span className="text-muted-foreground">— {d.categoria}</span>
                  <span className="ml-auto text-destructive font-medium">{Math.abs(differenceInDays(parseISO(d.data_validade!), new Date()))}d atrás</span>
                </div>
              ))}
              {aVencer.map(d => (
                <div key={d.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-[hsl(var(--warning))]/10">
                  <FileText className="h-3.5 w-3.5" />
                  <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[9px] px-1.5">A vencer</Badge>
                  <span className="font-medium">{d.nome_documento}</span>
                  <span className="text-muted-foreground">— {d.categoria}</span>
                  <span className="ml-auto font-medium">{differenceInDays(parseISO(d.data_validade!), new Date())}d</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Certidões, contratos, licenças e documentos para licitações</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo Documento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar documento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas as categorias</SelectItem>
            {categoriasUsadas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum documento cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">Cadastre certidões, contratos e licenças da empresa</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc) => {
            const diasVal = doc.data_validade ? differenceInDays(parseISO(doc.data_validade), new Date()) : null;
            const statusColor = diasVal !== null
              ? diasVal < 0 ? "bg-destructive text-destructive-foreground"
              : diasVal <= 30 ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]"
              : "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
              : "bg-muted text-muted-foreground";
            const statusLabel = diasVal !== null
              ? diasVal < 0 ? "Vencido" : diasVal <= 30 ? "A vencer" : "Válido"
              : "Sem validade";

            return (
              <Card key={doc.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 pb-3 border-b border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate text-sm">{doc.nome_documento}</h3>
                        <p className="text-xs text-muted-foreground truncate">{doc.categoria}</p>
                      </div>
                      <Badge className={`shrink-0 text-[10px] ${statusColor}`}>{statusLabel}</Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-2 text-sm">
                    {doc.data_emissao && (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>Emissão: {format(parseISO(doc.data_emissao), "dd/MM/yyyy")}</span>
                      </div>
                    )}
                    {doc.data_validade && (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>Validade: {format(parseISO(doc.data_validade), "dd/MM/yyyy")}</span>
                        {diasVal !== null && <span className={`ml-auto text-xs font-medium ${diasVal < 0 ? "text-destructive" : ""}`}>
                          {diasVal < 0 ? `${Math.abs(diasVal)}d atrás` : `${diasVal}d restantes`}
                        </span>}
                      </div>
                    )}
                    {doc.arquivo_url && (
                      <div className="flex items-center gap-2 text-xs pt-1 border-t border-border mt-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                          {doc.arquivo_nome || "Ver arquivo"} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {doc.observacoes && (
                      <p className="text-xs text-muted-foreground italic truncate">{doc.observacoes}</p>
                    )}
                  </div>

                  <div className="flex border-t border-border">
                    <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs" onClick={() => openEdit(doc)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    {doc.arquivo_url && (
                      <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs" asChild>
                        <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5 mr-1" /> Baixar
                        </a>
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(doc.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Documento" : "Novo Documento da Empresa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do documento *</label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Certidão Negativa Federal" />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Data de emissão</label>
                <Input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Data de validade</label>
                <Input type="date" value={dataValidade} onChange={e => setDataValidade(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Arquivo (PDF, imagem)</label>
              <div className="flex items-center gap-2 mt-1">
                <label className="flex items-center gap-2 px-3 py-2 border border-input rounded-md cursor-pointer hover:bg-accent/50 text-sm">
                  <Upload className="h-4 w-4" />
                  {arquivo ? arquivo.name : editing?.arquivo_nome || "Selecionar arquivo"}
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setArquivo(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Informações adicionais..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={uploading}>
              {uploading ? "Enviando..." : editing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
