import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
  Plus, Trash2, Edit, Search, CheckCircle, Copy, Filter,
  Receipt, DollarSign, AlertTriangle, Clock, Repeat,
  ChevronDown,
} from "lucide-react";

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CATEGORIAS = [
  "Combustível", "Manutenção", "Aluguel", "Salários", "Impostos",
  "Material", "Equipamentos", "Seguros", "Alimentação", "Hospedagem",
  "Transporte", "Telecomunicações", "Software", "Contabilidade",
  "Marketing", "Cartão de Crédito", "Boleto", "Fornecedor", "Outros",
];

const FORMAS_PAGAMENTO = [
  "PIX", "Boleto", "Transferência", "Cartão Crédito", "Cartão Débito",
  "Cheque", "Dinheiro", "Depósito",
];

const STATUS_COLORS: Record<string, string> = {
  Pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Pago: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Atrasado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Parcial: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Cancelado: "bg-muted text-muted-foreground",
};

interface DespesasTabProps {
  contasPagar: any[];
  despesasFixas: any[];
  userId: string;
  mesAtual: string;
}

export function DespesasTab({ contasPagar, despesasFixas, userId, mesAtual }: DespesasTabProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Filters
  const [search, setSearch] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroForma, setFiltroForma] = useState("Todos");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // Form state
  const defaultForm = {
    descricao: "", categoria: "Outros", fornecedor: "", valor: 0,
    data_vencimento: format(new Date(), "yyyy-MM-dd"), forma_pagamento: "",
    numero_documento: "", status: "Pendente", valor_pago: 0,
    data_pagamento: "", observacoes: "", tipo_despesa: "Variável",
    recorrencia: "", recorrente: false, parcela_atual: "",
    total_parcelas: "", centro_custo: "",
  };
  const [form, setForm] = useState<Record<string, any>>(defaultForm);
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (dialogOpen) {
      if (editItem) {
        const sanitized = { ...editItem };
        if (sanitized.data_vencimento) sanitized.data_vencimento = sanitized.data_vencimento.split("T")[0];
        if (sanitized.data_pagamento) sanitized.data_pagamento = sanitized.data_pagamento.split("T")[0];
        setForm({ 
          ...defaultForm, 
          ...sanitized, 
          parcela_atual: editItem.parcela_atual || "", 
          total_parcelas: editItem.total_parcelas || "", 
          recorrencia: editItem.recorrencia || "" 
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [dialogOpen, editItem]);

  // Computed status (overdue check)
  const getStatus = (item: any) => {
    if (item.status === "Pago" || item.status === "Cancelado") return item.status;
    if (item.status === "Pendente" && item.data_vencimento) {
      const datePart = item.data_vencimento.split("T")[0];
      const expiry = parseISO(datePart);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiry < today) return "Atrasado";
    }
    return item.status;
  };

  // All despesas = contas_pagar (unified view)
  const allDespesas = useMemo(() => {
    return contasPagar.map((c) => ({ ...c, _status: getStatus(c) }));
  }, [contasPagar]);

  // Filter by month
  const mesPrefix = mesAtual; // "yyyy-MM"
  const despesasMes = useMemo(() => {
    return allDespesas.filter((d) => d.data_vencimento?.startsWith(mesPrefix));
  }, [allDespesas, mesPrefix]);

  // Apply filters
  const filtered = useMemo(() => {
    return despesasMes.filter((d) => {
      if (search) {
        const s = search.toLowerCase();
        if (!(d.descricao?.toLowerCase().includes(s) || d.fornecedor?.toLowerCase().includes(s) || d.categoria?.toLowerCase().includes(s) || d.centro_custo?.toLowerCase().includes(s)))
          return false;
      }
      if (filtroStatus !== "Todos" && d._status !== filtroStatus) return false;
      if (filtroTipo !== "Todos" && d.tipo_despesa !== filtroTipo) return false;
      if (filtroCategoria !== "Todos" && d.categoria !== filtroCategoria) return false;
      if (filtroForma !== "Todos" && d.forma_pagamento !== filtroForma) return false;
      return true;
    });
  }, [despesasMes, search, filtroStatus, filtroTipo, filtroCategoria, filtroForma]);

  // KPIs
  const totalMes = despesasMes.reduce((s, d) => s + Number(d.valor), 0);
  const totalPago = despesasMes.filter((d) => d._status === "Pago").reduce((s, d) => s + Number(d.valor_pago), 0);
  const totalEmAberto = despesasMes.filter((d) => d._status === "Pendente").reduce((s, d) => s + Number(d.valor), 0);
  const totalAtrasado = despesasMes.filter((d) => d._status === "Atrasado").reduce((s, d) => s + Number(d.valor), 0);
  const totalFixasMes = despesasMes.filter((d) => d.tipo_despesa === "Fixa").reduce((s, d) => s + Number(d.valor), 0);

  // Mutations
  const saveMut = useMutation({
    mutationFn: async (data: any) => {
      const isParcelado = Number(data.total_parcelas) > 1 && !editItem;

      if (isParcelado) {
        const totalParcelas = Number(data.total_parcelas);
        const valorParcela = Number(data.valor) / totalParcelas;
        const baseDate = new Date(data.data_vencimento);
        const inserts = [];

        for (let i = 0; i < totalParcelas; i++) {
          const vencDate = new Date(baseDate);
          vencDate.setMonth(vencDate.getMonth() + i);
          inserts.push({
            user_id: userId,
            descricao: `${data.descricao} (${i + 1}/${totalParcelas})`,
            categoria: data.categoria,
            fornecedor: data.fornecedor || "",
            valor: valorParcela,
            data_vencimento: format(vencDate, "yyyy-MM-dd"),
            forma_pagamento: data.forma_pagamento || "",
            numero_documento: data.numero_documento || "",
            status: "Pendente",
            valor_pago: 0,
            recorrente: false,
            observacoes: data.observacoes || "",
            tipo_despesa: data.tipo_despesa || "Variável",
            parcela_atual: i + 1,
            total_parcelas: totalParcelas,
            centro_custo: data.centro_custo || "",
          });
        }
        const { error } = await supabase.from("contas_pagar").insert(inserts);
        if (error) throw error;
      } else if (data.tipo_despesa === "Fixa" && data.recorrencia && !editItem) {
        // Generate 12 months of entries
        const baseDate = new Date(data.data_vencimento);
        const months = data.recorrencia === "Anual" ? 1 : 12;
        const inserts = [];
        for (let i = 0; i < months; i++) {
          const vencDate = new Date(baseDate);
          if (data.recorrencia === "Anual") {
            // just one entry per year
          } else {
            vencDate.setMonth(vencDate.getMonth() + i);
          }
          inserts.push({
            user_id: userId,
            descricao: data.descricao,
            categoria: data.categoria,
            fornecedor: data.fornecedor || "",
            valor: Number(data.valor),
            data_vencimento: format(vencDate, "yyyy-MM-dd"),
            forma_pagamento: data.forma_pagamento || "",
            numero_documento: data.numero_documento || "",
            status: "Pendente",
            valor_pago: 0,
            recorrente: true,
            observacoes: data.observacoes || "",
            tipo_despesa: "Fixa",
            recorrencia: data.recorrencia,
            centro_custo: data.centro_custo || "",
          });
        }
        const { error } = await supabase.from("contas_pagar").insert(inserts);
        if (error) throw error;
      } else {
        // Single entry or edit
        const payload: any = {
          user_id: userId,
          descricao: data.descricao,
          categoria: data.categoria,
          fornecedor: data.fornecedor || "",
          valor: Number(data.valor),
          data_vencimento: data.data_vencimento,
          forma_pagamento: data.forma_pagamento || "",
          numero_documento: data.numero_documento || "",
          status: data.status || "Pendente",
          valor_pago: Number(data.valor_pago) || 0,
          data_pagamento: data.data_pagamento || null,
          recorrente: data.tipo_despesa === "Fixa",
          recorrencia: data.recorrencia || null,
          tipo_despesa: data.tipo_despesa || "Variável",
          centro_custo: data.centro_custo || "",
        };

        // Sanitizar strings vazias para null
        Object.keys(payload).forEach(key => {
          if (payload[key] === "") payload[key] = null;
        });

        if (editItem?.id) {
          const { error } = await supabase.from("contas_pagar").update(payload).eq("id", editItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("contas_pagar").insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas_pagar"] });
      setDialogOpen(false);
      setEditItem(null);
      toast({ title: "Despesa salva com sucesso!" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contas_pagar").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas_pagar"] });
      toast({ title: "Despesa excluída" });
    },
  });

  const marcarPago = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await supabase.from("contas_pagar").update({
        valor_pago: Number(item.valor), status: "Pago",
        data_pagamento: format(new Date(), "yyyy-MM-dd"),
      }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas_pagar"] });
      toast({ title: "Despesa marcada como paga!" });
    },
  });

  const duplicarMut = useMutation({
    mutationFn: async (item: any) => {
      const { id, created_at, updated_at, ...rest } = item;
      const datePart = item.data_vencimento.split("T")[0];
      const newDate = parseISO(datePart);
      newDate.setMonth(newDate.getMonth() + 1);
      const { error } = await supabase.from("contas_pagar").insert({
        ...rest,
        user_id: userId,
        descricao: `${item.descricao} (cópia)`,
        data_vencimento: format(newDate, "yyyy-MM-dd"),
        status: "Pendente",
        valor_pago: 0,
        data_pagamento: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas_pagar"] });
      toast({ title: "Despesa duplicada para o próximo mês" });
    },
  });

  const activeFilters = [filtroStatus, filtroTipo, filtroCategoria, filtroForma].filter((f) => f !== "Todos").length;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs font-medium">Total do Mês</span></div>
          <p className="text-lg font-bold text-foreground">{BRL(totalMes)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-xs font-medium">Pago</span></div>
          <p className="text-lg font-bold text-green-600">{BRL(totalPago)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4 text-yellow-500" /><span className="text-xs font-medium">Em Aberto</span></div>
          <p className="text-lg font-bold text-yellow-600">{BRL(totalEmAberto)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-xs font-medium">Atrasado</span></div>
          <p className="text-lg font-bold text-red-600">{BRL(totalAtrasado)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Repeat className="h-4 w-4 text-blue-500" /><span className="text-xs font-medium">Fixas do Mês</span></div>
          <p className="text-lg font-bold text-foreground">{BRL(totalFixasMes)}</p>
        </CardContent></Card>
      </div>

      {/* Search + Filters + Add */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Despesas</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar despesa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-52" />
            </div>
            <Button size="sm" variant="outline" onClick={() => setFiltersOpen(!filtersOpen)}>
              <Filter className="h-4 w-4 mr-1" /> Filtros {activeFilters > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{activeFilters}</Badge>}
            </Button>
            <Button size="sm" onClick={() => { setEditItem(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova Despesa
            </Button>
          </div>
        </CardHeader>

        {/* Collapsible Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Fixa">Fixa</SelectItem>
                    <SelectItem value="Variável">Variável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas</SelectItem>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Forma de Pagamento</Label>
                <Select value={filtroForma} onValueChange={setFiltroForma}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas</SelectItem>
                    {FORMAS_PAGAMENTO.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Forma Pgto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <div>
                        {d.descricao}
                        {d.centro_custo && <span className="block text-xs text-muted-foreground">CC: {d.centro_custo}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.tipo_despesa === "Fixa" ? "default" : "outline"} className="text-xs">
                        {d.tipo_despesa === "Fixa" && <Repeat className="h-3 w-3 mr-1" />}
                        {d.tipo_despesa}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline">{d.categoria}</Badge></TableCell>
                    <TableCell className="text-sm">{d.fornecedor}</TableCell>
                    <TableCell className="text-right font-mono">{BRL(Number(d.valor))}</TableCell>
                    <TableCell className="text-sm">{d.data_vencimento ? format(parseISO(d.data_vencimento.split("T")[0]), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell className="text-sm">{d.forma_pagamento}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d._status] || ""}`}>
                        {d._status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {(d._status === "Pendente" || d._status === "Atrasado") && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Marcar como paga"
                            onClick={() => marcarPago.mutate(d)}>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Duplicar para próximo mês"
                          onClick={() => duplicarMut.mutate(d)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar"
                          onClick={() => { setEditItem(d); setDialogOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Excluir"
                          onClick={() => deleteMut.mutate(d.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground font-medium">Nenhuma despesa encontrada</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {search || activeFilters > 0
                          ? "Tente ajustar os filtros ou o termo de busca."
                          : "Clique em \"Nova Despesa\" para cadastrar a primeira."}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{filtered.length} despesa(s) listada(s)</span>
              <span className="text-lg font-bold text-foreground">{BRL(filtered.reduce((s, d) => s + Number(d.valor), 0))}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <Input value={form.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex: Aluguel escritório" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo de Despesa *</Label>
                <Select value={form.tipo_despesa} onValueChange={(v) => set("tipo_despesa", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fixa">Fixa (Recorrente)</SelectItem>
                    <SelectItem value="Variável">Variável (Avulsa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => set("categoria", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.tipo_despesa === "Fixa" && !editItem && (
              <div className="space-y-1">
                <Label>Recorrência</Label>
                <Select value={form.recorrencia || ""} onValueChange={(v) => set("recorrencia", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a recorrência" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mensal">Mensal (gera 12 lançamentos)</SelectItem>
                    <SelectItem value="Anual">Anual (1 lançamento)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Ao salvar, serão criados lançamentos automáticos.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valor Total (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={(e) => set("valor", Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label>Vencimento *</Label>
                <Input type="date" value={form.data_vencimento} onChange={(e) => set("data_vencimento", e.target.value)} />
              </div>
            </div>

            {!editItem && form.tipo_despesa === "Variável" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Parcelas</Label>
                  <Input type="number" min="1" max="60" value={form.total_parcelas}
                    onChange={(e) => set("total_parcelas", e.target.value)}
                    placeholder="1 = à vista" />
                  <p className="text-xs text-muted-foreground">Deixe vazio ou 1 para pagamento único.</p>
                </div>
                {Number(form.total_parcelas) > 1 && (
                  <div className="space-y-1 flex items-center">
                    <p className="text-sm text-muted-foreground">
                      {Number(form.total_parcelas)}x de <span className="font-bold text-foreground">{BRL(Number(form.valor) / Number(form.total_parcelas))}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fornecedor</Label>
                <Input value={form.fornecedor || ""} onChange={(e) => set("fornecedor", e.target.value)} placeholder="Nome do fornecedor" />
              </div>
              <div className="space-y-1">
                <Label>Forma de Pagamento</Label>
                <Select value={form.forma_pagamento || ""} onValueChange={(v) => set("forma_pagamento", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nº Documento / Boleto</Label>
                <Input value={form.numero_documento || ""} onChange={(e) => set("numero_documento", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Centro de Custo</Label>
                <Input value={form.centro_custo || ""} onChange={(e) => set("centro_custo", e.target.value)} placeholder="Ex: Obra X, Projeto Y" />
              </div>
            </div>

            {editItem && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Pago">Pago</SelectItem>
                      <SelectItem value="Parcial">Parcial</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Valor Pago (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_pago} onChange={(e) => set("valor_pago", Number(e.target.value))} />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea value={form.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} rows={2} placeholder="Informações adicionais sobre esta despesa" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || !form.descricao || !form.valor}>
              {editItem ? "Salvar Alterações" : Number(form.total_parcelas) > 1 ? `Criar ${form.total_parcelas} Parcelas` : form.tipo_despesa === "Fixa" && form.recorrencia === "Mensal" ? "Criar 12 Lançamentos" : "Salvar Despesa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
