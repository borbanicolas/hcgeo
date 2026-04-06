import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  FileText,
  HardHat,
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
  PackageOpen,
  PackageMinus,
} from "lucide-react";

interface DocAlert {
  tipo: string;
  colaboradorNome: string;
  dataValidade: string;
  diasRestantes: number;
}

interface PropostaVencendo {
  titulo: string;
  numero: string;
  dataVencimento: string;
  diasRestantes: number;
}

interface PendenteDevolucao {
  itemNome: string;
  retiradoPor: string;
  destino: string;
  dataSaida: string;
  quantidade: number;
}

interface EstoqueBaixo {
  nome: string;
  quantidade: number;
  quantidadeMinima: number;
  unidade: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [leadsAtivos, setLeadsAtivos] = useState(0);
  const [pipeline, setPipeline] = useState(0);
  const [propostasAbertas, setPropostasAbertas] = useState(0);
  const [propostasAprovadas, setPropostasAprovadas] = useState(0);
  const [obrasAndamento, setObrasAndamento] = useState(0);
  const [funil, setFunil] = useState({ qualificado: 0, proposta: 0, negociacao: 0, ganho: 0 });
  const [docAlerts, setDocAlerts] = useState<DocAlert[]>([]);
  const [propostasVencendo, setPropostasVencendo] = useState<PropostaVencendo[]>([]);
  const [pendentesDevolucao, setPendentesDevolucao] = useState<PendenteDevolucao[]>([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState<EstoqueBaixo[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const hoje = new Date();

    const [leadsRes, propostasRes, obrasRes] = await Promise.all([
      supabase.from("leads").select("status, valor_estimado"),
      supabase.from("propostas").select("status, data_emissao, validade_dias, titulo, numero"),
      supabase.from("obras").select("status"),
    ]);

    const leads = leadsRes.data || [];
    const ativos = leads.filter((l) => l.status !== "Perdido");
    setLeadsAtivos(ativos.length);
    setPipeline(ativos.reduce((sum, l) => sum + (l.valor_estimado || 0), 0));

    const statusMap: Record<string, string> = {
      Qualificado: "qualificado",
      "Proposta Enviada": "proposta",
      "Negociação": "negociacao",
      Ganho: "ganho",
    };
    const f = { qualificado: 0, proposta: 0, negociacao: 0, ganho: 0 };
    leads.forEach((l) => {
      const key = statusMap[l.status];
      if (key) f[key as keyof typeof f]++;
    });
    setFunil(f);

    const propostas = propostasRes.data || [];
    setPropostasAbertas(propostas.filter((p) => p.status === "Enviada" || p.status === "Em Análise").length);
    setPropostasAprovadas(propostas.filter((p) => p.status === "Aprovada").length);

    const pv: PropostaVencendo[] = [];
    propostas.forEach((p) => {
      if (p.status === "Enviada" || p.status === "Em Análise") {
        const venc = addDays(new Date(p.data_emissao + "T12:00:00"), p.validade_dias);
        const dias = differenceInDays(venc, hoje);
        if (dias <= 15) {
          pv.push({ titulo: p.titulo, numero: p.numero, dataVencimento: format(venc, "dd/MM/yyyy"), diasRestantes: dias });
        }
      }
    });
    pv.sort((a, b) => a.diasRestantes - b.diasRestantes);
    setPropostasVencendo(pv);

    const obras = obrasRes.data || [];
    setObrasAndamento(obras.filter((o) => o.status === "Em Andamento").length);

    const [colabRes, asosRes, nrsRes, episRes] = await Promise.all([
      supabase.from("colaboradores").select("id, nome"),
      supabase.from("colaborador_asos").select("colaborador_id, data_validade, tipo"),
      supabase.from("colaborador_nrs").select("colaborador_id, data_validade, norma"),
      supabase.from("colaborador_epis").select("colaborador_id, data_validade, equipamento"),
    ]);

    const nomeMap = new Map<string, string>();
    (colabRes.data || []).forEach((c) => nomeMap.set(c.id, c.nome));

    const alerts: DocAlert[] = [];

    (asosRes.data || []).forEach((a) => {
      if (!a.data_validade) return;
      const dias = differenceInDays(new Date(a.data_validade + "T12:00:00"), hoje);
      if (dias <= 30) {
        alerts.push({ tipo: `ASO ${a.tipo}`, colaboradorNome: nomeMap.get(a.colaborador_id) || "—", dataValidade: format(new Date(a.data_validade + "T12:00:00"), "dd/MM/yyyy"), diasRestantes: dias });
      }
    });

    (nrsRes.data || []).forEach((n) => {
      if (!n.data_validade) return;
      const dias = differenceInDays(new Date(n.data_validade + "T12:00:00"), hoje);
      if (dias <= 30) {
        alerts.push({ tipo: `NR ${n.norma}`, colaboradorNome: nomeMap.get(n.colaborador_id) || "—", dataValidade: format(new Date(n.data_validade + "T12:00:00"), "dd/MM/yyyy"), diasRestantes: dias });
      }
    });

    (episRes.data || []).forEach((e) => {
      if (!e.data_validade) return;
      const dias = differenceInDays(new Date(e.data_validade + "T12:00:00"), hoje);
      if (dias <= 30) {
        alerts.push({ tipo: `EPI ${e.equipamento}`, colaboradorNome: nomeMap.get(e.colaborador_id) || "—", dataValidade: format(new Date(e.data_validade + "T12:00:00"), "dd/MM/yyyy"), diasRestantes: dias });
      }
    });

    // Fetch estoque data (pendentes + estoque baixo)
    const [estoqueRes, saidasRes] = await Promise.all([
      supabase.from("estoque").select("id, nome, quantidade, quantidade_minima, unidade"),
      supabase.from("estoque_saidas").select("estoque_id, retirado_por, destino, data_saida, quantidade, devolvido, tipo_saida").eq("devolvido", false).eq("tipo_saida", "Retornável"),
    ]);

    const estoqueItems = estoqueRes.data || [];
    const estoqueMap = new Map<string, string>();
    estoqueItems.forEach((e) => estoqueMap.set(e.id, e.nome));

    const pendentes: PendenteDevolucao[] = (saidasRes.data || []).map((s) => ({
      itemNome: estoqueMap.get(s.estoque_id) || "—",
      retiradoPor: s.retirado_por,
      destino: s.destino || "",
      dataSaida: format(new Date(s.data_saida + "T12:00:00"), "dd/MM/yyyy"),
      quantidade: s.quantidade,
    }));
    setPendentesDevolucao(pendentes);

    const baixo: EstoqueBaixo[] = estoqueItems
      .filter((e) => e.quantidade <= e.quantidade_minima)
      .map((e) => ({ nome: e.nome, quantidade: e.quantidade, quantidadeMinima: e.quantidade_minima, unidade: e.unidade }));
    setEstoqueBaixo(baixo);

    alerts.sort((a, b) => a.diasRestantes - b.diasRestantes);
    setDocAlerts(alerts);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  const getUrgencyBadge = (dias: number) => {
    if (dias < 0) return <Badge variant="destructive">Vencido</Badge>;
    if (dias <= 15) return <Badge className="bg-orange-500 text-white border-0">Vence em {dias}d</Badge>;
    return <Badge className="bg-yellow-500 text-white border-0">Vence em {dias}d</Badge>;
  };

  const stats = [
    { label: "Leads Ativos", value: String(leadsAtivos), icon: Users, color: "text-info", path: "/leads" },
    { label: "Pipeline", value: formatCurrency(pipeline), icon: TrendingUp, color: "text-accent", path: "/leads" },
    { label: "Propostas Abertas", value: String(propostasAbertas), icon: FileText, color: "text-pipeline-proposta", path: "/propostas" },
    { label: "Propostas Aprovadas", value: String(propostasAprovadas), icon: CheckCircle2, color: "text-success", path: "/propostas" },
    { label: "Obras em Andamento", value: String(obrasAndamento), icon: HardHat, color: "text-success", path: "/obras" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do seu negócio</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="stat-card cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all"
              onClick={() => navigate(stat.path)}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`h-5 w-5 ${stat.color}`} />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Sections */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Documentos Vencendo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="stat-card cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all"
          onClick={() => navigate("/colaboradores")}
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold text-foreground">Documentos Vencendo</h2>
            {docAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-auto text-[10px]">{docAlerts.length}</Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </div>
          {docAlerts.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Nenhum documento próximo do vencimento
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {docAlerts.map((alert, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{alert.colaboradorNome}</p>
                    <p className="text-xs text-muted-foreground">{alert.tipo} — {alert.dataValidade}</p>
                  </div>
                  {getUrgencyBadge(alert.diasRestantes)}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Propostas vencendo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="stat-card cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all"
          onClick={() => navigate("/propostas")}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold text-foreground">Propostas Vencendo</h2>
            {propostasVencendo.length > 0 && (
              <Badge variant="destructive" className="ml-auto text-[10px]">{propostasVencendo.length}</Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </div>
          {propostasVencendo.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Nenhuma proposta vencendo
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {propostasVencendo.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{p.titulo}</p>
                    <p className="text-xs text-muted-foreground">{p.numero} — {p.dataVencimento}</p>
                  </div>
                  {getUrgencyBadge(p.diasRestantes)}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Estoque alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Materiais pendentes de devolução */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="stat-card cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all"
          onClick={() => navigate("/estoque")}
        >
          <div className="flex items-center gap-2 mb-4">
            <PackageOpen className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold text-foreground">Pendentes de Devolução</h2>
            {pendentesDevolucao.length > 0 && (
              <Badge variant="destructive" className="ml-auto text-[10px]">{pendentesDevolucao.length}</Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </div>
          {pendentesDevolucao.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Nenhum material pendente
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendentesDevolucao.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{p.itemNome} ({p.quantidade})</p>
                    <p className="text-xs text-muted-foreground">{p.retiradoPor}{p.destino ? ` — ${p.destino}` : ""} — {p.dataSaida}</p>
                  </div>
                  <Badge className="bg-orange-500 text-white border-0 shrink-0">Pendente</Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Estoque baixo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="stat-card cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all"
          onClick={() => navigate("/estoque")}
        >
          <div className="flex items-center gap-2 mb-4">
            <PackageMinus className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold text-foreground">Estoque Baixo</h2>
            {estoqueBaixo.length > 0 && (
              <Badge variant="destructive" className="ml-auto text-[10px]">{estoqueBaixo.length}</Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </div>
          {estoqueBaixo.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Todos os itens com estoque adequado
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {estoqueBaixo.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{e.nome}</p>
                    <p className="text-xs text-muted-foreground">Atual: {e.quantidade} {e.unidade} — Mínimo: {e.quantidadeMinima} {e.unidade}</p>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    {e.quantidade === 0 ? "Zerado" : "Baixo"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Pipeline visual */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="stat-card cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all"
        onClick={() => navigate("/leads")}
      >
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-4 w-4 text-accent" />
          <h2 className="font-semibold text-foreground">Funil de Vendas</h2>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Qualificado", count: funil.qualificado, color: "bg-pipeline-qualificado" },
            { label: "Proposta Enviada", count: funil.proposta, color: "bg-pipeline-proposta" },
            { label: "Negociação", count: funil.negociacao, color: "bg-pipeline-negociacao" },
            { label: "Ganho", count: funil.ganho, color: "bg-pipeline-ganho" },
          ].map((stage) => (
            <div key={stage.label} className="text-center p-3 rounded-lg bg-muted/50">
              <div className={`h-1.5 w-12 mx-auto rounded-full ${stage.color} mb-2`} />
              <p className="text-lg font-bold text-foreground">{stage.count}</p>
              <p className="text-[11px] text-muted-foreground">{stage.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
