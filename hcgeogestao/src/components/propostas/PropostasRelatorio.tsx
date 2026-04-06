import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Target, DollarSign, FileText, Users, BarChart3, ArrowUpRight } from "lucide-react";

const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtShort = (v: number) => {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return fmt(v);
};

const COLORS = [
  "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--success))",
  "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--primary))",
  "hsl(var(--muted-foreground))",
];

export function PropostasRelatorio() {
  const [propostas, setPropostas] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [periodo, setPeriodo] = useState("12");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [pRes, lRes, cRes] = await Promise.all([
        supabase.from("propostas").select("*, clientes(razao_social, nome_fantasia)").order("created_at", { ascending: false }),
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("clientes").select("*"),
      ]);
      setPropostas(pRes.data || []);
      setLeads(lRes.data || []);
      setClientes(cRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const mesesAtras = parseInt(periodo);
  const dataLimite = new Date();
  dataLimite.setMonth(dataLimite.getMonth() - mesesAtras);

  const propostasFiltradas = propostas.filter(
    (p) => new Date(p.created_at) >= dataLimite
  );

  // KPIs
  const totalEnviadas = propostasFiltradas.filter(p => p.status !== "Rascunho").length;
  const totalAprovadas = propostasFiltradas.filter(p => p.status === "Aprovada").length;
  const totalReprovadas = propostasFiltradas.filter(p => p.status === "Reprovada").length;
  const taxaConversao = totalEnviadas > 0 ? (totalAprovadas / totalEnviadas) * 100 : 0;
  const valorTotal = propostasFiltradas.reduce((s, p) => s + (p.valor_total || 0), 0);
  const valorAprovado = propostasFiltradas.filter(p => p.status === "Aprovada").reduce((s, p) => s + (p.valor_total || 0), 0);
  const ticketMedio = propostasFiltradas.length > 0 ? valorTotal / propostasFiltradas.length : 0;
  const ticketMedioAprovado = totalAprovadas > 0 ? valorAprovado / totalAprovadas : 0;

  // Evolução mensal
  const evolucaoMensal = (() => {
    const map: Record<string, { mes: string; enviadas: number; aprovadas: number; reprovadas: number; valor: number; valorAprovado: number }> = {};
    propostasFiltradas.forEach((p) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      if (!map[key]) map[key] = { mes: label, enviadas: 0, aprovadas: 0, reprovadas: 0, valor: 0, valorAprovado: 0 };
      if (p.status !== "Rascunho") map[key].enviadas++;
      if (p.status === "Aprovada") { map[key].aprovadas++; map[key].valorAprovado += p.valor_total || 0; }
      if (p.status === "Reprovada") map[key].reprovadas++;
      map[key].valor += p.valor_total || 0;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  })();

  // Por tipo de serviço
  const porServico = (() => {
    const map: Record<string, { tipo: string; total: number; aprovadas: number; valor: number; valorAprovado: number }> = {};
    propostasFiltradas.forEach((p) => {
      const tipo = p.tipo_servico || "Não definido";
      if (!map[tipo]) map[tipo] = { tipo, total: 0, aprovadas: 0, valor: 0, valorAprovado: 0 };
      map[tipo].total++;
      map[tipo].valor += p.valor_total || 0;
      if (p.status === "Aprovada") { map[tipo].aprovadas++; map[tipo].valorAprovado += p.valor_total || 0; }
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor);
  })();

  // Por status (pie)
  const porStatus = (() => {
    const map: Record<string, number> = {};
    propostasFiltradas.forEach((p) => { map[p.status] = (map[p.status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // Top clientes
  const topClientes = (() => {
    const map: Record<string, { nome: string; propostas: number; aprovadas: number; valor: number; valorAprovado: number }> = {};
    propostasFiltradas.forEach((p) => {
      const nome = p.contratante_nome || p.clientes?.razao_social || "Sem cliente";
      if (!map[nome]) map[nome] = { nome, propostas: 0, aprovadas: 0, valor: 0, valorAprovado: 0 };
      map[nome].propostas++;
      map[nome].valor += p.valor_total || 0;
      if (p.status === "Aprovada") { map[nome].aprovadas++; map[nome].valorAprovado += p.valor_total || 0; }
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  })();

  // Leads → Propostas
  const leadsAnalise = (() => {
    const leadsComProposta = leads.filter((l) =>
      propostas.some((p) => p.lead_id === l.id)
    );
    const leadsConvertidos = leads.filter((l) =>
      propostas.some((p) => p.lead_id === l.id && p.status === "Aprovada")
    );
    const taxaLeadProposta = leads.length > 0 ? (leadsComProposta.length / leads.length) * 100 : 0;
    const taxaLeadConversao = leads.length > 0 ? (leadsConvertidos.length / leads.length) * 100 : 0;

    // Por status do lead
    const porStatusLead: Record<string, { status: string; total: number; comProposta: number }> = {};
    leads.forEach((l) => {
      if (!porStatusLead[l.status]) porStatusLead[l.status] = { status: l.status, total: 0, comProposta: 0 };
      porStatusLead[l.status].total++;
      if (propostas.some((p) => p.lead_id === l.id)) porStatusLead[l.status].comProposta++;
    });

    return {
      totalLeads: leads.length,
      comProposta: leadsComProposta.length,
      convertidos: leadsConvertidos.length,
      taxaLeadProposta,
      taxaLeadConversao,
      porStatus: Object.values(porStatusLead),
    };
  })();

  // Insights automáticos
  const insights = (() => {
    const list: string[] = [];
    if (porServico.length > 0) {
      const top = porServico[0];
      list.push(`📊 "${top.tipo}" é o serviço com maior volume (${top.total} propostas, ${fmt(top.valor)} total).`);
      const melhorConversao = porServico.reduce((best, s) => {
        const rate = s.total > 0 ? s.aprovadas / s.total : 0;
        const bestRate = best.total > 0 ? best.aprovadas / best.total : 0;
        return rate > bestRate ? s : best;
      }, porServico[0]);
      if (melhorConversao.total >= 2) {
        const rate = ((melhorConversao.aprovadas / melhorConversao.total) * 100).toFixed(0);
        list.push(`✅ Melhor taxa de conversão: "${melhorConversao.tipo}" com ${rate}%.`);
      }
    }
    if (topClientes.length > 0 && topClientes[0].aprovadas > 0) {
      list.push(`👤 Cliente com maior faturamento: "${topClientes[0].nome}" (${fmt(topClientes[0].valorAprovado)} aprovados).`);
    }
    if (taxaConversao > 0) {
      if (taxaConversao >= 50) list.push(`🎯 Taxa de conversão de ${taxaConversao.toFixed(0)}% está excelente!`);
      else if (taxaConversao >= 30) list.push(`🎯 Taxa de conversão de ${taxaConversao.toFixed(0)}% está boa. Potencial de melhoria no follow-up.`);
      else list.push(`⚠️ Taxa de conversão de ${taxaConversao.toFixed(0)}% está abaixo do ideal. Revisar abordagem comercial.`);
    }
    if (leadsAnalise.totalLeads > 0 && leadsAnalise.taxaLeadProposta < 30) {
      list.push(`📋 Apenas ${leadsAnalise.taxaLeadProposta.toFixed(0)}% dos leads geraram propostas. Avaliar qualificação dos leads.`);
    }
    return list;
  })();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Relatório de Propostas</h2>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
            <SelectItem value="24">Últimos 24 meses</SelectItem>
            <SelectItem value="120">Tudo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <FileText className="h-3.5 w-3.5" /> PROPOSTAS ENVIADAS
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{totalEnviadas}</p>
            <p className="text-xs text-muted-foreground">{totalAprovadas} aprovadas · {totalReprovadas} reprovadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Target className="h-3.5 w-3.5" /> TAXA DE CONVERSÃO
            </div>
            <p className={`text-2xl font-bold mt-1 ${taxaConversao >= 50 ? "text-success" : taxaConversao >= 30 ? "text-warning" : "text-destructive"}`}>
              {taxaConversao.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Aprovadas / Enviadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <DollarSign className="h-3.5 w-3.5" /> VALOR TOTAL
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{fmtShort(valorTotal)}</p>
            <p className="text-xs text-success">{fmtShort(valorAprovado)} aprovados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <BarChart3 className="h-3.5 w-3.5" /> TICKET MÉDIO
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{fmtShort(ticketMedio)}</p>
            <p className="text-xs text-muted-foreground">Aprovados: {fmtShort(ticketMedioAprovado)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Insights Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {insights.map((ins, i) => (
              <p key={i} className="text-sm text-muted-foreground">{ins}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Gráficos Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Evolução mensal */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {evolucaoMensal.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={evolucaoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="enviadas" name="Enviadas" stroke="hsl(var(--info))" fill="hsl(var(--info) / 0.2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="aprovadas" name="Aprovadas" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="reprovadas" name="Reprovadas" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {porStatus.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={porStatus} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {porStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance por tipo de serviço */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Performance por Tipo de Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          {porServico.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Sem dados</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={porServico} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="tipo" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={140} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => fmt(value)}
                  />
                  <Legend />
                  <Bar dataKey="valor" name="Valor Total" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="valorAprovado" name="Valor Aprovado" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Serviço</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium">Propostas</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium">Aprovadas</th>
                      <th className="text-center py-2 px-2 text-muted-foreground font-medium">Conversão</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Valor Total</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porServico.map((s) => (
                      <tr key={s.tipo} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium text-foreground">{s.tipo}</td>
                        <td className="text-center py-2 px-2">{s.total}</td>
                        <td className="text-center py-2 px-2 text-success">{s.aprovadas}</td>
                        <td className="text-center py-2 px-2">
                          <Badge variant="outline" className={
                            s.total > 0 && (s.aprovadas / s.total) >= 0.5
                              ? "bg-success/15 text-success border-success/30"
                              : s.total > 0 && (s.aprovadas / s.total) >= 0.3
                              ? "bg-warning/15 text-warning border-warning/30"
                              : "bg-destructive/15 text-destructive border-destructive/30"
                          }>
                            {s.total > 0 ? ((s.aprovadas / s.total) * 100).toFixed(0) : 0}%
                          </Badge>
                        </td>
                        <td className="text-right py-2 px-2">{fmt(s.valor)}</td>
                        <td className="text-right py-2 px-2 text-muted-foreground">{fmt(s.total > 0 ? s.valor / s.total : 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Gráficos Row 2: Leads & Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Análise de Leads */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-info" /> Funil de Leads → Propostas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold text-foreground">{leadsAnalise.totalLeads}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-info/10">
                <p className="text-2xl font-bold text-info">{leadsAnalise.comProposta}</p>
                <p className="text-xs text-muted-foreground">Com Proposta</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-success/10">
                <p className="text-2xl font-bold text-success">{leadsAnalise.convertidos}</p>
                <p className="text-xs text-muted-foreground">Convertidos</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lead → Proposta</span>
                <span className="font-medium">{leadsAnalise.taxaLeadProposta.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-info h-2 rounded-full transition-all" style={{ width: `${Math.min(leadsAnalise.taxaLeadProposta, 100)}%` }} />
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Lead → Conversão</span>
                <span className="font-medium">{leadsAnalise.taxaLeadConversao.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-success h-2 rounded-full transition-all" style={{ width: `${Math.min(leadsAnalise.taxaLeadConversao, 100)}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Clientes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" /> Top Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topClientes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Sem dados</p>
            ) : (
              <div className="space-y-2">
                {topClientes.slice(0, 7).map((c, i) => (
                  <div key={c.nome} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.propostas} proposta{c.propostas !== 1 ? "s" : ""} · {c.aprovadas} aprovada{c.aprovadas !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">{fmtShort(c.valor)}</p>
                      {c.valorAprovado > 0 && <p className="text-xs text-success">{fmtShort(c.valorAprovado)} aprov.</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evolução de valor mensal */}
      {evolucaoMensal.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolução do Valor Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => fmtShort(v)} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => fmt(value)}
                />
                <Legend />
                <Area type="monotone" dataKey="valor" name="Valor Total" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.15)" strokeWidth={2} />
                <Area type="monotone" dataKey="valorAprovado" name="Valor Aprovado" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
