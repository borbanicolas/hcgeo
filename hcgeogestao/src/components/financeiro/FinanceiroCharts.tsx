import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COLORS = [
  "hsl(142, 71%, 45%)", "hsl(0, 84%, 60%)", "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)", "hsl(280, 67%, 60%)", "hsl(172, 66%, 50%)",
  "hsl(330, 80%, 60%)", "hsl(45, 93%, 47%)", "hsl(200, 80%, 50%)",
];

interface ChartProps {
  contasPagar: any[];
  contasReceber: any[];
  despesasFixas: any[];
  mesAtual: string;
}

export function DREChart({ contasPagar, contasReceber }: ChartProps) {
  const data = useMemo(() => {
    const months: Record<string, { receitas: number; despesas: number; lucro: number }> = {};
    contasReceber.filter((c: any) => c.status === "Recebido").forEach((c: any) => {
      const m = c.data_recebimento?.slice(0, 7) || c.data_vencimento?.slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { receitas: 0, despesas: 0, lucro: 0 };
      months[m].receitas += Number(c.valor_recebido);
    });
    contasPagar.filter((c: any) => c.status === "Pago").forEach((c: any) => {
      const m = c.data_pagamento?.slice(0, 7) || c.data_vencimento?.slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { receitas: 0, despesas: 0, lucro: 0 };
      months[m].despesas += Number(c.valor_pago);
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([mes, v]) => ({
        mes: mes.slice(5) + "/" + mes.slice(2, 4),
        Receitas: v.receitas,
        Despesas: v.despesas,
        Lucro: v.receitas - v.despesas,
      }));
  }, [contasPagar, contasReceber]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Evolução Receitas x Despesas</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => BRL(v)} />
              <Legend />
              <Bar dataKey="Receitas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Lucro" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function DespesasPieChart({ contasPagar, mesAtual }: { contasPagar: any[]; mesAtual: string }) {
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    contasPagar.forEach((c: any) => {
      if (c.data_vencimento?.startsWith(mesAtual)) {
        map[c.categoria] = (map[c.categoria] || 0) + Number(c.valor);
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [contasPagar, mesAtual]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Despesas por Categoria</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => BRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function ReceitasPieChart({ contasReceber, mesAtual }: { contasReceber: any[]; mesAtual: string }) {
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    contasReceber.forEach((c: any) => {
      if (c.data_vencimento?.startsWith(mesAtual)) {
        map[c.categoria] = (map[c.categoria] || 0) + Number(c.valor);
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [contasReceber, mesAtual]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Receitas por Categoria</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => BRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function DespesasFixasVsVariaveisChart({ contasPagar, despesasFixas, mesAtual }: { contasPagar: any[]; despesasFixas: any[]; mesAtual: string }) {
  const fixas = despesasFixas.filter((d: any) => d.ativa).reduce((s: number, d: any) => s + Number(d.valor), 0);
  const variaveis = contasPagar
    .filter((c: any) => c.data_vencimento?.startsWith(mesAtual) && !c.recorrente)
    .reduce((s: number, c: any) => s + Number(c.valor), 0);

  const data = [
    { name: "Fixas", value: fixas },
    { name: "Variáveis", value: variaveis },
  ].filter((d) => d.value > 0);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Fixas vs Variáveis</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
                <Cell fill="hsl(38, 92%, 50%)" />
                <Cell fill="hsl(280, 67%, 60%)" />
              </Pie>
              <Tooltip formatter={(v: number) => BRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function FluxoCaixaChart({ contasPagar, contasReceber }: { contasPagar: any[]; contasReceber: any[] }) {
  const data = useMemo(() => {
    const months: Record<string, { entrada: number; saida: number }> = {};
    contasReceber.forEach((c: any) => {
      const m = c.data_vencimento?.slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { entrada: 0, saida: 0 };
      months[m].entrada += Number(c.valor);
    });
    contasPagar.forEach((c: any) => {
      const m = c.data_vencimento?.slice(0, 7);
      if (!m) return;
      if (!months[m]) months[m] = { entrada: 0, saida: 0 };
      months[m].saida += Number(c.valor);
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([mes, v]) => ({
        mes: mes.slice(5) + "/" + mes.slice(2, 4),
        Entradas: v.entrada,
        Saídas: v.saida,
        Saldo: v.entrada - v.saida,
      }));
  }, [contasPagar, contasReceber]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Fluxo de Caixa (últimos 6 meses)</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => BRL(v)} />
              <Legend />
              <Line type="monotone" dataKey="Entradas" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Saídas" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Saldo" stroke="hsl(217, 91%, 60%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
