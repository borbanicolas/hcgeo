import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface ExportData {
  mesAtual: string;
  contasPagar: any[];
  contasReceber: any[];
  despesasFixas: any[];
}

export function exportFinanceiroPDF({ mesAtual, contasPagar, contasReceber, despesasFixas }: ExportData) {
  const doc = new jsPDF();
  const mesLabel = format(parseISO(mesAtual + "-01"), "MMMM yyyy", { locale: ptBR });
  let y = 15;

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório Financeiro", 14, 15);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1), 14, 23);
  doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 210 - 14, 23, { align: "right" });

  y = 40;
  doc.setTextColor(0);

  // Filter month
  const inMonth = (d: string) => d?.startsWith(mesAtual);
  const pagarMes = contasPagar.filter((c) => inMonth(c.data_vencimento));
  const receberMes = contasReceber.filter((c) => inMonth(c.data_vencimento));

  const totalReceber = receberMes.reduce((s, c) => s + Number(c.valor), 0);
  const totalRecebido = receberMes.filter((c) => c.status === "Recebido").reduce((s, c) => s + Number(c.valor_recebido), 0);
  const totalPagar = pagarMes.reduce((s, c) => s + Number(c.valor), 0);
  const totalPago = pagarMes.filter((c) => c.status === "Pago").reduce((s, c) => s + Number(c.valor_pago), 0);
  const despFixas = despesasFixas.filter((d) => d.ativa).reduce((s, d) => s + Number(d.valor), 0);

  // KPIs
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo do Mês", 14, y);
  y += 8;

  const kpis = [
    ["A Receber", BRL(totalReceber)],
    ["Recebido", BRL(totalRecebido)],
    ["A Pagar", BRL(totalPagar)],
    ["Pago", BRL(totalPago)],
    ["Saldo (Recebido - Pago)", BRL(totalRecebido - totalPago)],
    ["Despesas Fixas/mês", BRL(despFixas)],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Indicador", "Valor"]],
    body: kpis,
    theme: "grid",
    headStyles: { fillColor: [30, 58, 95] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // DRE
  doc.setFont("helvetica", "bold");
  doc.text("DRE - Demonstrativo de Resultado", 14, y);
  y += 8;

  const dreReceitas = receberMes.filter((c) => c.status === "Recebido").reduce((s, c) => s + Number(c.valor_recebido), 0);
  const dreDespesas = pagarMes.filter((c) => c.status === "Pago").reduce((s, c) => s + Number(c.valor_pago), 0);

  autoTable(doc, {
    startY: y,
    body: [
      ["RECEITAS", BRL(dreReceitas)],
      ["(-) DESPESAS", `- ${BRL(dreDespesas)}`],
      ["= RESULTADO", BRL(dreReceitas - dreDespesas)],
      ["Margem", dreReceitas > 0 ? `${(((dreReceitas - dreDespesas) / dreReceitas) * 100).toFixed(1)}%` : "N/A"],
    ],
    theme: "plain",
    styles: { fontSize: 11 },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // Contas a Receber
  if (receberMes.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFont("helvetica", "bold");
    doc.text("Contas a Receber", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Descrição", "Cliente", "Valor", "Vencimento", "Status"]],
      body: receberMes.map((c) => [
        c.descricao, c.cliente, BRL(Number(c.valor)),
        format(parseISO(c.data_vencimento), "dd/MM/yyyy"), c.status,
      ]),
      theme: "striped",
      headStyles: { fillColor: [34, 139, 34] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Contas a Pagar
  if (pagarMes.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFont("helvetica", "bold");
    doc.text("Contas a Pagar", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Descrição", "Fornecedor", "Categoria", "Valor", "Vencimento", "Status"]],
      body: pagarMes.map((c) => [
        c.descricao, c.fornecedor, c.categoria, BRL(Number(c.valor)),
        format(parseISO(c.data_vencimento), "dd/MM/yyyy"), c.status,
      ]),
      theme: "striped",
      headStyles: { fillColor: [180, 30, 30] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // Despesas Fixas
  if (despesasFixas.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFont("helvetica", "bold");
    doc.text("Despesas Fixas", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Descrição", "Categoria", "Valor Mensal", "Dia Venc.", "Status"]],
      body: despesasFixas.map((d) => [
        d.descricao, d.categoria, BRL(Number(d.valor)),
        `Dia ${d.dia_vencimento}`, d.ativa ? "Ativa" : "Inativa",
      ]),
      theme: "striped",
      headStyles: { fillColor: [200, 120, 0] },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer on each page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`HCGEO Geologia e Hidrogeologia LTDA — Relatório Financeiro — Página ${i}/${pages}`, 105, 290, { align: "center" });
  }

  doc.save(`Relatorio_Financeiro_${mesAtual}.pdf`);
}
