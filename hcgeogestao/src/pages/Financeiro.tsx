import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Trash2, Edit, DollarSign, TrendingUp,
  AlertTriangle, CheckCircle, Receipt,
  ArrowUpCircle, ArrowDownCircle, BarChart3, Search,
  FileDown, Zap, Lock,
} from "lucide-react";
import {
  DREChart, DespesasPieChart, ReceitasPieChart,
  DespesasFixasVsVariaveisChart, FluxoCaixaChart,
} from "@/components/financeiro/FinanceiroCharts";
import { exportFinanceiroPDF } from "@/components/financeiro/FinanceiroPDFExport";
import { DespesasTab } from "@/components/financeiro/DespesasTab";
import { DesempenhoTab } from "@/components/financeiro/DesempenhoTab";
import { DRETab } from "@/components/financeiro/DRETab";

// ── Password Gate (Server Verified) ──
function FinanceiroPasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const [loading, setLoading] = useState(false);
  console.log('v0.0.2')
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro(false);

    try {
      const res = await fetch(`${API_URL}/auth/verify-financeiro`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: senha })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem("financeiro_vault_open_v2", "true");
        onUnlock();
      } else {
        setErro(true);
        setSenha("");
      }
    } catch (err) {
      setErro(true);
      setSenha("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Cofre Restrito</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Reautenticação obrigatória para acessar as Finanças
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Senha Criptografada"
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setErro(false); }}
                autoFocus
              />
              {erro && (
                <p className="text-sm text-destructive">Acesso negado. Tente novamente.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Lock className="h-4 w-4 mr-2" /> {loading ? "Verificando..." : "Abrir Cofre"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CATEGORIAS_PAGAR = [
  "Combustível", "Manutenção", "Aluguel", "Salários", "Impostos",
  "Material", "Equipamentos", "Seguros", "Alimentação", "Hospedagem",
  "Transporte", "Telecomunicações", "Software", "Contabilidade",
  "Marketing", "Cartão de Crédito", "Boleto", "Fornecedor", "Outros",
];

const CATEGORIAS_RECEBER = [
  "Serviço", "Sondagem SPT", "Sondagem Rotativa", "Sondagem Mista",
  "Geofísica", "Poço Tubular", "Consultoria", "Relatório", "Outros",
];

const FORMAS_PAGAMENTO = [
  "PIX", "Boleto", "Transferência", "Cartão Crédito", "Cartão Débito",
  "Cheque", "Dinheiro", "Depósito",
];

const STATUS_COLORS: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Pago: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Recebido: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Atrasado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Parcial: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Cancelado: "bg-muted text-muted-foreground",
};

interface FormField {
  name: string; label: string; type: "text" | "number" | "date" | "select" | "textarea" | "checkbox";
  options?: string[]; required?: boolean;
}

function GenericFormDialog({
  open, onOpenChange, title, fields, initial, onSave, loading,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string;
  fields: FormField[]; initial: Record<string, any>;
  onSave: (data: Record<string, any>) => void; loading: boolean;
}) {
  const [form, setForm] = useState<Record<string, any>>(initial);
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => { if (open) setForm(initial); }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1">
              <Label>{f.label}{f.required && " *"}</Label>
              {f.type === "select" ? (
                <Select value={form[f.name] || ""} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {f.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : f.type === "textarea" ? (
                <Textarea value={form[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} rows={2} />
              ) : f.type === "checkbox" ? (
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={!!form[f.name]} onChange={(e) => set(f.name, e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">Sim</span>
                </div>
              ) : (
                <Input
                  type={f.type} value={form[f.name] ?? ""}
                  onChange={(e) => set(f.name, f.type === "number" ? Number(e.target.value) : e.target.value)}
                  step={f.type === "number" ? "0.01" : undefined}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={loading}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ──
export default function Financeiro() {
  const { session } = useAuth();
  const userRole = session?.user?.role;
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("financeiro_vault_open_v2") === "true");

  // 1. First layer of security: Role Check
  const hasAccess = userRole === 'admin' || userRole === 'financeiro' || userRole === 'user'; // (Keep 'user' temporarily for MVP tests)

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">O seu usuário atual não tem permissão de perfil (Role) para visualizar o Financeiro.</p>
      </div>
    );
  }

  // 2. Second layer of security: Encrypted Password Gate
  if (!unlocked) {
    return <FinanceiroPasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return <FinanceiroContent />;
}

function FinanceiroContent() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [mesAtual, setMesAtual] = useState(() => format(new Date(), "yyyy-MM"));
  const [search, setSearch] = useState("");

  // ── Queries ──
  const { data: contasPagar = [] } = useQuery({
    queryKey: ["contas_pagar", userId],
    queryFn: async () => {
      const { data } = await supabase.from("contas_pagar").select("*").order("data_vencimento", { ascending: true });
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: contasReceber = [] } = useQuery({
    queryKey: ["contas_receber", userId],
    queryFn: async () => {
      const { data } = await supabase.from("contas_receber").select("*").order("data_vencimento", { ascending: true });
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: despesasFixas = [] } = useQuery({
    queryKey: ["despesas_fixas", userId],
    queryFn: async () => {
      const { data } = await supabase.from("despesas_fixas").select("*").order("descricao");
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: propostas = [] } = useQuery({
    queryKey: ["propostas_aprovadas", userId],
    queryFn: async () => {
      const { data } = await supabase.from("propostas").select("*").eq("status", "Aprovada").order("data_emissao", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const mesStart = startOfMonth(parseISO(mesAtual + "-01"));
  const mesEnd = endOfMonth(mesStart);
  const inMonth = (d: string) => {
    try { return isWithinInterval(parseISO(d), { start: mesStart, end: mesEnd }); }
    catch { return false; }
  };

  const pagarMes = contasPagar.filter((c: any) => inMonth(c.data_vencimento));
  const receberMes = contasReceber.filter((c: any) => inMonth(c.data_vencimento));

  const totalPagar = pagarMes.reduce((s: number, c: any) => s + Number(c.valor), 0);
  const totalPago = pagarMes.reduce((s: number, c: any) => s + Number(c.valor_pago), 0);
  const totalReceber = receberMes.reduce((s: number, c: any) => s + Number(c.valor), 0);
  const totalRecebido = receberMes.reduce((s: number, c: any) => s + Number(c.valor_recebido), 0);
  const saldo = totalRecebido - totalPago;
  const despFixasTotal = despesasFixas.filter((d: any) => d.ativa).reduce((s: number, d: any) => s + Number(d.valor), 0);
  const atrasados = contasPagar.filter((c: any) => c.status === "Pendente" && new Date(c.data_vencimento) < new Date()).length
    + contasReceber.filter((c: any) => c.status === "Pendente" && new Date(c.data_vencimento) < new Date()).length;

  const dreReceitas = receberMes.filter((c: any) => c.status === "Recebido").reduce((s: number, c: any) => s + Number(c.valor_recebido), 0);
  const dreDespesas = pagarMes.filter((c: any) => c.status === "Pago").reduce((s: number, c: any) => s + Number(c.valor_pago), 0);
  const dreLucro = dreReceitas - dreDespesas;

  const despByCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    pagarMes.filter((c: any) => c.status === "Pago").forEach((c: any) => {
      map[c.categoria] = (map[c.categoria] || 0) + Number(c.valor_pago);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [pagarMes]);

  const recByCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    receberMes.filter((c: any) => c.status === "Recebido").forEach((c: any) => {
      map[c.categoria] = (map[c.categoria] || 0) + Number(c.valor_recebido);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [receberMes]);

  const [dialogPagar, setDialogPagar] = useState(false);
  const [dialogReceber, setDialogReceber] = useState(false);
  const [dialogDespFix, setDialogDespFix] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const propostasSemCobranca = useMemo(() => {
    const refs = new Set(contasReceber.map((c: any) => c.proposta_referencia).filter(Boolean));
    return propostas.filter((p: any) => !refs.has(p.numero));
  }, [propostas, contasReceber]);

  const mutPagar = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, user_id: userId };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (editItem?.id) {
        const { error } = await supabase.from("contas_pagar").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contas_pagar").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contas_pagar"] }); setDialogPagar(false); setEditItem(null); toast({ title: "Salvo!" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const mutReceber = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, user_id: userId };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (editItem?.id) {
        const { error } = await supabase.from("contas_receber").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contas_receber").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contas_receber"] }); setDialogReceber(false); setEditItem(null); toast({ title: "Salvo!" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const mutDespFixa = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, user_id: userId };
      delete payload.id; delete payload.created_at; delete payload.updated_at;
      if (editItem?.id) {
        const { error } = await supabase.from("despesas_fixas").update(payload).eq("id", editItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("despesas_fixas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["despesas_fixas"] }); setDialogDespFix(false); setEditItem(null); toast({ title: "Salvo!" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas_pagar"] });
      qc.invalidateQueries({ queryKey: ["contas_receber"] });
      qc.invalidateQueries({ queryKey: ["despesas_fixas"] });
      toast({ title: "Excluído!" });
    },
  });

  const marcarPago = useMutation({
    mutationFn: async ({ table, id, valor }: { table: string; id: string; valor: number }) => {
      const field = table === "contas_pagar" ? "valor_pago" : "valor_recebido";
      const statusVal = table === "contas_pagar" ? "Pago" : "Recebido";
      const dateField = table === "contas_pagar" ? "data_pagamento" : "data_recebimento";
      const { error } = await supabase.from(table as any).update({
        [field]: valor, status: statusVal, [dateField]: format(new Date(), "yyyy-MM-dd"),
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas_pagar"] });
      qc.invalidateQueries({ queryKey: ["contas_receber"] });
      toast({ title: "Marcado como pago!" });
    },
  });

  const gerarCobrancas = useMutation({
    mutationFn: async () => {
      const inserts = propostasSemCobranca.map((p: any) => {
        const entrada = Number(p.valor_total) * 0.5;
        const saldoVal = Number(p.valor_total) - entrada;
        return [
          {
            user_id: userId!,
            descricao: `Entrada - ${p.titulo}`,
            categoria: p.tipo_servico || "Serviço",
            cliente: p.contratante_nome || "",
            proposta_referencia: p.numero,
            valor: entrada,
            valor_recebido: 0,
            data_vencimento: format(new Date(), "yyyy-MM-dd"),
            status: "Pendente",
            forma_recebimento: "PIX",
            observacoes: `Gerado automaticamente da proposta ${p.numero}`,
          },
          {
            user_id: userId!,
            descricao: `Saldo - ${p.titulo}`,
            categoria: p.tipo_servico || "Serviço",
            cliente: p.contratante_nome || "",
            proposta_referencia: p.numero,
            valor: saldoVal,
            valor_recebido: 0,
            data_vencimento: format(new Date(Date.now() + 30 * 86400000), "yyyy-MM-dd"),
            status: "Pendente",
            forma_recebimento: "PIX",
            observacoes: `Saldo na entrega do relatório - proposta ${p.numero}`,
          },
        ];
      }).flat();
      if (inserts.length === 0) throw new Error("Nenhuma proposta aprovada sem cobrança");
      const { error } = await supabase.from("contas_receber").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas_receber"] });
      toast({ title: "Cobranças geradas!", description: `${propostasSemCobranca.length} proposta(s) convertidas em cobranças (Entrada + Saldo)` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const fieldsPagar: FormField[] = [
    { name: "descricao", label: "Descrição", type: "text", required: true },
    { name: "categoria", label: "Categoria", type: "select", options: CATEGORIAS_PAGAR },
    { name: "fornecedor", label: "Fornecedor", type: "text" },
    { name: "valor", label: "Valor (R$)", type: "number", required: true },
    { name: "data_vencimento", label: "Vencimento", type: "date", required: true },
    { name: "forma_pagamento", label: "Forma de Pagamento", type: "select", options: FORMAS_PAGAMENTO },
    { name: "numero_documento", label: "Nº Documento / Boleto", type: "text" },
    { name: "status", label: "Status", type: "select", options: ["Pendente", "Pago", "Parcial", "Atrasado", "Cancelado"] },
    { name: "valor_pago", label: "Valor Pago (R$)", type: "number" },
    { name: "data_pagamento", label: "Data Pagamento", type: "date" },
    { name: "recorrente", label: "Recorrente", type: "checkbox" },
    { name: "observacoes", label: "Observações", type: "textarea" },
  ];

  const fieldsReceber: FormField[] = [
    { name: "descricao", label: "Descrição", type: "text", required: true },
    { name: "categoria", label: "Categoria", type: "select", options: CATEGORIAS_RECEBER },
    { name: "cliente", label: "Cliente", type: "text" },
    { name: "obra_referencia", label: "Obra Referência", type: "text" },
    { name: "proposta_referencia", label: "Proposta Referência", type: "text" },
    { name: "valor", label: "Valor (R$)", type: "number", required: true },
    { name: "data_vencimento", label: "Vencimento", type: "date", required: true },
    { name: "forma_recebimento", label: "Forma de Recebimento", type: "select", options: FORMAS_PAGAMENTO },
    { name: "numero_nf", label: "Nº Nota Fiscal", type: "text" },
    { name: "status", label: "Status", type: "select", options: ["Pendente", "Recebido", "Parcial", "Atrasado", "Cancelado"] },
    { name: "valor_recebido", label: "Valor Recebido (R$)", type: "number" },
    { name: "data_recebimento", label: "Data Recebimento", type: "date" },
    { name: "observacoes", label: "Observações", type: "textarea" },
  ];

  const fieldsDespFixa: FormField[] = [
    { name: "descricao", label: "Descrição", type: "text", required: true },
    { name: "categoria", label: "Categoria", type: "select", options: ["Aluguel", "Salários", "Energia", "Internet", "Telefone", "Água", "Contabilidade", "Software", "Seguros", "Impostos", "Marketing", "Operacional", "Outros"] },
    { name: "valor", label: "Valor Mensal (R$)", type: "number", required: true },
    { name: "dia_vencimento", label: "Dia do Vencimento", type: "number" },
    { name: "ativa", label: "Ativa", type: "checkbox" },
    { name: "observacoes", label: "Observações", type: "textarea" },
  ];

  const defaultPagar = { descricao: "", categoria: "Outros", fornecedor: "", valor: 0, data_vencimento: format(new Date(), "yyyy-MM-dd"), forma_pagamento: "", numero_documento: "", status: "Pendente", valor_pago: 0, data_pagamento: "", recorrente: false, observacoes: "" };
  const defaultReceber = { descricao: "", categoria: "Serviço", cliente: "", obra_referencia: "", proposta_referencia: "", valor: 0, data_vencimento: format(new Date(), "yyyy-MM-dd"), forma_recebimento: "", numero_nf: "", status: "Pendente", valor_recebido: 0, data_recebimento: "", observacoes: "" };
  const defaultDespFixa = { descricao: "", categoria: "Operacional", valor: 0, dia_vencimento: 1, ativa: true, observacoes: "" };

  const filterFn = (item: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (item.descricao?.toLowerCase().includes(s) || item.fornecedor?.toLowerCase().includes(s) || item.cliente?.toLowerCase().includes(s) || item.categoria?.toLowerCase().includes(s));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Gestão financeira completa</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="month" value={mesAtual} onChange={(e) => setMesAtual(e.target.value)} className="w-44" />
          {propostasSemCobranca.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => gerarCobrancas.mutate()} disabled={gerarCobrancas.isPending}>
              <Zap className="h-4 w-4 mr-1" /> Gerar Cobranças ({propostasSemCobranca.length})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => exportFinanceiroPDF({ mesAtual, contasPagar, contasReceber, despesasFixas })}>
            <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><ArrowUpCircle className="h-4 w-4 text-green-500" /><span className="text-xs font-medium">A Receber</span></div>
          <p className="text-lg font-bold text-foreground">{BRL(totalReceber)}</p>
          <p className="text-xs text-muted-foreground">Recebido: {BRL(totalRecebido)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><ArrowDownCircle className="h-4 w-4 text-red-500" /><span className="text-xs font-medium">A Pagar</span></div>
          <p className="text-lg font-bold text-foreground">{BRL(totalPagar)}</p>
          <p className="text-xs text-muted-foreground">Pago: {BRL(totalPago)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs font-medium">Saldo</span></div>
          <p className={`text-lg font-bold ${saldo >= 0 ? "text-green-600" : "text-red-600"}`}>{BRL(saldo)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Receipt className="h-4 w-4 text-orange-500" /><span className="text-xs font-medium">Desp. Fixas</span></div>
          <p className="text-lg font-bold text-foreground">{BRL(despFixasTotal)}</p>
          <p className="text-xs text-muted-foreground">/mês</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><TrendingUp className="h-4 w-4 text-green-500" /><span className="text-xs font-medium">Lucro</span></div>
          <p className={`text-lg font-bold ${dreLucro >= 0 ? "text-green-600" : "text-red-600"}`}>{BRL(dreLucro)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-xs font-medium">Atrasados</span></div>
          <p className="text-lg font-bold text-foreground">{atrasados}</p>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pagar" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="pagar" className="flex-1 min-w-[100px]"><ArrowDownCircle className="h-4 w-4 mr-1" /> A Pagar</TabsTrigger>
          <TabsTrigger value="receber" className="flex-1 min-w-[100px]"><ArrowUpCircle className="h-4 w-4 mr-1" /> A Receber</TabsTrigger>
          <TabsTrigger value="despesas" className="flex-1 min-w-[100px]"><Receipt className="h-4 w-4 mr-1" /> Despesas</TabsTrigger>
          <TabsTrigger value="dre" className="flex-1 min-w-[80px]"><BarChart3 className="h-4 w-4 mr-1" /> DRE</TabsTrigger>
          <TabsTrigger value="graficos" className="flex-1 min-w-[80px]"><BarChart3 className="h-4 w-4 mr-1" /> Gráficos</TabsTrigger>
          <TabsTrigger value="desempenho" className="flex-1 min-w-[100px]"><TrendingUp className="h-4 w-4 mr-1" /> Desempenho</TabsTrigger>
        </TabsList>

        {/* ── CONTAS A PAGAR ── */}
        <TabsContent value="pagar">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Contas a Pagar</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48" />
                </div>
                <Button size="sm" onClick={() => { setEditItem(null); setDialogPagar(true); }}><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Valor</TableHead><TableHead>Vencimento</TableHead>
                    <TableHead>Forma Pgto</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {pagarMes.filter(filterFn).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.descricao}</TableCell>
                        <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
                        <TableCell>{c.fornecedor}</TableCell>
                        <TableCell className="text-right font-mono">{BRL(Number(c.valor))}</TableCell>
                        <TableCell>{format(parseISO(c.data_vencimento), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{c.forma_pagamento}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || ""}`}>{c.status}</span></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {c.status === "Pendente" && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Marcar Pago"
                                onClick={() => marcarPago.mutate({ table: "contas_pagar", id: c.id, valor: Number(c.valor) })}>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditItem(c); setDialogPagar(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate({ table: "contas_pagar", id: c.id })}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pagarMes.filter(filterFn).length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma conta a pagar neste mês</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CONTAS A RECEBER ── */}
        <TabsContent value="receber">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Contas a Receber</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-48" />
                </div>
                <Button size="sm" onClick={() => { setEditItem(null); setDialogReceber(true); }}><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead><TableHead>Vencimento</TableHead>
                    <TableHead>Proposta</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {receberMes.filter(filterFn).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.descricao}</TableCell>
                        <TableCell><Badge variant="outline">{c.categoria}</Badge></TableCell>
                        <TableCell>{c.cliente}</TableCell>
                        <TableCell className="text-right font-mono">{BRL(Number(c.valor))}</TableCell>
                        <TableCell>{format(parseISO(c.data_vencimento), "dd/MM/yyyy")}</TableCell>
                        <TableCell>{c.proposta_referencia}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || ""}`}>{c.status}</span></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {c.status === "Pendente" && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="Marcar Recebido"
                                onClick={() => marcarPago.mutate({ table: "contas_receber", id: c.id, valor: Number(c.valor) })}>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditItem(c); setDialogReceber(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMut.mutate({ table: "contas_receber", id: c.id })}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {receberMes.filter(filterFn).length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma conta a receber neste mês</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DESPESAS ── */}
        <TabsContent value="despesas">
          <DespesasTab contasPagar={contasPagar} despesasFixas={despesasFixas} userId={userId!} mesAtual={mesAtual} />
        </TabsContent>

        {/* ── DRE ── */}
        <TabsContent value="dre">
          <DRETab contasPagar={contasPagar} contasReceber={contasReceber} despesasFixas={despesasFixas} mesAtual={mesAtual} />
        </TabsContent>

        {/* ── GRÁFICOS ── */}
        <TabsContent value="graficos">
          <div className="grid lg:grid-cols-2 gap-6">
            <DREChart contasPagar={contasPagar} contasReceber={contasReceber} despesasFixas={despesasFixas} mesAtual={mesAtual} />
            <FluxoCaixaChart contasPagar={contasPagar} contasReceber={contasReceber} />
            <DespesasPieChart contasPagar={pagarMes} mesAtual={mesAtual} />
            <ReceitasPieChart contasReceber={receberMes} mesAtual={mesAtual} />
            <DespesasFixasVsVariaveisChart despesasFixas={despesasFixas} contasPagar={pagarMes} mesAtual={mesAtual} />
          </div>
        </TabsContent>

        {/* ── DESEMPENHO ── */}
        <TabsContent value="desempenho">
          <DesempenhoTab userId={userId!} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <GenericFormDialog
        open={dialogPagar} onOpenChange={setDialogPagar}
        title={editItem ? "Editar Conta a Pagar" : "Nova Conta a Pagar"}
        fields={fieldsPagar} initial={editItem || defaultPagar}
        onSave={(d) => mutPagar.mutate(d)} loading={mutPagar.isPending}
      />
      <GenericFormDialog
        open={dialogReceber} onOpenChange={setDialogReceber}
        title={editItem ? "Editar Conta a Receber" : "Nova Conta a Receber"}
        fields={fieldsReceber} initial={editItem || defaultReceber}
        onSave={(d) => mutReceber.mutate(d)} loading={mutReceber.isPending}
      />
      <GenericFormDialog
        open={dialogDespFix} onOpenChange={setDialogDespFix}
        title={editItem ? "Editar Despesa Fixa" : "Nova Despesa Fixa"}
        fields={fieldsDespFixa} initial={editItem || defaultDespFixa}
        onSave={(d) => mutDespFixa.mutate(d)} loading={mutDespFixa.isPending}
      />
    </div>
  );
}
