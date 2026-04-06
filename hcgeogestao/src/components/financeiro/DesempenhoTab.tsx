import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, FileText, CheckCircle,
  ArrowUpRight, ArrowDownRight, Minus, Trophy, AlertCircle,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO, isWithinInterval, eachWeekOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface DesempenhoTabProps {
  userId: string;
}

export function DesempenhoTab({ userId }: DesempenhoTabProps) {
  const [metaMensal, setMetaMensal] = useState(() => {
    const saved = localStorage.getItem("hcgeo_meta_mensal");
    return saved ? Number(saved) : 50000;
  });

  // Fetch ALL propostas (not just approved)
  const { data: todasPropostas = [] } = useQuery({
    queryKey: ["propostas_todas", userId],
    queryFn: async () => {
      const { data } = await supabase.from("propostas").select("*").order("data_emissao", { ascending: true });
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

  // ── Monthly data (last 12 months) ──
  const monthlyData = useMemo(() => {
    const months: {
      mes: string;
      label: string;
      enviadas: number;
      valorEnviado: number;
      fechadas: number;
      valorFechado: number;
      perdidas: number;
      taxaConversao: number;
      receitaRealizada: number;
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const mesKey = format(d, "yyyy-MM");
      const label = format(d, "MMM/yy", { locale: ptBR });
      const start = startOfMonth(d);
      const end = endOfMonth(d);

      const enviadas = todasPropostas.filter((p: any) => {
        try { return isWithinInterval(parseISO(p.data_emissao), { start, end }); }
        catch { return false; }
      });

      const fechadas = enviadas.filter((p: any) => p.status === "Aprovada");
      const perdidas = enviadas.filter((p: any) => p.status === "Rejeitada" || p.status === "Cancelada");

      const valorEnviado = enviadas.reduce((s: number, p: any) => s + Number(p.valor_total || 0), 0);
      const valorFechado = fechadas.reduce((s: number, p: any) => s + Number(p.valor_total || 0), 0);

      const receitaRealizada = contasReceber
        .filter((c: any) => c.status === "Recebido" && c.data_recebimento?.startsWith(mesKey))
        .reduce((s: number, c: any) => s + Number(c.valor_recebido || 0), 0);

      months.push({
        mes: mesKey,
        label,
        enviadas: enviadas.length,
        valorEnviado,
        fechadas: fechadas.length,
        valorFechado,
        perdidas: perdidas.length,
        taxaConversao: enviadas.length > 0 ? (fechadas.length / enviadas.length) * 100 : 0,
        receitaRealizada,
      });
    }
    return months;
  }, [todasPropostas, contasReceber]);

  // ── Weekly data (last 8 weeks) ──
  const weeklyData = useMemo(() => {
    const now = new Date();
    const start8w = subMonths(now, 2);
    const weeks = eachWeekOfInterval({ start: start8w, end: now }, { weekStartsOn: 1 });

    return weeks.slice(-8).map((weekStart) => {
      const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const label = format(weekStart, "dd/MM", { locale: ptBR });

      const enviadas = todasPropostas.filter((p: any) => {
        try { return isWithinInterval(parseISO(p.data_emissao), { start: weekStart, end: wEnd }); }
        catch { return false; }
      });

      const valorEnviado = enviadas.reduce((s: number, p: any) => s + Number(p.valor_total || 0), 0);

      return { label, enviadas: enviadas.length, valorEnviado };
    });
  }, [todasPropostas]);

  // ── Current month KPIs ──
  const currentMonth = format(new Date(), "yyyy-MM");
  const mesAtual = monthlyData.find((m) => m.mes === currentMonth);
  const mesAnterior = monthlyData.find((m) => m.mes === format(subMonths(new Date(), 1), "yyyy-MM"));

  const crescimentoValor = mesAtual && mesAnterior && mesAnterior.valorFechado > 0
    ? ((mesAtual.valorFechado - mesAnterior.valorFechado) / mesAnterior.valorFechado) * 100
    : null;

  const crescimentoQtd = mesAtual && mesAnterior && mesAnterior.fechadas > 0
    ? ((mesAtual.fechadas - mesAnterior.fechadas) / mesAnterior.fechadas) * 100
    : null;

  const progressoMeta = metaMensal > 0 && mesAtual ? (mesAtual.valorFechado / metaMensal) * 100 : 0;

  // ── Totals ──
  const totalEnviadas = todasPropostas.length;
  const totalFechadas = todasPropostas.filter((p: any) => p.status === "Aprovada").length;
  const taxaGeralConversao = totalEnviadas > 0 ? (totalFechadas / totalEnviadas) * 100 : 0;
  const ticketMedio = totalFechadas > 0
    ? todasPropostas.filter((p: any) => p.status === "Aprovada").reduce((s: number, p: any) => s + Number(p.valor_total || 0), 0) / totalFechadas
    : 0;

  // ── By service type ──
  const byTipoServico = useMemo(() => {
    const map: Record<string, { enviadas: number; fechadas: number; valor: number }> = {};
    todasPropostas.forEach((p: any) => {
      const tipo = p.tipo_servico || "Outros";
      if (!map[tipo]) map[tipo] = { enviadas: 0, fechadas: 0, valor: 0 };
      map[tipo].enviadas++;
      if (p.status === "Aprovada") {
        map[tipo].fechadas++;
        map[tipo].valor += Number(p.valor_total || 0);
      }
    });
    return Object.entries(map)
      .map(([tipo, v]) => ({ tipo, ...v, conversao: v.enviadas > 0 ? (v.fechadas / v.enviadas) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor);
  }, [todasPropostas]);

  const handleMetaChange = (val: number) => {
    setMetaMensal(val);
    localStorage.setItem("hcgeo_meta_mensal", String(val));
  };

  const GrowthIndicator = ({ value }: { value: number | null }) => {
    if (value === null) return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> s/ ref.</span>;
    if (value > 0) return <span className="text-xs text-green-600 flex items-center gap-1"><ArrowUpRight className="h-3 w-3" /> +{value.toFixed(1)}%</span>;
    if (value < 0) return <span className="text-xs text-red-600 flex items-center gap-1"><ArrowDownRight className="h-3 w-3" /> {value.toFixed(1)}%</span>;
    return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" /> 0%</span>;
  };

  return (
    <div className="space-y-6">
      {/* Meta input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Meta Mensal de Fechamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Meta (R$):</Label>
              <Input
                type="number"
                value={metaMensal}
                onChange={(e) => handleMetaChange(Number(e.target.value))}
                className="w-40"
                step="1000"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Progresso mês atual</span>
                <span className="font-bold">{progressoMeta.toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressoMeta >= 100 ? "bg-green-500" : progressoMeta >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(progressoMeta, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Fechado: {BRL(mesAtual?.valorFechado || 0)}</span>
                <span>Meta: {BRL(metaMensal)}</span>
              </div>
            </div>
            {progressoMeta >= 100 && (
              <div className="flex items-center gap-1 text-green-600">
                <Trophy className="h-5 w-5" />
                <span className="text-sm font-bold">Meta batida!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Propostas Enviadas (mês)</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{mesAtual?.enviadas || 0}</p>
            <p className="text-xs text-muted-foreground">{BRL(mesAtual?.valorEnviado || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium">Fechadas (mês)</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{mesAtual?.fechadas || 0}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{BRL(mesAtual?.valorFechado || 0)}</span>
              <GrowthIndicator value={crescimentoValor} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">Taxa de Conversão</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{(mesAtual?.taxaConversao || 0).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Geral: {taxaGeralConversao.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{BRL(ticketMedio)}</p>
            <p className="text-xs text-muted-foreground">{totalFechadas} proposta(s) fechada(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly evolution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução Mensal — Propostas Fechadas (R$)</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.filter((m) => m.valorFechado > 0 || m.valorEnviado > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => BRL(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="valorFechado" name="Fechado" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} strokeWidth={2} />
                  <Area type="monotone" dataKey="valorEnviado" name="Enviado" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly quantity */}
        <Card>
          <CardHeader><CardTitle className="text-base">Propostas Enviadas vs Fechadas (qtd)</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.filter((m) => m.enviadas > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="enviadas" name="Enviadas" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fechadas" name="Fechadas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="perdidas" name="Perdidas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly volume */}
        <Card>
          <CardHeader><CardTitle className="text-base">Volume Semanal de Propostas</CardTitle></CardHeader>
          <CardContent>
            {weeklyData.filter((w) => w.enviadas > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip formatter={(v: number, name: string) => name === "valorEnviado" ? BRL(v) : v} />
                  <Legend />
                  <Bar dataKey="enviadas" name="Qtd Enviadas" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Conversion rate trend */}
        <Card>
          <CardHeader><CardTitle className="text-base">Taxa de Conversão Mensal (%)</CardTitle></CardHeader>
          <CardContent>
            {monthlyData.filter((m) => m.enviadas > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Line type="monotone" dataKey="taxaConversao" name="Conversão" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By service type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" /> Desempenho por Tipo de Serviço
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byTipoServico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Tipo de Serviço</th>
                    <th className="text-center py-2 px-3 font-medium">Enviadas</th>
                    <th className="text-center py-2 px-3 font-medium">Fechadas</th>
                    <th className="text-center py-2 px-3 font-medium">Conversão</th>
                    <th className="text-right py-2 px-3 font-medium">Valor Fechado</th>
                  </tr>
                </thead>
                <tbody>
                  {byTipoServico.map((item) => (
                    <tr key={item.tipo} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{item.tipo}</td>
                      <td className="py-2 px-3 text-center">{item.enviadas}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={item.fechadas > 0 ? "default" : "outline"}>{item.fechadas}</Badge>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${item.conversao >= 50 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : item.conversao >= 25 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                          {item.conversao.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{BRL(item.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Análise & Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Growth status */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-semibold text-sm text-foreground">📈 Crescimento</h4>
              {crescimentoValor !== null ? (
                <p className="text-sm text-muted-foreground">
                  {crescimentoValor > 0
                    ? `Crescimento de ${crescimentoValor.toFixed(1)}% em valor de propostas fechadas vs mês anterior. Continue assim!`
                    : crescimentoValor < 0
                    ? `Queda de ${Math.abs(crescimentoValor).toFixed(1)}% em valor de propostas fechadas. Verifique o pipeline de leads e o follow-up comercial.`
                    : "Valor de propostas fechadas estável em relação ao mês anterior."
                  }
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Sem dados comparativos suficientes ainda.</p>
              )}
            </div>

            {/* Conversion analysis */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-semibold text-sm text-foreground">🎯 Conversão</h4>
              <p className="text-sm text-muted-foreground">
                {taxaGeralConversao >= 50
                  ? `Taxa geral de ${taxaGeralConversao.toFixed(0)}% — excelente! Mantenha a qualidade das propostas.`
                  : taxaGeralConversao >= 25
                  ? `Taxa geral de ${taxaGeralConversao.toFixed(0)}% — boa, mas há espaço para melhoria. Revise propostas perdidas para identificar padrões.`
                  : `Taxa geral de ${taxaGeralConversao.toFixed(0)}% — abaixo do ideal. Revise precificação, escopo e qualidade das propostas enviadas.`
                }
              </p>
            </div>

            {/* Best service */}
            {byTipoServico.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <h4 className="font-semibold text-sm text-foreground">🏆 Melhor Serviço</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>{byTipoServico[0].tipo}</strong> é o serviço com maior faturamento ({BRL(byTipoServico[0].valor)}) com taxa de conversão de {byTipoServico[0].conversao.toFixed(0)}%.
                </p>
              </div>
            )}

            {/* Volume */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-semibold text-sm text-foreground">📊 Volume</h4>
              <p className="text-sm text-muted-foreground">
                Ticket médio de {BRL(ticketMedio)} por proposta fechada. Total de {totalEnviadas} propostas enviadas, {totalFechadas} fechadas no período.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
