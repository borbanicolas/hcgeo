import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColaboradorFormDialog } from "@/components/colaboradores/ColaboradorFormDialog";
import { ColaboradorDocumentos } from "@/components/colaboradores/ColaboradorDocumentos";
import { ColaboradorFolhaPonto } from "@/components/colaboradores/ColaboradorFolhaPonto";
import { DocumentosEmpresa } from "@/components/empresa/DocumentosEmpresa";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, FileText, Phone, Mail, Briefcase, Clock,
  AlertTriangle, ShieldCheck, HardHat, Stethoscope, Syringe, Users, Building2,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface DocAlert {
  colaboradorNome: string;
  colaboradorId: string;
  tipo: "ASO" | "NR" | "EPI" | "Vacina";
  descricao: string;
  dataValidade: string;
  diasRestantes: number;
}

function ColaboradoresTab() {
  const { toast } = useToast();
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const [docsColab, setDocsColab] = useState<any>(null);
  const [pontoOpen, setPontoOpen] = useState(false);
  const [pontoColab, setPontoColab] = useState<any>(null);
  const [filterAtivo, setFilterAtivo] = useState("Todos");
  const [alerts, setAlerts] = useState<DocAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);

  const fetchColaboradores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("colaboradores")
      .select("*")
      .order("nome");
    if (!error) setColaboradores(data || []);
    setLoading(false);
  };

  const fetchAlerts = async () => {
    const colabs = (await supabase.from("colaboradores").select("id, nome").order("nome")).data || [];
    if (colabs.length === 0) { setAlerts([]); return; }

    const ids = colabs.map(c => c.id);
    const colabMap = Object.fromEntries(colabs.map(c => [c.id, c.nome]));

    const [asos, nrs, epis, vacinas] = await Promise.all([
      supabase.from("colaborador_asos").select("colaborador_id, tipo, data_validade").in("colaborador_id", ids),
      supabase.from("colaborador_nrs").select("colaborador_id, norma, data_validade").in("colaborador_id", ids),
      supabase.from("colaborador_epis").select("colaborador_id, equipamento, data_validade").in("colaborador_id", ids),
      supabase.from("colaborador_vacinas" as any).select("colaborador_id, vacina, data_validade").in("colaborador_id", ids),
    ]);

    const items: DocAlert[] = [];
    const addItems = (data: any[] | null, tipo: DocAlert["tipo"], getDesc: (i: any) => string) => {
      (data || []).forEach((item: any) => {
        if (!item.data_validade) return;
        const dias = differenceInDays(parseISO(item.data_validade), new Date());
        if (dias <= 30) {
          items.push({
            colaboradorNome: colabMap[item.colaborador_id] || "—",
            colaboradorId: item.colaborador_id,
            tipo, descricao: getDesc(item),
            dataValidade: item.data_validade,
            diasRestantes: dias,
          });
        }
      });
    };

    addItems(asos.data, "ASO", i => i.tipo);
    addItems(nrs.data, "NR", i => i.norma);
    addItems(epis.data, "EPI", i => i.equipamento);
    addItems((vacinas.data as any[]), "Vacina", i => i.vacina);

    items.sort((a, b) => a.diasRestantes - b.diasRestantes);
    setAlerts(items);
  };

  useEffect(() => { fetchColaboradores(); fetchAlerts(); }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("colaboradores").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
    else { toast({ title: "Colaborador excluído" }); fetchColaboradores(); fetchAlerts(); }
  };

  const filtered = colaboradores.filter((c) => {
    const matchSearch =
      c.nome?.toLowerCase().includes(search.toLowerCase()) ||
      c.cargo?.toLowerCase().includes(search.toLowerCase()) ||
      c.cpf?.includes(search);
    const matchAtivo = filterAtivo === "Todos" || (filterAtivo === "Ativos" ? c.ativo : !c.ativo);
    return matchSearch && matchAtivo;
  });

  const vencidos = alerts.filter(a => a.diasRestantes < 0);
  const aVencer = alerts.filter(a => a.diasRestantes >= 0);

  const tipoIcon = (tipo: string) => {
    switch (tipo) {
      case "ASO": return <Stethoscope className="h-3.5 w-3.5" />;
      case "NR": return <ShieldCheck className="h-3.5 w-3.5" />;
      case "EPI": return <HardHat className="h-3.5 w-3.5" />;
      case "Vacina": return <Syringe className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Ficha de registro, ASO, NRs e EPIs</p>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Colaborador
        </Button>
      </div>

      {/* Dashboard de Alertas */}
      {alerts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Alertas de Vencimento
                <Badge className="bg-destructive text-destructive-foreground text-[10px]">{alerts.length}</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowAlerts(!showAlerts)}>
                {showAlerts ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
          </CardHeader>
          {showAlerts && (
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid gap-1.5 max-h-48 overflow-y-auto">
                {vencidos.map((a, i) => (
                  <div key={`v-${i}`} className="flex items-center gap-2 text-xs p-1.5 rounded bg-destructive/10 cursor-pointer hover:bg-destructive/20"
                    onClick={() => { const c = colaboradores.find(c => c.id === a.colaboradorId); if (c) { setDocsColab(c); setDocsOpen(true); } }}>
                    {tipoIcon(a.tipo)}
                    <Badge className="bg-destructive text-destructive-foreground text-[9px] px-1.5">Vencido</Badge>
                    <span className="font-medium">{a.colaboradorNome}</span>
                    <span className="text-muted-foreground">— {a.tipo}: {a.descricao}</span>
                    <span className="ml-auto text-destructive font-medium">{Math.abs(a.diasRestantes)}d atrás</span>
                  </div>
                ))}
                {aVencer.map((a, i) => (
                  <div key={`a-${i}`} className="flex items-center gap-2 text-xs p-1.5 rounded bg-[hsl(var(--warning))]/10 cursor-pointer hover:bg-[hsl(var(--warning))]/20"
                    onClick={() => { const c = colaboradores.find(c => c.id === a.colaboradorId); if (c) { setDocsColab(c); setDocsOpen(true); } }}>
                    {tipoIcon(a.tipo)}
                    <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[9px] px-1.5">A vencer</Badge>
                    <span className="font-medium">{a.colaboradorNome}</span>
                    <span className="text-muted-foreground">— {a.tipo}: {a.descricao}</span>
                    <span className="ml-auto font-medium">{a.diasRestantes}d</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar colaborador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {["Todos", "Ativos", "Inativos"].map((s) => (
            <Button key={s} size="sm" variant={filterAtivo === s ? "default" : "outline"} onClick={() => setFilterAtivo(s)} className="text-xs">
              {s}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-accent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum colaborador encontrado</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((colab) => (
            <Card key={colab.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 pb-3 border-b border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{colab.nome}</h3>
                      {colab.cargo && <p className="text-sm text-muted-foreground truncate">{colab.cargo}{colab.funcao ? ` — ${colab.funcao}` : ""}</p>}
                    </div>
                    <Badge className={cn("shrink-0 text-[10px]", colab.ativo ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" : "bg-muted text-muted-foreground")}>
                      {colab.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 space-y-2 text-sm">
                  {colab.cpf && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" />
                      <span>CPF: {colab.cpf}</span>
                    </div>
                  )}
                  {colab.telefone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{colab.telefone}</span>
                    </div>
                  )}
                  {colab.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{colab.email}</span>
                    </div>
                  )}
                  {colab.data_admissao && (
                    <div className="text-xs text-muted-foreground pt-1 border-t border-border mt-2">
                      Admissão: {format(new Date(colab.data_admissao + "T12:00:00"), "dd/MM/yyyy")}
                    </div>
                  )}
                </div>

                <div className="flex border-t border-border">
                  <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs" onClick={() => { setDocsColab(colab); setDocsOpen(true); }}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> Docs
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs" onClick={() => { setPontoColab(colab); setPontoOpen(true); }}>
                    <Clock className="h-3.5 w-3.5 mr-1" /> Ponto
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs" onClick={() => { setEditing(colab); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-1 rounded-none text-xs text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
                        <AlertDialogDescription>Todos os documentos (ASO, NR, EPI) serão excluídos junto.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(colab.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ColaboradorFormDialog open={dialogOpen} onOpenChange={setDialogOpen} colaborador={editing} onSuccess={() => { fetchColaboradores(); fetchAlerts(); }} />
      {docsColab && <ColaboradorDocumentos open={docsOpen} onOpenChange={(o) => { setDocsOpen(o); if (!o) fetchAlerts(); }} colaborador={docsColab} />}
      {pontoColab && <ColaboradorFolhaPonto open={pontoOpen} onOpenChange={setPontoOpen} colaborador={pontoColab} />}
    </div>
  );
}

export default function Colaboradores() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">RH & Administrativo</h1>

      <Tabs defaultValue="colaboradores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="colaboradores" className="gap-2">
            <Users className="h-4 w-4" /> Colaboradores
          </TabsTrigger>
          <TabsTrigger value="empresa" className="gap-2">
            <Building2 className="h-4 w-4" /> Documentos da Empresa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colaboradores">
          <ColaboradoresTab />
        </TabsContent>

        <TabsContent value="empresa">
          <DocumentosEmpresa />
        </TabsContent>
      </Tabs>
    </div>
  );
}
