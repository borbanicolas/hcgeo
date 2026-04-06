import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Search, FileText, Pencil, Trash2, ClipboardList, FileDown, BarChart3, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { PropostaFormDialog } from "@/components/propostas/PropostaFormDialog";
import { OSFormDialog } from "@/components/propostas/OSFormDialog";
import { ImportPropostaDialog } from "@/components/propostas/ImportPropostaDialog";
import { toast } from "sonner";
import { exportPropostaPDF } from "@/components/propostas/PropostaPDFExport";
import { PropostasRelatorio } from "@/components/propostas/PropostasRelatorio";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  Rascunho: "bg-muted text-muted-foreground",
  Enviada: "bg-info/15 text-info border-info/30",
  "Em Análise": "bg-warning/15 text-warning border-warning/30",
  Aprovada: "bg-success/15 text-success border-success/30",
  Reprovada: "bg-destructive/15 text-destructive border-destructive/30",
  Cancelada: "bg-muted text-muted-foreground",
};

const osStatusColors: Record<string, string> = {
  Aberta: "bg-info/15 text-info border-info/30",
  "Em Execução": "bg-warning/15 text-warning border-warning/30",
  Concluída: "bg-success/15 text-success border-success/30",
  Cancelada: "bg-muted text-muted-foreground",
};

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const Propostas = () => {
  const [propostas, setPropostas] = useState<any[]>([]);
  const [ordens, setOrdens] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [searchOS, setSearchOS] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [osDialogOpen, setOsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editingOS, setEditingOS] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOSId, setDeleteOSId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    const [propRes, osRes] = await Promise.all([
      supabase.from("propostas").select("*, clientes(razao_social)").order("created_at", { ascending: false }),
      supabase.from("ordens_servico").select("*, propostas(numero, titulo)").order("created_at", { ascending: false }),
    ]);
    if (propRes.error) toast.error("Erro ao carregar propostas");
    else setPropostas(propRes.data || []);
    if (osRes.error) toast.error("Erro ao carregar OS");
    else setOrdens(osRes.data || []);
    setLoadingData(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("propostas").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir proposta");
    else { toast.success("Proposta excluída"); fetchData(); }
    setDeleteId(null);
  };

  const handleDeleteOS = async () => {
    if (!deleteOSId) return;
    const { error } = await supabase.from("ordens_servico").delete().eq("id", deleteOSId);
    if (error) toast.error("Erro ao excluir OS");
    else { toast.success("OS excluída"); fetchData(); }
    setDeleteOSId(null);
  };

  const generateOS = async (proposta: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: numData, error: numErr } = await supabase.rpc("generate_os_number", { p_user_id: user.id });
      if (numErr) throw numErr;
      const { error } = await supabase.from("ordens_servico").insert({
        user_id: user.id, proposta_id: proposta.id, numero: numData,
        cliente_nome: proposta.contratante_nome || proposta.clientes?.razao_social || "", local_obra: proposta.local_obra || "",
        tipo_servico: proposta.tipo_servico || "", descricao_servico: proposta.titulo || "",
      });
      if (error) throw error;
      toast.success(`OS ${numData} gerada!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar OS");
    }
  };

  const handleExportPDF = async (proposta: any) => {
    const { data: itensData } = await supabase.from("proposta_itens").select("*").eq("proposta_id", proposta.id).order("ordem");
    await exportPropostaPDF({
      numero: proposta.numero,
      revisao: proposta.revisao || "R.00",
      titulo: proposta.titulo,
      contratante_nome: proposta.contratante_nome || proposta.clientes?.razao_social || "",
      contato_nome: proposta.contato_nome || "",
      contato_telefone: proposta.contato_telefone || "",
      contato_email: proposta.contato_email || "",
      local_obra: proposta.local_obra || "",
      tipo_servico: proposta.tipo_servico || "",
      data_emissao: proposta.data_emissao || "",
      validade_dias: proposta.validade_dias || 15,
      forma_pagamento: proposta.forma_pagamento || "",
      condicoes_pagamento: proposta.condicoes_pagamento || "",
      prazo_inicio: proposta.prazo_inicio || "",
      prazo_execucao_campo: proposta.prazo_execucao_campo || "",
      prazo_entrega_relatorio: proposta.prazo_entrega_relatorio || "",
      prazo_execucao: proposta.prazo_execucao || "",
      encargos_contratante: proposta.encargos_contratante || "",
      encargos_contratada: proposta.encargos_contratada || "",
      condicoes_gerais: proposta.condicoes_gerais || "",
      cancelamento_suspensao: proposta.cancelamento_suspensao || "",
      notas_complementares: proposta.notas_complementares || "",
      observacoes: proposta.observacoes || "",
      desconto_percentual: proposta.desconto_percentual || 0,
      itens: (itensData || []).map((d: any) => ({
        item_numero: d.item_numero || "",
        descricao: d.descricao || "",
        unidade: d.unidade || "",
        quantidade: d.quantidade || 0,
        valor_unitario: d.valor_unitario || 0,
        valor_total: d.valor_total || 0,
        is_grupo: d.is_grupo || false,
        grupo_nome: d.grupo_nome || "",
      })),
    });
    toast.success("PDF exportado!");
  };

  const filteredPropostas = propostas.filter((p) =>
    p.titulo?.toLowerCase().includes(search.toLowerCase()) ||
    p.numero?.toLowerCase().includes(search.toLowerCase()) ||
    p.clientes?.razao_social?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOS = ordens.filter((o) =>
    o.numero?.toLowerCase().includes(searchOS.toLowerCase()) ||
    o.cliente_nome?.toLowerCase().includes(searchOS.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propostas & OS</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {propostas.length} proposta{propostas.length !== 1 ? "s" : ""} · {ordens.length} OS
          </p>
        </div>
      </div>

      <Tabs defaultValue="propostas" className="w-full">
        <TabsList>
          <TabsTrigger value="propostas" className="gap-1.5"><FileText className="h-4 w-4" /> Propostas</TabsTrigger>
          <TabsTrigger value="os" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Ordens de Serviço</TabsTrigger>
          <TabsTrigger value="relatorio" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Relatório</TabsTrigger>
        </TabsList>

        <TabsContent value="propostas" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar proposta..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4" /> Importar
              </Button>
              <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4" /> Nova Proposta
              </Button>
            </div>
          </div>

          {loadingData ? (
            <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" /></div>
          ) : filteredPropostas.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhuma proposta encontrada</p>
              <Button variant="link" onClick={() => { setEditing(null); setDialogOpen(true); }}>Criar primeira proposta</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPropostas.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="stat-card cursor-pointer" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">{p.numero}</span>
                        <Badge variant="outline" className={statusColors[p.status] || ""}>{p.status}</Badge>
                      </div>
                      <h3 className="font-semibold text-foreground truncate mt-1">{p.titulo}</h3>
                      {(p.contratante_nome || p.clientes?.razao_social) && <p className="text-sm text-muted-foreground truncate">{p.contratante_nome || p.clientes?.razao_social}</p>}
                    </div>
                    <span className="text-lg font-bold text-accent shrink-0">{fmt(p.valor_total || 0)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{p.tipo_servico} · {p.local_obra || "Local não definido"}</span>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {p.status === "Aprovada" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => generateOS(p)}>
                          <ClipboardList className="h-3.5 w-3.5" /> Gerar OS
                        </Button>
                       )}
                       <button onClick={() => handleExportPDF(p)} className="text-muted-foreground hover:text-foreground transition-colors" title="Exportar PDF"><FileDown className="h-4 w-4" /></button>
                       <button onClick={() => { setEditing(p); setDialogOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                       <button onClick={() => setDeleteId(p.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="os" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar OS..." value={searchOS} onChange={(e) => setSearchOS(e.target.value)} className="pl-9" />
            </div>
          </div>

          {filteredOS.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhuma OS encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">Aprove uma proposta para gerar uma OS automaticamente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOS.map((o, i) => (
                <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="stat-card cursor-pointer" onClick={() => { setEditingOS(o); setOsDialogOpen(true); }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">{o.numero}</span>
                        <Badge variant="outline" className={osStatusColors[o.status] || ""}>{o.status}</Badge>
                      </div>
                      <h3 className="font-semibold text-foreground truncate mt-1">{o.cliente_nome || "Sem cliente"}</h3>
                      {o.propostas && <p className="text-xs text-muted-foreground">Proposta: {o.propostas.numero} - {o.propostas.titulo}</p>}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{o.tipo_servico} · {o.local_obra || "Local não definido"}</span>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setEditingOS(o); setOsDialogOpen(true); }} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteOSId(o.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {(o.data_inicio || o.data_previsao_fim) && (
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      {o.data_inicio && <span>Início: {new Date(o.data_inicio).toLocaleDateString("pt-BR")}</span>}
                      {o.data_previsao_fim && <span>Previsão: {new Date(o.data_previsao_fim).toLocaleDateString("pt-BR")}</span>}
                      {o.data_conclusao && <span>Concluída: {new Date(o.data_conclusao).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="relatorio" className="mt-4">
          <PropostasRelatorio />
        </TabsContent>
      </Tabs>

      <PropostaFormDialog open={dialogOpen} onOpenChange={setDialogOpen} proposta={editing} onSaved={fetchData} />
      <OSFormDialog open={osDialogOpen} onOpenChange={setOsDialogOpen} os={editingOS} onSaved={fetchData} />
      <ImportPropostaDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} onSaved={fetchData} />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir proposta?</AlertDialogTitle><AlertDialogDescription>Itens vinculados também serão excluídos.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteOSId} onOpenChange={(o) => !o && setDeleteOSId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir OS?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteOS} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Propostas;
