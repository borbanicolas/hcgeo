import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Percent, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface DRETabProps {
  contasPagar: any[];
  contasReceber: any[];
  despesasFixas: any[];
  mesAtual: string;
}

export function DRETab({ contasPagar, contasReceber, despesasFixas, mesAtual }: DRETabProps) {
  const [periodo, setPeriodo] = useState<"mensal" | "trimestral" | "anual">("mensal");

  const mesStart = startOfMonth(parseISO(mesAtual + "-01"));
  const mesEnd = endOfMonth(mesStart);
  const inMonth = (d: string) => {
    try { return isWithinInterval(parseISO(d), { start: mesStart, end: mesEnd }); }
    catch { return false; }
  };

  const despFixasTotal = despesasFixas.filter((d: any) => d.ativa).reduce((s: number, d: any) => s + Number(d.valor), 0);

  // ── Receitas do mês por categoria/tipo de serviço ──
  const receitasMes = useMemo(() => {
    return contasReceber.filter((c: any) => c.status === "Recebido" && inMonth(c.data_recebimento || c.data_vencimento));
  }, [contasReceber, mesAtual]);

  const totalReceitas = receitasMes.reduce((s: number, c: any) => s + Number(c.valor_recebido), 0);

  const receitasPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    receitasMes.forEach((c: any) => {
      const cat = c.categoria || "Outros";
      map[cat] = (map[cat] || 0) + Number(c.valor_recebido);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [receitasMes]);

  // ── Despesas do mês ──
  const despesasMes = useMemo(() => {
    return contasPagar.filter((c: any) => c.status === "Pago" && inMonth(c.data_pagamento || c.data_vencimento));
  }, [contasPagar, mesAtual]);

  const despFixasMes = despesasMes.filter((d: any) => d.tipo_despesa === "Fixa" || d.recorrente);
  const despVariaveisMes = despesasMes.filter((d: any) => d.tipo_despesa !== "Fixa" && !d.recorrente);
  
  const totalDespFixasPagas = despFixasMes.reduce((s: number, c: any) => s + Number(c.valor_pago), 0);
  const totalDespVariaveis = despVariaveisMes.reduce((s: number, c: any) => s + Number(c.valor_pago), 0);
  const totalDespesas = despesasMes.reduce((s: number, c: any) => s + Number(c.valor_pago), 0);

  // Operacionais vs não-operacionais
  const categoriasOperacionais = ["Combustível", "Manutenção", "Material", "Equipamentos", "Alimentação", "Hospedagem", "Transporte"];
  const despOperacionais = despesasMes.filter((d: any) => categoriasOperacionais.includes(d.categoria));
  const despAdministrativas = despesasMes.filter((d: any) => !categoriasOperacionais.includes(d.categoria));
  const totalOperacionais = despOperacionais.reduce((s: number, c: any) => s + Number(c.valor_pago), 0);
  const totalAdministrativas = despAdministrativas.reduce((s: number, c: any) => s + Number(c.valor_pago), 0);

  const despPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    despesasMes.forEach((c: any) => {
      const cat = c.categoria || "Outros";
      map[cat] = (map[cat] || 0) + Number(c.valor_pago);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [despesasMes]);

  // ── Lucros e margens ──
  const lucroBruto = totalReceitas - totalOperacionais;
  const lucroLiquido = totalReceitas - totalDespesas;
  const margemBruta = totalReceitas > 0 ? (lucroBruto / totalReceitas) * 100 : 0;
  const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

  // ── Evolução (últimos N meses conforme período) ──
  const mesesAtras = periodo === "anual" ? 12 : periodo === "trimestral" ? 3 : 6;

  const evolucaoData = useMemo(() => {
    const data: any[] = [];
    for (let i = mesesAtras - 1; i >= 0; i--) {
      const d = subMonths(parseISO(mesAtual + "-01"), i);
      const mKey = format(d, "yyyy-MM");
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      const inM = (dt: string) => {
        try { return isWithinInterval(parseISO(dt), { start: mStart, end: mEnd }); }
        catch { return false; }
      };

      const rec = contasReceber
        .filter((c: any) => c.status === "Recebido" && inM(c.data_recebimento || c.data_vencimento))
        .reduce((s: number, c: any) => s + Number(c.valor_recebido), 0);

      const despTotal = contasPagar
        .filter((c: any) => c.status === "Pago" && inM(c.data_pagamento || c.data_vencimento))
        .reduce((s: number, c: any) => s + Number(c.valor_pago), 0);

      const despOp = contasPagar
        .filter((c: any) => c.status === "Pago" && inM(c.data_pagamento || c.data_vencimento) && categoriasOperacionais.includes(c.categoria))
        .reduce((s: number, c: any) => s + Number(c.valor_pago), 0);

      data.push({
        mes: format(d, "MMM/yy", { locale: ptBR }),
        Receitas: rec,
        "Custo Operacional": despOp,
        "Lucro Bruto": rec - despOp,
        "Desp. Administrativas": despTotal - despOp,
        "Lucro Líquido": rec - despTotal,
        "Margem Líquida (%)": rec > 0 ? ((rec - despTotal) / rec) * 100 : 0,
      });
    }
    return data;
  }, [contasPagar, contasReceber, mesAtual, mesesAtras]);

  // ── Comparativo com mês anterior ──
  const mesAnteriorStart = startOfMonth(subMonths(mesStart, 1));
  const mesAnteriorEnd = endOfMonth(mesAnteriorStart);
  const inMesAnterior = (d: string) => {
    try { return isWithinInterval(parseISO(d), { start: mesAnteriorStart, end: mesAnteriorEnd }); }
    catch { return false; }
  };
  const receitasAnt = contasReceber.filter((c: any) => c.status === "Recebido" && inMesAnterior(c.data_recebimento || c.data_vencimento)).reduce((s: number, c: any) => s + Number(c.valor_recebido), 0);
  const despesasAnt = contasPagar.filter((c: any) => c.status === "Pago" && inMesAnterior(c.data_pagamento || c.data_vencimento)).reduce((s: number, c: any) => s + Number(c.valor_pago), 0);
  const lucroAnt = receitasAnt - despesasAnt;

  const varReceita = receitasAnt > 0 ? ((totalReceitas - receitasAnt) / receitasAnt) * 100 : null;
  const varDespesa = despesasAnt > 0 ? ((totalDespesas - despesasAnt) / despesasAnt) * 100 : null;
  const varLucro = lucroAnt !== 0 ? ((lucroLiquido - lucroAnt) / Math.abs(lucroAnt)) * 100 : null;

  const Variacao = ({ valor }: { valor: number | null }) => {
    if (valor === null) return <span className="text-xs text-muted-foreground">—</span>;
    const isUp = valor > 0;
    return (
      <span className={`text-xs flex items-center gap-0.5 ${isUp ? "text-green-600" : "text-red-600"}`}>
        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {valor > 0 ? "+" : ""}{valor.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header com seletor de período */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            DRE — {format(mesStart, "MMMM/yyyy", { locale: ptBR })}
          </h2>
          <p className="text-sm text-muted-foreground">Demonstrativo de Resultado do Exercício</p>
        </div>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mensal">Últimos 6 meses</SelectItem>
            <SelectItem value="trimestral">Trimestral</SelectItem>
            <SelectItem value="anual">Anual (12 meses)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium">Receita Bruta</span>
            </div>
            <p className="text-xl font-bold text-green-600">{BRL(totalReceitas)}</p>
            <Variacao valor={varReceita} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">Lucro Bruto</span>
            </div>
            <p className={`text-xl font-bold ${lucroBruto >= 0 ? "text-blue-600" : "text-red-600"}`}>{BRL(lucroBruto)}</p>
            <span className="text-xs text-muted-foreground">Margem: {margemBruta.toFixed(1)}%</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {lucroLiquido >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              <span className="text-xs font-medium">Lucro Líquido</span>
            </div>
            <p className={`text-xl font-bold ${lucroLiquido >= 0 ? "text-green-600" : "text-red-600"}`}>{BRL(lucroLiquido)}</p>
            <Variacao valor={varLucro} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Percent className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium">Margem Líquida</span>
            </div>
            <p className={`text-xl font-bold ${margemLiquida >= 0 ? "text-green-600" : "text-red-600"}`}>{margemLiquida.toFixed(1)}%</p>
            <span className="text-xs text-muted-foreground">Meta saudável: &gt;20%</span>
          </CardContent>
        </Card>
      </div>

      {/* DRE Detalhado */}
      <Card>
        <CardHeader><CardTitle className="text-base">Demonstrativo Detalhado</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* RECEITAS */}
            <div className="flex justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 font-bold">
              <span className="text-foreground">RECEITA BRUTA</span>
              <span className="text-green-600">{BRL(totalReceitas)}</span>
            </div>
            {receitasPorCategoria.map(([cat, val]) => (
              <div key={cat} className="flex justify-between text-sm px-6 py-1.5">
                <span className="text-muted-foreground">{cat}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{totalReceitas > 0 ? ((val / totalReceitas) * 100).toFixed(1) : 0}%</span>
                  <span className="font-mono text-foreground w-28 text-right">{BRL(val)}</span>
                </div>
              </div>
            ))}

            <div className="h-2" />

            {/* CUSTOS OPERACIONAIS */}
            <div className="flex justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 font-bold">
              <span className="text-foreground">(-) CUSTOS OPERACIONAIS</span>
              <span className="text-orange-600">{BRL(totalOperacionais)}</span>
            </div>
            {despPorCategoria.filter(([cat]) => categoriasOperacionais.includes(cat)).map(([cat, val]) => (
              <div key={cat} className="flex justify-between text-sm px-6 py-1.5">
                <span className="text-muted-foreground">{cat}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{totalDespesas > 0 ? ((val / totalDespesas) * 100).toFixed(1) : 0}%</span>
                  <span className="font-mono text-foreground w-28 text-right">{BRL(val)}</span>
                </div>
              </div>
            ))}

            <div className="h-1" />

            {/* LUCRO BRUTO */}
            <div className={`flex justify-between p-3 rounded-lg border ${lucroBruto >= 0 ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20" : "border-red-300 bg-red-50 dark:bg-red-900/20"} font-bold`}>
              <span className="text-foreground">= LUCRO BRUTO</span>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">{margemBruta.toFixed(1)}%</Badge>
                <span className={lucroBruto >= 0 ? "text-blue-600" : "text-red-600"}>{BRL(lucroBruto)}</span>
              </div>
            </div>

            <div className="h-2" />

            {/* DESPESAS ADMINISTRATIVAS */}
            <div className="flex justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 font-bold">
              <span className="text-foreground">(-) DESPESAS ADMINISTRATIVAS</span>
              <span className="text-red-600">{BRL(totalAdministrativas)}</span>
            </div>
            {despPorCategoria.filter(([cat]) => !categoriasOperacionais.includes(cat)).map(([cat, val]) => (
              <div key={cat} className="flex justify-between text-sm px-6 py-1.5">
                <span className="text-muted-foreground">{cat}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{totalDespesas > 0 ? ((val / totalDespesas) * 100).toFixed(1) : 0}%</span>
                  <span className="font-mono text-foreground w-28 text-right">{BRL(val)}</span>
                </div>
              </div>
            ))}

            {/* DESPESAS FIXAS CADASTRADAS */}
            <div className="flex justify-between text-sm px-6 py-1.5 bg-muted/30 rounded">
              <span className="text-muted-foreground italic">Referência: Despesas fixas cadastradas (mensal)</span>
              <span className="font-mono text-muted-foreground">{BRL(despFixasTotal)}</span>
            </div>

            <div className="h-2" />

            {/* Separação Fixas vs Variáveis */}
            <div className="flex justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm font-medium text-foreground">Despesas Fixas (pagas no mês)</span>
              <span className="font-mono text-foreground">{BRL(totalDespFixasPagas)}</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm font-medium text-foreground">Despesas Variáveis</span>
              <span className="font-mono text-foreground">{BRL(totalDespVariaveis)}</span>
            </div>

            <div className="h-2" />

            {/* RESULTADO LÍQUIDO */}
            <div className={`flex justify-between p-4 rounded-lg border-2 ${lucroLiquido >= 0 ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-red-500 bg-red-50 dark:bg-red-900/20"} font-bold`}>
              <span className="text-foreground text-lg">= RESULTADO LÍQUIDO</span>
              <div className="flex items-center gap-3">
                <Badge variant={lucroLiquido >= 0 ? "default" : "destructive"} className="text-xs">
                  {margemLiquida.toFixed(1)}%
                </Badge>
                <span className={`text-lg ${lucroLiquido >= 0 ? "text-green-600" : "text-red-600"}`}>{BRL(lucroLiquido)}</span>
              </div>
            </div>

            {/* Comparativo */}
            {(varReceita !== null || varLucro !== null) && (
              <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Comparativo com mês anterior</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Receitas</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{BRL(receitasAnt)}</span>
                      <Variacao valor={varReceita} />
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Despesas</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{BRL(despesasAnt)}</span>
                      <Variacao valor={varDespesa !== null ? -varDespesa! : null} />
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Lucro</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{BRL(lucroAnt)}</span>
                      <Variacao valor={varLucro} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos de evolução */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução: Receitas x Custos x Lucro</CardTitle></CardHeader>
          <CardContent>
            {evolucaoData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={evolucaoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => BRL(v)} />
                  <Legend />
                  <Bar dataKey="Receitas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Custo Operacional" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Lucro Líquido" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Evolução da Margem Líquida (%)</CardTitle></CardHeader>
          <CardContent>
            {evolucaoData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolucaoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" fontSize={11} />
                  <YAxis fontSize={11} domain={['auto', 'auto']} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Line type="monotone" dataKey="Margem Líquida (%)" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
