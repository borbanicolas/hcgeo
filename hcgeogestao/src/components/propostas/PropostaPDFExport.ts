import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PropostaPDF {
  numero: string;
  revisao: string;
  titulo: string;
  contratante_nome: string;
  contato_nome: string;
  contato_telefone: string;
  contato_email: string;
  local_obra: string;
  tipo_servico: string;
  data_emissao: string;
  validade_dias: number;
  forma_pagamento: string;
  condicoes_pagamento: string;
  prazo_inicio: string;
  prazo_execucao_campo: string;
  prazo_entrega_relatorio: string;
  prazo_execucao: string;
  encargos_contratante: string;
  encargos_contratada: string;
  condicoes_gerais: string;
  cancelamento_suspensao: string;
  notas_complementares: string;
  observacoes: string;
  desconto_percentual: number;
  itens: {
    item_numero: string;
    descricao: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    is_grupo: boolean;
    grupo_nome: string;
  }[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtDate = (d: string) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR");
};

const FOOTER_LINE1 = "HCGEO GEOLOGIA E HIDROGEOLOGIA LTDA – CNPJ 41.033.704/0001-48";
const FOOTER_LINE2 = "Rua Frederico Augusto Luiz Thieme, Nº 117, Sala 4B, Centro, Itajaí / SC";
const FOOTER_LINE3 = "(47) 98814-5091 / 3311-5999 – comercial@hcgeo.com.br";

// ABNT NBR 14724 margins: top 3cm, bottom 2cm, left 3cm, right 2cm
const MARGIN_TOP = 30;    // 3cm
const MARGIN_BOTTOM = 20; // 2cm
const MARGIN_LEFT = 30;   // 3cm
const MARGIN_RIGHT = 20;  // 2cm
const LINE_HEIGHT = 6;    // ~1.5 line spacing for 10pt font
const FONT_SIZE_BODY = 10;
const FONT_SIZE_SECTION = 12;
const FONT_SIZE_HEADER = 14;

async function loadImageBase64(path: string): Promise<string | null> {
  try {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addFooter(doc: jsPDF, startPage = 1) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = startPage; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageH - MARGIN_BOTTOM;
    doc.setDrawColor(60, 60, 60);
    doc.line(MARGIN_LEFT, footerY - 2, pageW - MARGIN_RIGHT, footerY - 2);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(FOOTER_LINE1, pageW / 2, footerY + 2, { align: "center" });
    doc.text(FOOTER_LINE2, pageW / 2, footerY + 5, { align: "center" });
    doc.text(FOOTER_LINE3, pageW / 2, footerY + 8, { align: "center" });
    doc.text(`Página ${i - startPage + 1} de ${pageCount - startPage + 1}`, pageW - MARGIN_RIGHT, footerY + 12, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
}

export async function exportPropostaPDF(p: PropostaPDF) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN_LEFT - MARGIN_RIGHT;
  const maxY = pageH - MARGIN_BOTTOM - 15; // space for footer

  // === COVER PAGE ===
  const capaData = await loadImageBase64("/images/capa-proposta.jpg");
  if (capaData) {
    doc.addImage(capaData, "JPEG", 0, 0, pageW, pageH);
  } else {
    doc.setFillColor(20, 50, 90);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("HCGEO", pageW / 2, pageH / 2 - 20, { align: "center" });
    doc.setFontSize(20);
    doc.text("PROPOSTA TÉCNICA", pageW / 2, pageH / 2, { align: "center" });
    doc.text("COMERCIAL", pageW / 2, pageH / 2 + 12, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // === CONTENT PAGES (start from page 2) ===
  doc.addPage();
  let y = MARGIN_TOP;

  const checkPage = (need: number) => {
    if (y + need > maxY) {
      doc.addPage();
      y = MARGIN_TOP;
    }
  };

  const addJustifiedText = (text: string, x: number, width: number) => {
    // Split by explicit newlines first to handle multi-paragraph content
    const paragraphs = text.split("\n");
    paragraphs.forEach((paragraph, pIdx) => {
      if (!paragraph.trim()) { y += LINE_HEIGHT / 2; return; }
      const lines = doc.splitTextToSize(paragraph, width);
      lines.forEach((line: string, idx: number) => {
        checkPage(LINE_HEIGHT);
        // Justify all lines except the very last line of the last paragraph
        const isLastLineOfLastParagraph = (pIdx === paragraphs.length - 1) && (idx === lines.length - 1);
        if (!isLastLineOfLastParagraph && lines.length > 1) {
          doc.text(line, x, y, { align: "justify", maxWidth: width });
        } else {
          doc.text(line, x, y);
        }
        y += LINE_HEIGHT;
      });
    });
  };

  const addSection = (title: string, content: string) => {
    if (!content?.trim()) return;
    checkPage(20);
    doc.setFontSize(FONT_SIZE_SECTION);
    doc.setFont("helvetica", "bold");
    doc.text(title, MARGIN_LEFT, y);
    y += LINE_HEIGHT + 2;
    doc.setFontSize(FONT_SIZE_BODY);
    doc.setFont("helvetica", "normal");
    addJustifiedText(content, MARGIN_LEFT, contentW);
    y += LINE_HEIGHT;
  };

  // === HEADER WITH LOGO ===
  const logoData = await loadImageBase64("/images/hcgeo-logo.png");
  if (logoData) {
    doc.addImage(logoData, "PNG", MARGIN_LEFT, y, 30, 30);
    doc.setFontSize(FONT_SIZE_HEADER);
    doc.setFont("helvetica", "bold");
    doc.text("PROPOSTA TÉCNICA COMERCIAL", MARGIN_LEFT + 35, y + 12);
    doc.setFontSize(FONT_SIZE_BODY);
    doc.setFont("helvetica", "normal");
    doc.text(`${p.numero} – ${p.revisao}`, MARGIN_LEFT + 35, y + 19);
    y += 38;
  } else {
    doc.setFontSize(FONT_SIZE_HEADER);
    doc.setFont("helvetica", "bold");
    doc.text("PROPOSTA TÉCNICA COMERCIAL", pageW / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(FONT_SIZE_BODY);
    doc.setFont("helvetica", "normal");
    doc.text(`${p.numero} – ${p.revisao}`, pageW / 2, y, { align: "center" });
    y += 12;
  }

  // === APRESENTAÇÃO DA EMPRESA ===
  const apresentacao = [
    "A HCGEO – Geologia e Hidrogeologia é uma empresa especializada em soluções técnicas nas áreas de geologia, hidrogeologia, geotecnia e geofísica aplicada, oferecendo suporte completo para empreendimentos públicos e privados em todo o território nacional.",
    "",
    "Contamos com uma equipe altamente qualificada, formada por profissionais com especialização técnica e mais de 15 anos de experiência em estudos do meio físico, investigação do subsolo, monitoramento ambiental e modelagem hidrogeológica. Nosso compromisso é entregar resultados precisos, confiáveis e tecnicamente embasados, de acordo com as normas vigentes e exigências dos órgãos ambientais. Com uma abordagem integrada e multidisciplinar, a HCGEO desenvolve desde estudos preliminares até pareceres conclusivos, incluindo:",
  ];

  const servicosLista = [
    "Investigação hidrogeológica, projetos de rebaixamento do lençol freático e outorga de uso da água subterrânea e perfuração de poços artesianos;",
    "Estudos geotécnicos para fundações, taludes e estabilidade de encostas;",
    "Análises geofísicas, como GPR, eletrorresistividade e sísmica;",
    "Caracterização do meio físico para fins de licenciamento ambiental;",
    "Sondagens geológicas-geotécnicas (SPT, Rotativa, CPT/CPTu, Vane Test, Trado).",
  ];

  const apresentacaoFinal = [
    "Nosso diferencial está na rigorosidade técnica, agilidade na entrega e na capacidade de adaptar soluções às particularidades de cada projeto, sempre prezando pela integridade ambiental e segurança das obras. Para conhecer mais sobre nossos serviços e projetos realizados, acesse:",
    "www.hcgeo.com.br",
  ];

  doc.setFontSize(FONT_SIZE_SECTION);
  doc.setFont("helvetica", "bold");
  doc.text("APRESENTAÇÃO", MARGIN_LEFT, y);
  y += LINE_HEIGHT + 2;

  doc.setFontSize(FONT_SIZE_BODY);
  doc.setFont("helvetica", "normal");
  apresentacao.forEach((paragrafo) => {
    if (!paragrafo) { y += LINE_HEIGHT / 2; return; }
    addJustifiedText(paragrafo, MARGIN_LEFT, contentW);
  });

  y += 2;
  servicosLista.forEach((item) => {
    const lines = doc.splitTextToSize(`•  ${item}`, contentW - 6);
    lines.forEach((line: string, idx: number) => {
      checkPage(LINE_HEIGHT);
      if (idx < lines.length - 1) {
        doc.text(line, MARGIN_LEFT + (idx === 0 ? 0 : 4), y, { align: "justify", maxWidth: contentW - 6 });
      } else {
        doc.text(line, MARGIN_LEFT + (idx === 0 ? 0 : 4), y);
      }
      y += LINE_HEIGHT;
    });
  });

  y += 2;
  apresentacaoFinal.forEach((paragrafo, idx) => {
    if (idx === 1) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 80, 160);
      doc.text(paragrafo, MARGIN_LEFT, y);
      y += LINE_HEIGHT;
    } else {
      addJustifiedText(paragrafo, MARGIN_LEFT, contentW);
    }
  });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  y += LINE_HEIGHT;

  // Separator before client data
  doc.setDrawColor(180, 180, 180);
  doc.line(MARGIN_LEFT, y, pageW - MARGIN_RIGHT, y);
  y += LINE_HEIGHT + 2;

  // Dados gerais
  const addField = (label: string, value: string) => {
    if (!value) return;
    checkPage(LINE_HEIGHT);
    doc.setFontSize(FONT_SIZE_BODY);
    doc.setFont("helvetica", "bold");
    doc.text(label, MARGIN_LEFT, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, MARGIN_LEFT + 38, y);
    y += LINE_HEIGHT;
  };

  addField("CONTRATANTE:", p.contratante_nome || "—");
  addField("A/C:", p.contato_nome);
  addField("E-mail:", p.contato_email);
  addField("Telefone:", p.contato_telefone);
  addField("Objeto:", `${p.titulo} – ${p.tipo_servico}`);
  addField("Local:", p.local_obra);
  addField("Data:", fmtDate(p.data_emissao));
  y += LINE_HEIGHT;

  // === PAGE 3: Item 1 em diante ===
  doc.addPage();
  y = MARGIN_TOP;

  // 1. PREVISÃO DE CUSTO
  if (p.itens.length > 0) {
    doc.setFontSize(FONT_SIZE_SECTION);
    doc.setFont("helvetica", "bold");
    doc.text("1. PREVISÃO DE CUSTO GLOBAL DAS ATIVIDADES", MARGIN_LEFT, y);
    y += LINE_HEIGHT + 2;

    const tableBody: any[] = [];
    p.itens.forEach((item) => {
      if (item.is_grupo) {
        tableBody.push([
          { content: item.item_numero, styles: { fontStyle: "bold" } },
          { content: item.grupo_nome, colSpan: 4, styles: { fontStyle: "bold" } },
        ]);
      } else {
        tableBody.push([
          item.item_numero,
          item.descricao,
          `${item.quantidade} ${item.unidade}`,
          fmt(item.valor_unitario),
          fmt(item.valor_total),
        ]);
      }
    });

    const subtotal = p.itens.filter(i => !i.is_grupo).reduce((s, i) => s + i.valor_total, 0);
    const desconto = subtotal * (p.desconto_percentual / 100);
    const total = subtotal - desconto;

    tableBody.push([
      { content: "", colSpan: 3 },
      { content: "Subtotal:", styles: { fontStyle: "bold" } },
      { content: fmt(subtotal), styles: { fontStyle: "bold" } },
    ]);

    if (p.desconto_percentual > 0) {
      tableBody.push([
        { content: "", colSpan: 3 },
        { content: `Desconto (${p.desconto_percentual}%):`, styles: { fontStyle: "bold" } },
        { content: `- ${fmt(desconto)}`, styles: { fontStyle: "bold" } },
      ]);
    }

    tableBody.push([
      { content: "", colSpan: 3 },
      { content: "TOTAL GLOBAL:", styles: { fontStyle: "bold", fontSize: FONT_SIZE_BODY } },
      { content: fmt(total), styles: { fontStyle: "bold", fontSize: FONT_SIZE_BODY } },
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Item", "Descrição", "Qtd./Un.", "Preço Unit.", "Preço Total"]],
      body: tableBody,
      margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT },
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold" },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + LINE_HEIGHT + 2;
  }

  // 2. Forma de pagamento
  addSection("2. MEDIÇÕES E FORMAS DE PAGAMENTO", p.forma_pagamento || p.condicoes_pagamento);

  // 3. Validade
  addSection("3. VALIDADE DA PROPOSTA", `Esta proposta tem validade de ${p.validade_dias} dias a contar da data de emissão.`);

  // 4. Prazos
  const prazosText = [
    p.prazo_inicio ? `Previsão de início: ${p.prazo_inicio}` : "",
    p.prazo_execucao_campo ? `Execução em campo: ${p.prazo_execucao_campo}` : "",
    p.prazo_entrega_relatorio ? `Entrega do relatório: ${p.prazo_entrega_relatorio}` : "",
    p.prazo_execucao ? `Prazo geral: ${p.prazo_execucao}` : "",
  ].filter(Boolean).join("\n");
  addSection("4. PRAZO DE EXECUÇÃO", prazosText);

  // 5-9 Clauses
  addSection("5. ENCARGOS DA CONTRATANTE", p.encargos_contratante);
  addSection("6. ENCARGOS DA CONTRATADA", p.encargos_contratada);
  addSection("7. CONDIÇÕES GERAIS", p.condicoes_gerais);
  addSection("8. CANCELAMENTO, SUSPENSÃO E INADIMPLÊNCIA", p.cancelamento_suspensao);

  if (p.notas_complementares) {
    addSection("9. NOTAS E OBSERVAÇÕES TÉCNICAS COMPLEMENTARES", p.notas_complementares);
  }

  // 10. AUTORIZAÇÃO PARA EXECUÇÃO DOS SERVIÇOS
  checkPage(50);
  y += LINE_HEIGHT;
  doc.setFontSize(FONT_SIZE_SECTION);
  doc.setFont("helvetica", "bold");
  doc.text("10. AUTORIZAÇÃO PARA EXECUÇÃO DOS SERVIÇOS", MARGIN_LEFT, y);
  y += LINE_HEIGHT + 2;
  doc.setFontSize(FONT_SIZE_BODY);
  doc.setFont("helvetica", "normal");
  const authText = "Caso V.Sa., esteja de acordo com os termos desta proposta, solicitamos a formalização do aceite por meio da assinatura abaixo ou por mensagem via e-mail ou WhatsApp, conforme descrito no Item 7.1.";
  addJustifiedText(authText, MARGIN_LEFT, contentW);
  y += LINE_HEIGHT;

  doc.setFont("helvetica", "bold");
  doc.text("Autorização:", MARGIN_LEFT, y);
  y += LINE_HEIGHT;
  doc.setFont("helvetica", "normal");
  const declText = "Declaro, para os devidos fins, que estou de acordo com todos os termos apresentados nesta proposta e autorizo a execução dos serviços conforme especificado.";
  addJustifiedText(declText, MARGIN_LEFT, contentW);
  y += LINE_HEIGHT * 2;

  checkPage(20);
  doc.text("Assinatura: ____________________________________    Data: _____/_____/_____", MARGIN_LEFT, y);
  y += LINE_HEIGHT * 3;

  // Separator
  doc.setDrawColor(180, 180, 180);
  doc.line(MARGIN_LEFT, y, pageW - MARGIN_RIGHT, y);
  y += LINE_HEIGHT + 2;

  // Closing
  checkPage(40);
  doc.setFontSize(FONT_SIZE_BODY);
  doc.text("Permanecemos à disposição de V.Sa. para eventuais esclarecimentos.", MARGIN_LEFT, y);
  y += LINE_HEIGHT;
  doc.text("Atenciosamente,", MARGIN_LEFT, y);
  y += LINE_HEIGHT * 3;

  // Signature block
  doc.setDrawColor(60, 60, 60);
  doc.line(MARGIN_LEFT, y, MARGIN_LEFT + 80, y);
  y += LINE_HEIGHT;
  doc.setFontSize(FONT_SIZE_BODY);
  doc.setFont("helvetica", "bold");
  doc.text("Departamento Comercial", MARGIN_LEFT, y);
  y += LINE_HEIGHT;
  doc.setFont("helvetica", "normal");
  doc.text("ALEXANDRE R. M. GALVES", MARGIN_LEFT, y);
  y += LINE_HEIGHT;
  doc.text("Geólogo / Esp. Eng. Geotécnica", MARGIN_LEFT, y);
  y += LINE_HEIGHT;
  doc.text("CREA/SC 145320-7", MARGIN_LEFT, y);
  y += LINE_HEIGHT;
  doc.text("(47) 98814-5091 / comercial@hcgeo.com.br", MARGIN_LEFT, y);

  // Add footer to all pages except cover
  addFooter(doc, 2);

  const fileName = `${p.numero}_${p.revisao}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
  doc.save(`${fileName}.pdf`);
}
