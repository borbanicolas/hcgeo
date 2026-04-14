import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, FolderPlus, FileDown, Paperclip, ExternalLink, ListPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportPropostaPDF } from "./PropostaPDFExport";
import { upsertCliente } from "@/lib/clienteSync";

const STATUS_OPTIONS = ["Rascunho", "Enviada", "Em Análise", "Aprovada", "Reprovada", "Cancelada"];
const TIPO_SERVICO = ["Sondagem SPT", "Sondagem Rotativa", "Geofísica", "Hidrogeologia", "Instrumentação", "Poços", "Ensaios de Campo", "Misto"];
const UNIDADES = ["m", "m²", "m³", "un", "vb", "h", "dia", "km", "(Unit.)", "(m.)"];

// === TEMPLATES DE ITENS PRÉ-PROGRAMADOS ===
const TEMPLATE_ITEMS: { label: string; items: Omit<ItemForm, "ordem">[] }[] = [
  {
    label: "Sondagem SPT (padrão)",
    items: [
      { item_numero: "1.1", descricao: "", unidade: "", quantidade: 0, valor_unitario: 0, valor_total: 0, is_grupo: true, grupo_nome: "SONDAGEM A PERCUSSÃO – SPT" },
      { item_numero: "1.1.1", descricao: "Perfuração em solo (SPT)", unidade: "(m.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.2", descricao: "Mobilização e Desmobilização de equipamentos", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.3", descricao: "Deslocamento de furo", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.4", descricao: "Relatório técnico (SPT)", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
    ],
  },
  {
    label: "Sondagem Rotativa (padrão)",
    items: [
      { item_numero: "1.1", descricao: "", unidade: "", quantidade: 0, valor_unitario: 0, valor_total: 0, is_grupo: true, grupo_nome: "SONDAGEM ROTATIVA" },
      { item_numero: "1.1.1", descricao: "Perfuração rotativa em rocha (NQ)", unidade: "(m.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.2", descricao: "Mobilização e Desmobilização de equipamentos", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.3", descricao: "Deslocamento de furo", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.4", descricao: "Relatório técnico (Rotativa)", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
    ],
  },
  {
    label: "SPT + Rotativa (misto)",
    items: [
      { item_numero: "1.1", descricao: "", unidade: "", quantidade: 0, valor_unitario: 0, valor_total: 0, is_grupo: true, grupo_nome: "SONDAGEM A PERCUSSÃO – SPT" },
      { item_numero: "1.1.1", descricao: "Perfuração em solo (SPT)", unidade: "(m.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.2", descricao: "Mobilização e Desmobilização de equipamentos", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.3", descricao: "Deslocamento de furo", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.2", descricao: "", unidade: "", quantidade: 0, valor_unitario: 0, valor_total: 0, is_grupo: true, grupo_nome: "SONDAGEM ROTATIVA" },
      { item_numero: "1.2.1", descricao: "Perfuração rotativa em rocha (NQ)", unidade: "(m.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.2.2", descricao: "Mobilização e Desmobilização de equipamentos", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.2.3", descricao: "Deslocamento de furo", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.2.4", descricao: "Relatório técnico (SPT + Rotativa)", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
    ],
  },
  {
    label: "Geofísica (padrão)",
    items: [
      { item_numero: "1.1", descricao: "", unidade: "", quantidade: 0, valor_unitario: 0, valor_total: 0, is_grupo: true, grupo_nome: "INVESTIGAÇÃO GEOFÍSICA" },
      { item_numero: "1.1.1", descricao: "Caminhamento elétrico / eletrorresistividade", unidade: "(m.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.2", descricao: "Mobilização e Desmobilização de equipamentos", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.3", descricao: "Relatório técnico (Geofísica)", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
    ],
  },
  {
    label: "Poço Tubular (padrão)",
    items: [
      { item_numero: "1.1", descricao: "", unidade: "", quantidade: 0, valor_unitario: 0, valor_total: 0, is_grupo: true, grupo_nome: "POÇO TUBULAR PROFUNDO" },
      { item_numero: "1.1.1", descricao: "Perfuração de poço tubular", unidade: "(m.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.2", descricao: "Revestimento em tubos CPVC ou PVC geomecânico", unidade: "(m.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.3", descricao: "Mobilização e Desmobilização de equipamentos", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.4", descricao: "Teste de vazão", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
      { item_numero: "1.1.5", descricao: "Relatório técnico (Poço)", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0, is_grupo: false, grupo_nome: "" },
    ],
  },
];

interface ItemForm {
  id?: string;
  item_numero: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ordem: number;
  is_grupo: boolean;
  grupo_nome: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposta: any | null;
  onSaved: () => void;
}

const DEFAULT_ENCARGOS_CONTRATANTE = `5.1. Providenciar as licenças e autorizações necessárias à perfeita execução dos serviços, quando aplicável.
5.2. Disponibilizar estrutura de apoio adequada, incluindo energia elétrica, canteiro, local seguro para guarda de materiais e equipamentos, banheiro químico, quando necessário.
5.3. Fornecimento de água (3 m³/h ou 15 m³/dia, por caminhão-pipa ou torneira).
5.4. Atender prontamente qualquer solicitação da CONTRATADA relacionada a dados, documentos ou informações adicionais.
5.5. Garantir acesso desimpedido e seguro ao local da obra.
5.6. Fornecer plantas com o cadastramento de possíveis interferências subterrâneas ou aéreas.
5.7. Responsabilizar-se pela recomposição de benfeitorias eventualmente danificadas.
5.8. Fornecer tambores metálicos para armazenagem e posterior descarte de resíduos de perfuração potencialmente contaminados, quando aplicável.
5.9. Disponibilizar a locação topográfica em campo, com demarcação dos pontos de perfuração por piquetes e fornecimento da planta de localização com cotas e coordenadas, bem como o critério de paralisação dos furos de sondagem, quando aplicável.
5.10. Garantir o acesso dos veículos e equipamentos da CONTRATADA até os pontos de investigação, assegurando condições adequadas de mobilização e segurança. Caso o acesso apresente restrições físicas ou condições desfavoráveis (como declividades acentuadas, áreas encharcadas, atoleiros, obstáculos naturais ou ausência de via de acesso), a CONTRATANTE deverá disponibilizar apoio de maquinário apropriado (como retroescavadeira, trator ou equipamento similar) para auxiliar a locomoção e instalação da sonda e dos equipamentos necessários. A não disponibilização do apoio implicará na suspensão dos serviços até que as condições adequadas de acesso sejam providenciadas, sem ônus para a CONTRATADA.
5.11. Reembolsar os custos de contratação de seguros, laudos, exames ou certificações adicionais que venham a ser exigidos pela CONTRATANTE e não estejam previstos nos programas da HCGEO Geologia e Hidrogeologia LTDA.`;

const DEFAULT_ENCARGOS_CONTRATADA = `6.1. Prestar os serviços contratados com o pessoal próprio ou por ela contratado, cabendo-lhe total e exclusiva responsabilidade pela coordenação e orientação dos serviços e responsabilizando-se legal, administrativa e tecnicamente por todos os profissionais incluídos nesta contratação.
6.2. Observar que seus empregados e/ou contratados respeitem as normas relativas à segurança, higiene e medicina do trabalho.
6.3. Responsabilizar-se por todas as obrigações fiscais, trabalhistas, previdenciárias e secundárias, se incidam sobre o pessoal próprio ou por ela contratado.
6.4. Manter a contratante inteiramente livre e a salvo de quaisquer responsabilidades, demandas ou reinvindicações de natureza trabalhista, previdenciária, secundária e fundiária, propostas por seus funcionários e/ou contratados.
6.5. Fornecer equipamentos adequados e mão de obra especializada para a execução dos serviços.
6.6. Comunicar à contratante eventuais entraves à prestação dos serviços.
6.7. Fornecer (01) um relatório final dos serviços executados em formato digital (PDF).
6.8. Haverá acompanhamento periódico de (01) um Geólogo para supervisionar as atividades.
6.9. Armazenar as amostras de solo e/ou rocha pelo período de até 60 dias após a entrega do relatório.`;

const DEFAULT_CONDICOES_GERAIS = `7.1. O aceite da proposta poderá ser formalizado por meio do preenchimento do item 10 ou, por e-mail ou mensagem via WhatsApp, diretamente com o setor comercial responsável pelo envio da proposta.
7.2. A programação e o agendamento dos serviços terão início após o aceite da proposta e o preenchimento da Ordem de Serviço (O.S.). O setor técnico será o responsável por entrar em contato com o cliente para realizar o preenchimento da O.S. Cabe salientar que eventuais atrasos no fornecimento das informações solicitadas poderão comprometer o início dos serviços, estando o agendamento sujeito à disponibilidade conforme a ordem de preenchimento de outras O.S.
7.3. Após o aceite do serviço, o setor financeiro entrará em contato para fornecer as informações referentes ao pagamento da entrada e a emissão da respectiva nota fiscal.
7.4. A metragem adicional perfurada, necessária para atingir os objetivos da investigação geológica geotécnica e hidrogeológica, será faturado no saldo, por ocasião da entrega do relatório.
7.5. Não estão previstas perfurações em locais com lâmina d'água, terrenos inclinados (taludes ou encostas), nem a execução de abertura de picadas, acessos ou estradas. Também não estão incluídas atividades de supressão de vegetação, nivelamento do terreno, retirada de obstáculos, ou apoio mecânico adicional (como uso de retroescavadeira, trator ou guindaste) para mobilização e locomoção da sonda.
7.6. A execução dos serviços fica condicionada à viabilidade técnica e de segurança local, cabendo à CONTRATANTE garantir acesso adequado aos pontos de investigação.
7.7. Não está prevista, nesta proposta, a participação dos colaboradores em palestras de integração.
7.8. A HCGEO Geologia e Hidrogeologia LTDA, se reserva no direito de instalar sua placa de identificação, contendo informações sobre o serviço realizado e responsável técnico, no tapume da obra.
7.9. O horário de trabalho da equipe é de segunda a sexta-feira, das 07h45 às 17h33, com 1h de intervalo para almoço. Não há expediente noturno, aos finais de semana ou feriados. Caso sejam necessários trabalhos em horários extraordinários, a contratante deverá informar previamente, antes da contratação e do início das atividades de campo, para que os ajustes nos valores sejam devidamente considerados.
7.10. Na ocorrência de eventos que causem interrupções nos serviços, por razões alheias à vontade da contratada e determinadas pela contratante, será cobrada a taxa referente ao tempo de parada, limitada a 8 (oito) horas por dia. Não será cobrada taxa por paralisações causadas por condições climáticas.
7.11. A entrega do relatório está condicionada à confirmação do pagamento do saldo remanescente.`;

const DEFAULT_CANCELAMENTO = `8.1. Em caso de cancelamento ou suspensão dos serviços por iniciativa da CONTRATANTE, após a mobilização da equipe técnica ou início das atividades, a HCGEO GEOLOGIA E HIDROGEOLOGIA LTDA se reserva o direito de cobrar os custos operacionais já incorridos, tais como deslocamento, diárias de equipe, logística e preparativos técnicos, bem como uma taxa de remobilização em caso de retomada posterior das atividades.
8.2. Em caso de inadimplemento do pagamento final, após a conclusão dos serviços, a entrega do relatório técnico permanecerá suspensa até a efetiva confirmação do pagamento integral do saldo devido.
8.3. Após a data de vencimento da cobrança do saldo, poderá incidir sobre o valor pendente: Multa moratória de 2% (dois por cento); Juros de mora de 1% (um por cento) ao mês e Atualização monetária conforme índice IPCA.
8.4. A formalização do início dos trabalhos estará condicionada à quitação da entrada acordada, sendo o cronograma de execução ajustado conforme a confirmação desse pagamento.`;

const DEFAULT_NOTAS = `9.1. A sondagem geotécnica é uma etapa fundamental e determinante para o correto dimensionamento das fundações da obra. Um levantamento impreciso ou mal executado pode comprometer a interpretação do subsolo, gerar retrabalhos, custos adicionais e riscos estruturais significativos. Dessa forma, atuamos com rigor técnico, responsabilidade profissional e controle de qualidade, assegurando dados confiáveis, representativos e compatíveis com as exigências do engenheiro projetista e com as normas vigentes.
9.2. A execução dos serviços de sondagem segue rigorosamente as normas técnicas aplicáveis da ABNT, em especial aquelas relacionadas à investigação geológico-geotécnica, bem como as Normas Regulamentadoras de Segurança do Trabalho (NRs), garantindo conformidade legal, técnica e operacional em todas as etapas do serviço.
9.3. Nossos colaboradores possuem capacitação técnica específica para sondagem, certificações atualizadas, treinamentos periódicos em segurança e operação de equipamentos, além de estarem devidamente cobertos por seguro para atuação em campo.
9.4. A empresa é regularmente registrada no CREA-SC sob o nº 194270-3, contando com responsável técnico legalmente habilitado e vinculado ao respectivo conselho profissional. A Anotação de Responsabilidade Técnica (ART) será emitida em conformidade com a legislação vigente.
9.5. Os equipamentos utilizados na sondagem passam por manutenção preventiva e inspeções periódicas, assegurando adequado desempenho operacional.
9.6. As perfurações são executadas, preferencialmente, com diâmetro NQ, padrão amplamente reconhecido por proporcionar maior recuperação de testemunho, melhor preservação das características geológicas e geotécnicas do maciço e maior precisão na descrição dos parâmetros do subsolo.
9.7. A adoção de procedimentos adequados de perfuração, controle de avanço, circulação de fluido e manuseio dos testemunhos garante a representatividade dos materiais amostrados, evitando perdas, misturas ou danos mecânicos que possam comprometer a qualidade dos registros.`;

export function PropostaFormDialog({ open, onOpenChange, proposta, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [numeroSequencial, setNumeroSequencial] = useState("");
  const [arquivoUrl, setArquivoUrl] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [form, setForm] = useState({
    titulo: "", cliente_id: "", contratante_nome: "", cnpj_cpf: "", tipo_servico: "Sondagem SPT", status: "Rascunho",
    data_emissao: new Date().toISOString().split("T")[0], validade_dias: 15,
    condicoes_pagamento: "", prazo_execucao: "", local_obra: "", observacoes: "",
    desconto_percentual: 0, revisao: "R.00",
    contato_nome: "", contato_telefone: "", contato_email: "",
    forma_pagamento: "",
    prazo_inicio: "", prazo_execucao_campo: "", prazo_entrega_relatorio: "",
    encargos_contratante: DEFAULT_ENCARGOS_CONTRATANTE,
    encargos_contratada: DEFAULT_ENCARGOS_CONTRATADA,
    condicoes_gerais: DEFAULT_CONDICOES_GERAIS,
    cancelamento_suspensao: DEFAULT_CANCELAMENTO,
    notas_complementares: DEFAULT_NOTAS,
  });
  const [itens, setItens] = useState<ItemForm[]>([]);

  // Payment structured fields
  const [pgtoEntradaValor, setPgtoEntradaValor] = useState("");
  const [pgtoEntradaTexto, setPgtoEntradaTexto] = useState("a ser quitada dois dias antes da mobilização para início dos serviços");
  const [pgtoSaldoTexto, setPgtoSaldoTexto] = useState("a ser definido conforme a profundidade final dos furos executados e medições efetivamente realizadas, mantendo o faturamento mínimo, e cobrança proporcional para eventuais metros adicionais, com pagamento na entrega do relatório final");
  const [pgtoRelatorioTexto, setPgtoRelatorioTexto] = useState("Condicionada à confirmação do pagamento do saldo final");

  const fetchClientes = useCallback(async () => {
    const { data } = await supabase.from("clientes").select("id, razao_social, contato_principal, telefone, email, cnpj_cpf").order("razao_social");
    setClientes(data || []);
  }, []);

  useEffect(() => { if (open) fetchClientes(); }, [open, fetchClientes]);

  // Build forma_pagamento from structured fields
  const buildFormaPagamento = useCallback(() => {
    const parts: string[] = [];
    if (pgtoEntradaValor) {
      parts.push(`• Entrada: R$ ${pgtoEntradaValor} – ${pgtoEntradaTexto}`);
    }
    parts.push(`• Saldo: ${pgtoSaldoTexto}`);
    parts.push(`• Entrega do relatório: ${pgtoRelatorioTexto}`);
    return parts.join("\n\n");
  }, [pgtoEntradaValor, pgtoEntradaTexto, pgtoSaldoTexto, pgtoRelatorioTexto]);

  // Auto-calculate entrada when total changes
  useEffect(() => {
    const sub = itens.filter(i => !i.is_grupo).reduce((sum, i) => sum + (i.valor_total || 0), 0);
    const desc = sub * (form.desconto_percentual / 100);
    const t = sub - desc;
    if (t > 0 && !pgtoEntradaValor) {
      const metade = (t * 0.5).toFixed(2).replace(".", ",");
      setPgtoEntradaValor(metade);
    }
  }, [itens, form.desconto_percentual]);

  // Sync forma_pagamento
  useEffect(() => {
    setForm(f => ({ ...f, forma_pagamento: buildFormaPagamento() }));
  }, [pgtoEntradaValor, pgtoEntradaTexto, pgtoSaldoTexto, pgtoRelatorioTexto, buildFormaPagamento]);

  const buildNumero = (seq: string) => {
    const yr = new Date(form.data_emissao || Date.now()).getFullYear();
    const mo = String(new Date(form.data_emissao || Date.now()).getMonth() + 1).padStart(2, "0");
    return `HC_PTC_Nº${seq.padStart(2, "0")}_${yr}_${mo}`;
  };

  const parseSequencial = (numero: string) => {
    const m = numero.match(/Nº(\d+)/);
    return m ? m[1] : "";
  };

  useEffect(() => {
    if (proposta) {
      setNumeroSequencial(parseSequencial(proposta.numero || ""));
      setArquivoUrl(proposta.arquivo_url || "");
      setArquivoNome(proposta.arquivo_nome || "");
      setForm({
        titulo: proposta.titulo || "", cliente_id: proposta.cliente_id || "",
        contratante_nome: proposta.contratante_nome || "", cnpj_cpf: proposta.cnpj_cpf || "",
        tipo_servico: proposta.tipo_servico || "Sondagem SPT", status: proposta.status || "Rascunho",
        data_emissao: (proposta.data_emissao || "").split("T")[0] || new Date().toISOString().split("T")[0],
        validade_dias: proposta.validade_dias ?? 15, condicoes_pagamento: proposta.condicoes_pagamento || "",
        prazo_execucao: proposta.prazo_execucao || "", local_obra: proposta.local_obra || "",
        observacoes: proposta.observacoes || "", desconto_percentual: proposta.desconto_percentual ?? 0,
        revisao: proposta.revisao || "R.00",
        contato_nome: proposta.contato_nome || "", contato_telefone: proposta.contato_telefone || "",
        contato_email: proposta.contato_email || "",
        forma_pagamento: proposta.forma_pagamento || "",
        prazo_inicio: (proposta.prazo_inicio || "").split("T")[0] || "",
        prazo_execucao_campo: (proposta.prazo_execucao_campo || "").split("T")[0] || "",
        prazo_entrega_relatorio: (proposta.prazo_entrega_relatorio || "").split("T")[0] || "",
        encargos_contratante: proposta.encargos_contratante || DEFAULT_ENCARGOS_CONTRATANTE,
        encargos_contratada: proposta.encargos_contratada || DEFAULT_ENCARGOS_CONTRATADA,
        condicoes_gerais: proposta.condicoes_gerais || DEFAULT_CONDICOES_GERAIS,
        cancelamento_suspensao: proposta.cancelamento_suspensao || DEFAULT_CANCELAMENTO,
        notas_complementares: proposta.notas_complementares || DEFAULT_NOTAS,
      });
      // Parse existing forma_pagamento for structured fields
      const fp = proposta.forma_pagamento || "";
      const entradaMatch = fp.match(/Entrada:\s*R\$\s*([\d.,]+)/);
      if (entradaMatch) setPgtoEntradaValor(entradaMatch[1]);
      
      supabase.from("proposta_itens").select("*").eq("proposta_id", proposta.id).order("ordem")
        .then(({ data }) => setItens((data || []).map((d: any) => ({
          id: d.id, item_numero: d.item_numero || "", descricao: d.descricao, unidade: d.unidade,
          quantidade: d.quantidade, valor_unitario: d.valor_unitario,
          valor_total: d.valor_total, ordem: d.ordem,
          is_grupo: d.is_grupo || false, grupo_nome: d.grupo_nome || "",
        }))));
    } else {
      setNumeroSequencial("");
      setArquivoUrl("");
      setArquivoNome("");
      setPgtoEntradaValor("");
      setForm({
        titulo: "", cliente_id: "", contratante_nome: "", cnpj_cpf: "", tipo_servico: "Sondagem SPT", status: "Rascunho",
        data_emissao: new Date().toISOString().split("T")[0], validade_dias: 15,
        condicoes_pagamento: "", prazo_execucao: "", local_obra: "", observacoes: "",
        desconto_percentual: 0, revisao: "R.00",
        contato_nome: "", contato_telefone: "", contato_email: "",
        forma_pagamento: "",
        prazo_inicio: "", prazo_execucao_campo: "", prazo_entrega_relatorio: "",
        encargos_contratante: DEFAULT_ENCARGOS_CONTRATANTE,
        encargos_contratada: DEFAULT_ENCARGOS_CONTRATADA,
        condicoes_gerais: DEFAULT_CONDICOES_GERAIS,
        cancelamento_suspensao: DEFAULT_CANCELAMENTO,
        notas_complementares: DEFAULT_NOTAS,
      });
      setItens([]);
    }
  }, [proposta, open]);

  const handleClienteChange = (clienteId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setForm(f => ({
      ...f, cliente_id: clienteId,
      contratante_nome: cliente?.razao_social || f.contratante_nome,
      cnpj_cpf: cliente?.cnpj_cpf || f.cnpj_cpf,
      contato_nome: f.contato_nome || cliente?.contato_principal || "",
      contato_telefone: f.contato_telefone || cliente?.telefone || "",
      contato_email: f.contato_email || cliente?.email || "",
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { data: uploadData, error } = await supabase.storage.from("proposta-docs").upload(path, file);
      if (error) throw error;
      
      const publicUrl = uploadData?.url || supabase.storage.from("proposta-docs").getPublicUrl(path).data.publicUrl;
      setArquivoUrl(publicUrl);
      setArquivoNome(file.name);
      toast.success("Arquivo anexado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar arquivo");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleExportPDF = async () => {
    await exportPropostaPDF({
      numero: numeroSequencial ? buildNumero(numeroSequencial) : proposta?.numero || "NOVA",
      revisao: form.revisao,
      titulo: form.titulo,
      contratante_nome: form.contratante_nome,
      contato_nome: form.contato_nome,
      contato_telefone: form.contato_telefone,
      contato_email: form.contato_email,
      local_obra: form.local_obra,
      tipo_servico: form.tipo_servico,
      data_emissao: form.data_emissao,
      validade_dias: form.validade_dias,
      forma_pagamento: form.forma_pagamento,
      condicoes_pagamento: form.condicoes_pagamento,
      prazo_inicio: form.prazo_inicio,
      prazo_execucao_campo: form.prazo_execucao_campo,
      prazo_entrega_relatorio: form.prazo_entrega_relatorio,
      prazo_execucao: form.prazo_execucao,
      encargos_contratante: form.encargos_contratante,
      encargos_contratada: form.encargos_contratada,
      condicoes_gerais: form.condicoes_gerais,
      cancelamento_suspensao: form.cancelamento_suspensao,
      notas_complementares: form.notas_complementares,
      observacoes: form.observacoes,
      desconto_percentual: form.desconto_percentual,
      itens,
    });
    toast.success("PDF exportado!");
  };

  const addGrupo = () => {
    setItens([...itens, {
      item_numero: `${itens.filter(i => i.is_grupo).length + 1}.1`,
      descricao: "", unidade: "", quantidade: 0, valor_unitario: 0, valor_total: 0,
      ordem: itens.length, is_grupo: true, grupo_nome: "Serviços Especializados",
    }]);
  };

  const addItem = () => {
    const grupos = itens.filter(i => i.is_grupo);
    const lastGrupo = grupos[grupos.length - 1];
    const grupoPrefix = lastGrupo?.item_numero || "1.1";
    const subItems = itens.filter(i => !i.is_grupo && i.item_numero.startsWith(grupoPrefix + "."));
    const nextNum = subItems.length + 1;
    setItens([...itens, {
      item_numero: `${grupoPrefix}.${nextNum}`,
      descricao: "", unidade: "(Unit.)", quantidade: 1, valor_unitario: 0, valor_total: 0,
      ordem: itens.length, is_grupo: false, grupo_nome: "",
    }]);
  };

  const loadTemplate = (templateIdx: number) => {
    const template = TEMPLATE_ITEMS[templateIdx];
    if (!template) return;
    const newItems = template.items.map((item, idx) => ({
      ...item,
      ordem: itens.length + idx,
    }));
    setItens([...itens, ...newItems]);
    toast.success(`Template "${template.label}" adicionado!`);
  };

  const updateItem = (idx: number, key: keyof ItemForm, val: any) => {
    setItens((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [key]: val };
      if (key === "quantidade" || key === "valor_unitario") {
        updated.valor_total = Number(updated.quantidade) * Number(updated.valor_unitario);
      }
      return updated;
    }));
  };

  const removeItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));

  const subtotal = itens.filter(i => !i.is_grupo).reduce((sum, i) => sum + (i.valor_total || 0), 0);
  const desconto = subtotal * (form.desconto_percentual / 100);
  const total = subtotal - desconto;

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.titulo.trim()) newErrors.titulo = "O título é obrigatório";
    if (!form.contratante_nome.trim()) newErrors.contratante_nome = "O nome do contratante é obrigatório";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const payload: any = {
        ...form, cliente_id: form.cliente_id || null,
        valor_total: total, user_id: user.id,
        arquivo_url: arquivoUrl, arquivo_nome: arquivoNome,
      };

      // Sanitizar: strings vazias devem ser null para não quebrar o banco
      Object.keys(payload).forEach(k => {
        if (payload[k] === "") payload[k] = null;
      });

      let propostaId = proposta?.id;

      if (proposta) {
        const updateData: any = { ...payload };
        const newNumero = numeroSequencial ? buildNumero(numeroSequencial) : "";
        if (newNumero && newNumero !== proposta.numero) {
          updateData.numero = newNumero;
        }
        // Always update revision in numero
        if (!newNumero && proposta.numero) {
          updateData.numero = proposta.numero;
        }
        const { error } = await supabase.from("propostas").update(updateData).eq("id", proposta.id);
        if (error) throw error;
      } else {
        let numero = numeroSequencial ? buildNumero(numeroSequencial) : "";
        if (!numero) {
          const { data: numData, error: numErr } = await supabase.rpc("generate_proposta_number", { p_user_id: user.id });
          if (numErr) throw numErr;
          numero = numData;
          numero = numData;
        }
        const { data: inserted, error } = await supabase.from("propostas").insert({
          ...payload, numero,
        }).select("id").single();
        if (error) throw error;
        propostaId = inserted.id;
      }

      if (proposta) {
        await supabase.from("proposta_itens").delete().eq("proposta_id", propostaId);
      }
      if (itens.length > 0) {
        const itemPayload = itens.map((item, idx) => ({
          proposta_id: propostaId,
          item_numero: item.item_numero,
          descricao: item.is_grupo ? item.grupo_nome : item.descricao,
          unidade: item.unidade,
          quantidade: Number(item.quantidade),
          valor_unitario: Number(item.valor_unitario),
          valor_total: item.is_grupo ? 0 : Number(item.quantidade) * Number(item.valor_unitario),
          ordem: idx,
          is_grupo: item.is_grupo,
          grupo_nome: item.grupo_nome,
        }));
        const { error: itemErr } = await supabase.from("proposta_itens").insert(itemPayload);
        if (itemErr) throw itemErr;
      }

      // Auto-create/update client if no client linked
      if (!form.cliente_id && form.contratante_nome) {
        const clienteId = await upsertCliente({
          razao_social: form.contratante_nome,
          cnpj_cpf: form.cnpj_cpf,
          contato_principal: form.contato_nome,
          telefone: form.contato_telefone,
          email: form.contato_email,
          endereco: form.local_obra,
        }, user.id);
        if (clienteId && propostaId) {
          await supabase.from("propostas").update({ cliente_id: clienteId }).eq("id", propostaId);
        }
      }

      toast.success(proposta ? "Proposta atualizada" : "Proposta criada");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar proposta");
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, val: any) => {
    setForm((f) => ({ ...f, [key]: val }));
    // Clear error for this field when user types
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{proposta ? `Editar Proposta ${proposta.numero} – ${form.revisao}` : "Nova Proposta Técnica Comercial"}</DialogTitle>
        </DialogHeader>

        <Accordion type="multiple" defaultValue={["dados", "itens", "totais"]} className="w-full space-y-1">
          {/* DADOS GERAIS */}
          <AccordionItem value="dados">
            <AccordionTrigger className="text-sm font-semibold">Dados Gerais da Proposta</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="titulo" className={errors.titulo ? "text-destructive" : ""}>Título *</Label>
                  <Input 
                    id="titulo"
                    value={form.titulo} 
                    onChange={(e) => set("titulo", e.target.value)} 
                    placeholder="Ex: Sondagem SPT - Edifício Residencial" 
                    className={errors.titulo ? "border-destructive ring-destructive" : ""}
                  />
                  {errors.titulo && <p className="text-[10px] text-destructive mt-1">{errors.titulo}</p>}
                </div>
                <div>
                  <Label>Nº da Proposta</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">HC_PTC_Nº</span>
                    <Input
                      value={numeroSequencial}
                      onChange={(e) => setNumeroSequencial(e.target.value.replace(/\D/g, ""))}
                      placeholder="XX"
                      className="w-16 text-center"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">_{new Date(form.data_emissao || Date.now()).getFullYear()}_{String(new Date(form.data_emissao || Date.now()).getMonth() + 1).padStart(2, "0")}_{form.revisao || "R.00"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Formato: HC_PTC_NºXX_ANO_MÊS_R.00 · Nº sequencial editável (auto se vazio)</p>
                </div>
                <div>
                  <Label>Vincular a Cliente Cadastrado</Label>
                  <Select value={form.cliente_id} onValueChange={handleClienteChange}>
                    <SelectTrigger><SelectValue placeholder="(Opcional) Selecione..." /></SelectTrigger>
                    <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contratante_nome" className={errors.contratante_nome ? "text-destructive" : ""}>Contratante (Nome) *</Label>
                  <Input 
                    id="contratante_nome"
                    value={form.contratante_nome} 
                    onChange={(e) => set("contratante_nome", e.target.value)} 
                    placeholder="Nome do contratante / empresa" 
                    className={errors.contratante_nome ? "border-destructive ring-destructive" : ""}
                  />
                  {errors.contratante_nome && <p className="text-[10px] text-destructive mt-1">{errors.contratante_nome}</p>}
                </div>
                <div>
                  <Label>CPF / CNPJ</Label>
                  <Input value={form.cnpj_cpf} onChange={(e) => set("cnpj_cpf", e.target.value)} placeholder="000.000.000-00 ou 00.000.000/0000-00" />
                </div>
                <div>
                  <Label>Tipo de Serviço</Label>
                  <Select value={form.tipo_servico} onValueChange={(v) => set("tipo_servico", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPO_SERVICO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>A/C (Contato)</Label><Input value={form.contato_nome} onChange={(e) => set("contato_nome", e.target.value)} placeholder="Nome do contato" /></div>
                <div><Label>Telefone Contato</Label><Input value={form.contato_telefone} onChange={(e) => set("contato_telefone", e.target.value)} placeholder="(xx) xxxxx-xxxx" /></div>
                <div><Label>E-mail Contato</Label><Input value={form.contato_email} onChange={(e) => set("contato_email", e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Endereço da Obra</Label><Input value={form.local_obra} onChange={(e) => set("local_obra", e.target.value)} placeholder="Rua, número, cidade/UF" /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Revisão</Label><Input value={form.revisao} onChange={(e) => set("revisao", e.target.value)} placeholder="R.00" /></div>
                <div><Label>Data de Emissão</Label><Input type="date" value={form.data_emissao} onChange={(e) => set("data_emissao", e.target.value)} /></div>
                <div><Label>Validade (dias)</Label><Input type="number" value={form.validade_dias} onChange={(e) => set("validade_dias", Number(e.target.value))} /></div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 1. PREVISÃO DE CUSTO - ITENS */}
          <AccordionItem value="itens">
            <AccordionTrigger className="text-sm font-semibold">1. Previsão de Custo Global das Atividades</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {/* Template selector */}
                <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <ListPlus className="h-3.5 w-3.5" /> Carregar Template Pré-programado
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATE_ITEMS.map((tpl, idx) => (
                      <Button key={idx} type="button" variant="outline" size="sm" onClick={() => loadTemplate(idx)} className="text-xs h-7">
                        {tpl.label}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Os itens são adicionados à lista atual. Você pode editar todos os campos após carregar.</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" onClick={addGrupo} className="gap-1">
                    <FolderPlus className="h-3.5 w-3.5" /> Grupo de Serviço
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Item
                  </Button>
                </div>

                {itens.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum item adicionado. Use um template ou crie manualmente.</p>
                ) : (
                  <div className="space-y-1">
                    <div className="grid grid-cols-12 gap-1 px-3 py-1 text-xs font-medium text-muted-foreground">
                      <div className="col-span-1">Item</div>
                      <div className="col-span-4">Descrição</div>
                      <div className="col-span-1">Un.</div>
                      <div className="col-span-1 text-right">Qtd.</div>
                      <div className="col-span-2 text-right">Preço Unit.</div>
                      <div className="col-span-2 text-right">Preço Total</div>
                      <div className="col-span-1"></div>
                    </div>

                    {itens.map((item, idx) => item.is_grupo ? (
                      <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-accent/10 rounded-md px-3 py-2 border border-accent/20">
                        <div className="col-span-1">
                          <Input value={item.item_numero} onChange={(e) => updateItem(idx, "item_numero", e.target.value)} className="h-7 text-xs font-bold" />
                        </div>
                        <div className="col-span-10">
                          <Input value={item.grupo_nome} onChange={(e) => updateItem(idx, "grupo_nome", e.target.value)} className="h-7 text-xs font-bold" placeholder="Nome do grupo de serviço" />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-muted/30 rounded-md px-3 py-1.5">
                        <div className="col-span-1">
                          <Input value={item.item_numero} onChange={(e) => updateItem(idx, "item_numero", e.target.value)} className="h-7 text-xs" />
                        </div>
                        <div className="col-span-4">
                          <Input value={item.descricao} onChange={(e) => updateItem(idx, "descricao", e.target.value)} className="h-7 text-xs" placeholder="Descrição do serviço" />
                        </div>
                        <div className="col-span-1">
                          <Select value={item.unidade} onValueChange={(v) => updateItem(idx, "unidade", v)}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1">
                          <Input type="number" value={item.quantidade} onChange={(e) => updateItem(idx, "quantidade", Number(e.target.value))} className="h-7 text-xs text-right" />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" value={item.valor_unitario} onChange={(e) => updateItem(idx, "valor_unitario", Number(e.target.value))} className="h-7 text-xs text-right" />
                        </div>
                        <div className="col-span-2 text-right text-xs font-medium pr-1 flex items-center justify-end h-7">
                          {fmt(item.valor_total)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  FM = Faturamento Mínimo · NP = Não Previsto · NE = Não Estimado · CC = A Cargo do Contratante
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* TOTAIS */}
          <AccordionItem value="totais">
            <AccordionTrigger className="text-sm font-semibold">Resumo Financeiro</AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Parcial</span>
                  <span className="font-medium">{fmt(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm gap-3">
                  <span className="text-muted-foreground">Desconto</span>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={form.desconto_percentual} onChange={(e) => set("desconto_percentual", Number(e.target.value))} className="w-20 h-8 text-right" />
                    <span className="text-muted-foreground">%</span>
                    <span className="font-medium w-28 text-right">- {fmt(desconto)}</span>
                  </div>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-border pt-2">
                  <span>Total Global Estimado</span>
                  <span className="text-accent">{fmt(total)}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. MEDIÇÕES E FORMAS DE PAGAMENTO */}
          <AccordionItem value="pagamento">
            <AccordionTrigger className="text-sm font-semibold">2. Medições e Formas de Pagamento</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Entrada */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <Label className="text-xs font-semibold">• Entrada</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Valor (R$)</Label>
                      <Input value={pgtoEntradaValor} onChange={(e) => setPgtoEntradaValor(e.target.value)} placeholder="Ex: 6.750,00" className="h-8 text-xs" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Sugestão: 50% do total = {fmt(total * 0.5)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-[10px] text-muted-foreground">Condição</Label>
                      <Input value={pgtoEntradaTexto} onChange={(e) => setPgtoEntradaTexto(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>
                </div>
                {/* Saldo */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <Label className="text-xs font-semibold">• Saldo</Label>
                  <Textarea value={pgtoSaldoTexto} onChange={(e) => setPgtoSaldoTexto(e.target.value)} rows={3} className="text-xs" />
                </div>
                {/* Entrega Relatório */}
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <Label className="text-xs font-semibold">• Entrega do Relatório</Label>
                  <Input value={pgtoRelatorioTexto} onChange={(e) => setPgtoRelatorioTexto(e.target.value)} className="h-8 text-xs" />
                </div>
                {/* Preview */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <Label className="text-[10px] text-muted-foreground mb-1 block">Prévia do texto no PDF:</Label>
                  <p className="text-xs whitespace-pre-wrap">{form.forma_pagamento}</p>
                </div>
                <div><Label>Condições de Pagamento (resumo adicional)</Label><Input value={form.condicoes_pagamento} onChange={(e) => set("condicoes_pagamento", e.target.value)} placeholder="Ex: 50% entrada + 50% na entrega" /></div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. VALIDADE + 4. PRAZO */}
          <AccordionItem value="prazos">
            <AccordionTrigger className="text-sm font-semibold">3/4. Validade e Prazos de Execução</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div><Label>Validade da Proposta (dias)</Label><Input type="number" value={form.validade_dias} onChange={(e) => set("validade_dias", Number(e.target.value))} /></div>
                <div><Label>Previsão de Início</Label><Input value={form.prazo_inicio} onChange={(e) => set("prazo_inicio", e.target.value)} placeholder="Ex: A combinar, após aceite e pagamento da entrada" /></div>
                <div><Label>Execução em Campo</Label><Input value={form.prazo_execucao_campo} onChange={(e) => set("prazo_execucao_campo", e.target.value)} placeholder="Ex: 3 dias úteis" /></div>
                <div><Label>Entrega do Relatório</Label><Input value={form.prazo_entrega_relatorio} onChange={(e) => set("prazo_entrega_relatorio", e.target.value)} placeholder="Ex: Até 12 dias úteis após execução" /></div>
                <div className="sm:col-span-2"><Label>Prazo de Execução (geral)</Label><Input value={form.prazo_execucao} onChange={(e) => set("prazo_execucao", e.target.value)} placeholder="Ex: 15 dias úteis" /></div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5-9 Clauses */}
          <AccordionItem value="encargos_contratante">
            <AccordionTrigger className="text-sm font-semibold">5. Encargos da Contratante</AccordionTrigger>
            <AccordionContent>
              <Textarea value={form.encargos_contratante} onChange={(e) => set("encargos_contratante", e.target.value)} rows={12} className="text-xs" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="encargos_contratada">
            <AccordionTrigger className="text-sm font-semibold">6. Encargos da Contratada</AccordionTrigger>
            <AccordionContent>
              <Textarea value={form.encargos_contratada} onChange={(e) => set("encargos_contratada", e.target.value)} rows={10} className="text-xs" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="condicoes">
            <AccordionTrigger className="text-sm font-semibold">7. Condições Gerais</AccordionTrigger>
            <AccordionContent>
              <Textarea value={form.condicoes_gerais} onChange={(e) => set("condicoes_gerais", e.target.value)} rows={14} className="text-xs" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cancelamento">
            <AccordionTrigger className="text-sm font-semibold">8. Cancelamento, Suspensão e Inadimplência</AccordionTrigger>
            <AccordionContent>
              <Textarea value={form.cancelamento_suspensao} onChange={(e) => set("cancelamento_suspensao", e.target.value)} rows={6} className="text-xs" />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="notas">
            <AccordionTrigger className="text-sm font-semibold">9. Notas e Observações Técnicas</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                <Textarea value={form.notas_complementares} onChange={(e) => set("notas_complementares", e.target.value)} rows={10} className="text-xs" />
                <div><Label>Observações Gerais</Label><Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} /></div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Anexo da proposta enviada */}
        <div className="border border-border rounded-lg p-3 space-y-2">
          <Label className="flex items-center gap-1.5 text-sm font-semibold"><Paperclip className="h-4 w-4" /> Anexar Proposta Enviada (PDF)</Label>
          {arquivoUrl ? (
            <div className="flex items-center gap-2 text-sm">
              <a href={arquivoUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1">
                <ExternalLink className="h-3.5 w-3.5" /> {arquivoNome || "Arquivo"}
              </a>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { setArquivoUrl(""); setArquivoNome(""); }}>Remover</Button>
            </div>
          ) : (
            <Input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileUpload} disabled={uploadingFile} className="text-xs" />
          )}
          {uploadingFile && <p className="text-xs text-muted-foreground">Enviando...</p>}
        </div>

        <div className="flex justify-between gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={handleExportPDF} className="gap-1.5">
            <FileDown className="h-4 w-4" /> Exportar PDF
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {loading ? "Salvando..." : "Salvar Proposta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
