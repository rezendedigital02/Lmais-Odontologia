import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheets";
import { parseNumber } from "@/lib/utils";

// Use large ranges to ensure we capture all data; Google Sheets ignores empty trailing rows
const TAB_RANGES: Record<string, string> = {
  cod: "A1:Z100",
  agendamento: "A1:V500",
  meta: "A1:G500",
  nps: "A1:N100",
  repasse: "A1:F50",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tab: string }> }
) {
  try {
    const { tab } = await params;
    const tabLower = tab.toLowerCase();

    const tabNames: Record<string, string> = {
      cod: "COD",
      agendamento: "Agendamento",
      meta: "Meta",
      nps: "NPS",
      repasse: "Repasse",
    };

    const sheetName = tabNames[tabLower];
    if (!sheetName) {
      return NextResponse.json({ error: "Aba não encontrada" }, { status: 404 });
    }

    const range = TAB_RANGES[tabLower];
    const rawData = await getSheetData(sheetName, range);

    if (!rawData) {
      return NextResponse.json({ error: "Sem dados" }, { status: 404 });
    }

    const parsed = parseTabData(tabLower, rawData);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Sheets API error:", error);
    return NextResponse.json(
      { error: "Erro ao acessar planilha" },
      { status: 500 }
    );
  }
}

function parseTabData(tab: string, data: string[][]) {
  switch (tab) {
    case "cod":
      return parseCOD(data);
    case "agendamento":
      return parseAgendamento(data);
    case "meta":
      return parseMeta(data);
    case "nps":
      return parseNPS(data);
    case "repasse":
      return parseRepasse(data);
    default:
      return { raw: data };
  }
}

// ---------------------------------------------------------------------------
// COD Parser
// ---------------------------------------------------------------------------
// Structure:
//   Column A (index 0): Category group names, merged vertically
//     - Rows 7-18  = "Estrutura Física e Utilidades"
//     - Rows 19-24 = "Equipe e Encargos"
//     - Rows 25+   = "Administrativo/Sistema/Operacional", "Marketing", "Manutenção Básica"
//   Column B (index 1): Item name (e.g. "Aluguel", "IPTU", etc.)
//   Columns C-D (index 2-3): Value breakdown
//   Column E (index 4): Total per item
//   A specific row contains "Total" / "Total Geral" with grand total in column E
// ---------------------------------------------------------------------------
function parseCOD(data: string[][]) {
  const items: { categoria: string; item: string; valor: number }[] = [];
  const groups: Record<string, { categoria: string; item: string; valor: number }[]> = {};
  let currentGroup = "";
  let total = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const colA = row[0]?.trim() || "";
    const colB = row[1]?.trim() || "";
    const colE = row[4]?.trim() || "";

    // Column A carries the category group name (merged cells).
    // When A is non-empty and doesn't look like a header/total, update the current group.
    if (
      colA &&
      !colA.toLowerCase().includes("total") &&
      !colA.toLowerCase().includes("cod") &&
      !colA.toLowerCase().includes("custo") &&
      i >= 5 // skip header rows
    ) {
      // Only treat it as a group if it looks like a category name (not a number)
      if (!parseNumber(colA) || colA.length > 10) {
        currentGroup = colA;
        if (!groups[currentGroup]) groups[currentGroup] = [];
      }
    }

    // Detect total rows in either column A or B
    const totalCandidate = colA.toLowerCase() + " " + colB.toLowerCase();
    if (
      totalCandidate.includes("total geral") ||
      totalCandidate.includes("total cod") ||
      (totalCandidate.includes("total") &&
        !totalCandidate.includes("subtotal") &&
        colE)
    ) {
      const val = parseNumber(colE) || parseNumber(row[2]) || parseNumber(row[3]);
      if (val > 0) {
        total = val;
      }
    }

    // Parse item rows: need a non-empty item name in B, and a numeric value somewhere
    if (colB && i >= 5) {
      // Skip header-like rows and total rows
      if (
        colB.toLowerCase().includes("total") ||
        colB.toLowerCase() === "categoria" ||
        colB.toLowerCase() === "item" ||
        colB.toLowerCase() === "valor"
      ) {
        continue;
      }

      const valor = parseNumber(colE) || parseNumber(row[3]) || parseNumber(row[2]);
      if (valor > 0) {
        const item = { categoria: currentGroup || "Outros", item: colB, valor };
        items.push(item);
        const groupKey = currentGroup || "Outros";
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(item);
      }
    }
  }

  // If no total was found via row detection, try to read E7 directly (row index 6)
  if (total === 0 && data.length > 6 && data[6]) {
    const e7 = parseNumber(data[6][4]);
    if (e7 > 0) total = e7;
  }

  // Fallback: sum all items if still no total
  if (total === 0 && items.length > 0) {
    total = items.reduce((s, item) => s + item.valor, 0);
  }

  return { items, total, groups };
}

// ---------------------------------------------------------------------------
// Agendamento Parser
// ---------------------------------------------------------------------------
// Structure: Repeating blocks per week. Each block has:
//   - Optional "Semana X" header row in column A
//   - Day headers: "Segunda - 23/03", "Terça - 24/03", etc.
//   - Professional rows below each day: name in A, data in B-L
//     B(1): Agendados Plano
//     C(2): Agendados Particular
//     D(3): Comparecidos Plano
//     E(4): Comparecidos Particular
//     F(5): Orçamentos Plano
//     G(6): Orçamentos Particular
//     H(7): Fechados Plano
//     I(8): Fechados Particular
//     J(9): Fechados R$ Plano
//     K(10): Fechados R$ Particular
//     L(11): Total dia
//   - Weekly summaries in columns O-V (index 14-21) on the right side
// ---------------------------------------------------------------------------
function parseAgendamento(data: string[][]) {
  const daily: Record<string, unknown>[] = [];
  const weeklySummaries: Record<string, unknown>[] = [];

  let currentWeek = "";
  let currentDay = "";
  let weekCounter = 0;

  const dayPatterns = ["segunda", "terça", "terca", "quarta", "quinta", "sexta", "sábado", "sabado"];
  const profNames = ["luciana", "pedro", "leila", "giovanna", "joice"];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const colA = row[0]?.trim() || "";
    const colALower = colA.toLowerCase();

    // Detect week headers
    if (colALower.includes("semana")) {
      currentWeek = colA;
      weekCounter++;
      continue;
    }

    // Detect day headers (e.g. "Segunda - 23/03" or just "Segunda")
    const isDayHeader = dayPatterns.some((d) => colALower.startsWith(d));
    if (isDayHeader) {
      currentDay = colA;
      // Auto-assign week if none was explicitly set
      if (!currentWeek) {
        currentWeek = `Semana ${weekCounter + 1}`;
        weekCounter++;
      }
      continue;
    }

    // Detect professional rows: column A has a name that matches known professionals,
    // AND there's some numeric data in the following columns
    const isProfessional = profNames.some((p) => colALower.includes(p));
    const hasData =
      row.length > 1 &&
      row.slice(1, 12).some((c) => c && parseNumber(c) > 0);

    if (isProfessional && currentDay && hasData) {
      daily.push({
        semana: currentWeek,
        profissional: colA,
        dia: currentDay,
        agendadosPlano: parseNumber(row[1]),
        agendadosParticular: parseNumber(row[2]),
        comparecidosPlano: parseNumber(row[3]),
        comparecidosParticular: parseNumber(row[4]),
        orcamentosPlano: parseNumber(row[5]),
        orcamentosParticular: parseNumber(row[6]),
        fechadosPlano: parseNumber(row[7]),
        fechadosParticular: parseNumber(row[8]),
        fechadosRsPlano: parseNumber(row[9]),
        fechadosRsParticular: parseNumber(row[10]),
        totalDia: parseNumber(row[11]),
      });
      continue;
    }

    // Also capture rows that aren't named professionals but follow a day header
    // and have numeric data - they might be additional team members
    if (colA && currentDay && hasData && !isDayHeader && colA.length > 1) {
      // Check it's not a header/total row
      if (
        !colALower.includes("total") &&
        !colALower.includes("agendado") &&
        !colALower.includes("capacidade") &&
        !colALower.includes("semana")
      ) {
        daily.push({
          semana: currentWeek,
          profissional: colA,
          dia: currentDay,
          agendadosPlano: parseNumber(row[1]),
          agendadosParticular: parseNumber(row[2]),
          comparecidosPlano: parseNumber(row[3]),
          comparecidosParticular: parseNumber(row[4]),
          orcamentosPlano: parseNumber(row[5]),
          orcamentosParticular: parseNumber(row[6]),
          fechadosPlano: parseNumber(row[7]),
          fechadosParticular: parseNumber(row[8]),
          fechadosRsPlano: parseNumber(row[9]),
          fechadosRsParticular: parseNumber(row[10]),
          totalDia: parseNumber(row[11]),
        });
      }
    }

    // Parse weekly summaries from columns O-V (index 14-21)
    // These appear on the right side of the sheet, alongside the daily data
    if (row.length > 14) {
      const colO = row[14]?.trim() || "";
      const colOLower = colO.toLowerCase();

      if (colOLower && (
        colOLower.includes("total") ||
        colOLower.includes("capacidade") ||
        colOLower.includes("comparec") ||
        colOLower.includes("agendamento") ||
        colOLower.includes("orçamento") ||
        colOLower.includes("orcamento") ||
        colOLower.includes("fechado") ||
        colOLower.includes("venda") ||
        colOLower.includes("conversão") ||
        colOLower.includes("conversao")
      )) {
        weeklySummaries.push({
          semana: currentWeek,
          label: colO,
          valorPlano: parseNumber(row[15]),
          valorParticular: parseNumber(row[16]),
          valor3: parseNumber(row[17]),
          valor4: parseNumber(row[18]),
          valor5: parseNumber(row[19]),
          valor6: parseNumber(row[20]),
          valor7: parseNumber(row[21]),
        });
      }
    }
  }

  // Build structured weekly summaries by aggregating raw summary rows per week
  const weeklyAggregated = buildWeeklyAggregates(weeklySummaries, daily);

  return { daily, weeklySummaries: weeklyAggregated };
}

function buildWeeklyAggregates(
  rawSummaries: Record<string, unknown>[],
  daily: Record<string, unknown>[]
) {
  // Group daily data by week and compute aggregates
  const weekMap = new Map<string, Record<string, unknown>[]>();
  for (const d of daily) {
    const week = d.semana as string;
    if (!weekMap.has(week)) weekMap.set(week, []);
    weekMap.get(week)!.push(d);
  }

  const aggregated: Record<string, unknown>[] = [];

  for (const [week, days] of weekMap.entries()) {
    const agPlano = days.reduce((s, d) => s + ((d.agendadosPlano as number) || 0), 0);
    const agPart = days.reduce((s, d) => s + ((d.agendadosParticular as number) || 0), 0);
    const compPlano = days.reduce((s, d) => s + ((d.comparecidosPlano as number) || 0), 0);
    const compPart = days.reduce((s, d) => s + ((d.comparecidosParticular as number) || 0), 0);
    const orcTotal = days.reduce(
      (s, d) => s + ((d.orcamentosPlano as number) || 0) + ((d.orcamentosParticular as number) || 0),
      0
    );
    const fechTotal = days.reduce(
      (s, d) => s + ((d.fechadosPlano as number) || 0) + ((d.fechadosParticular as number) || 0),
      0
    );
    const totalRs = days.reduce(
      (s, d) => s + ((d.fechadosRsPlano as number) || 0) + ((d.fechadosRsParticular as number) || 0),
      0
    );

    // Also try to extract from the raw summary rows for this week
    const weekSummaries = rawSummaries.filter((s) => s.semana === week);
    let capacidade = 0;
    let totalFechadosRs = totalRs;

    for (const s of weekSummaries) {
      const label = ((s.label as string) || "").toLowerCase();
      if (label.includes("capacidade")) {
        capacidade =
          (s.valorPlano as number) ||
          (s.valorParticular as number) ||
          (s.valor3 as number) ||
          0;
      }
      if (label.includes("fechado") && label.includes("r$")) {
        const fromSummary =
          (s.valorPlano as number) ||
          (s.valorParticular as number) ||
          0;
        if (fromSummary > 0) totalFechadosRs = fromSummary;
      }
      if (label.includes("venda")) {
        const fromSummary =
          (s.valorPlano as number) ||
          (s.valorParticular as number) ||
          0;
        if (fromSummary > 0) totalFechadosRs = fromSummary;
      }
    }

    const totalAgendados = agPlano + agPart;
    const totalComparecidos = compPlano + compPart;

    aggregated.push({
      semana: week,
      agendadosPlano: agPlano,
      agendadosParticular: agPart,
      comparecidosPlano: compPlano,
      comparecidosParticular: compPart,
      capacidade,
      pctAgendamentoCapacidade:
        capacidade > 0 ? (totalAgendados / capacidade) * 100 : 0,
      pctComparecidos:
        totalAgendados > 0 ? (totalComparecidos / totalAgendados) * 100 : 0,
      orcamentos: orcTotal,
      fechados: fechTotal,
      totalFechadosRs,
      pctConversao: orcTotal > 0 ? (fechTotal / orcTotal) * 100 : 0,
    });
  }

  return aggregated;
}

// ---------------------------------------------------------------------------
// Meta Parser
// ---------------------------------------------------------------------------
// Structure: Multiple month blocks stacked vertically.
//   Column A (0): Month name (e.g. "Abril 26") — appears once at the start of each block
//   Column B (1): Day number (1, 2, 6, 7, ...)
//   Column C (2): Meta diária
//   Column D (3): Alcançado (daily)
//   Column E (4): Faltam (daily)
//   Column F (5): Summary labels OR values for the month
//   Column G (6): Summary values
//
// IMPORTANT: We must find the LAST (current) month block and only parse that.
// The user reports April 26 starts at row 221 with:
//   F222 = Meta mensal = R$ 150.000,00
//   F226 = Alcançado = R$ 13.612,42
//   F230 = Atingido = 9,07%
// ---------------------------------------------------------------------------
function parseMeta(data: string[][]) {
  // Step 1: Find all month block start positions (rows where column A has a month name)
  const monthStarts: { row: number; name: string }[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const colA = row[0]?.trim() || "";
    // Month names: "Janeiro 26", "Fevereiro 26", "Março 26", "Abril 26", etc.
    // Or just "Janeiro", "Fevereiro", etc.
    if (colA && isMonthName(colA)) {
      monthStarts.push({ row: i, name: colA });
    }
  }

  // Use the LAST month block (current month)
  if (monthStarts.length === 0) {
    return {
      mes: "",
      metaMensal: 0,
      metaDiaria: 0,
      alcancadoTotal: 0,
      faltam: 0,
      pctAtingido: 0,
      dias: [],
    };
  }

  const currentMonth = monthStarts[monthStarts.length - 1];
  const startRow = currentMonth.row;
  const endRow =
    monthStarts.length > 1
      ? data.length // go to end since it's the last month
      : data.length;

  // Step 2: Extract summary data from columns F-G within this month block
  let metaMensal = 0;
  let metaDiaria = 0;
  let alcancadoTotal = 0;
  let faltam = 0;
  let pctAtingido = 0;

  for (let i = startRow; i < endRow; i++) {
    const row = data[i];
    if (!row) continue;

    const colF = row[5]?.trim() || "";
    const colG = row[6]?.trim() || "";
    const colFLower = colF.toLowerCase();

    // Try label in F, value in G
    if (colFLower && colG) {
      if (colFLower.includes("meta") && colFLower.includes("mensal")) {
        metaMensal = parseNumber(colG);
      } else if (colFLower.includes("meta") && colFLower.includes("diária")) {
        metaDiaria = parseNumber(colG);
      } else if (colFLower.includes("meta") && colFLower.includes("diaria")) {
        metaDiaria = parseNumber(colG);
      } else if (colFLower.includes("alcançado") || colFLower.includes("alcancado")) {
        alcancadoTotal = parseNumber(colG);
      } else if (colFLower.includes("falta")) {
        faltam = parseNumber(colG);
      } else if (colFLower.includes("atingido")) {
        pctAtingido = parseNumber(colG);
      }
    }

    // Also try: label in E, value in F (alternative layout)
    const colE = row[4]?.trim() || "";
    const colELower = colE.toLowerCase();
    if (colELower && colF) {
      if (colELower.includes("meta") && colELower.includes("mensal") && !metaMensal) {
        metaMensal = parseNumber(colF);
      } else if ((colELower.includes("meta") && colELower.includes("diária")) && !metaDiaria) {
        metaDiaria = parseNumber(colF);
      } else if ((colELower.includes("alcançado") || colELower.includes("alcancado")) && !alcancadoTotal) {
        alcancadoTotal = parseNumber(colF);
      } else if (colELower.includes("falta") && !faltam) {
        faltam = parseNumber(colF);
      } else if (colELower.includes("atingido") && !pctAtingido) {
        pctAtingido = parseNumber(colF);
      }
    }

    // Also try: F has a keyword AND a numeric value in the same cell (e.g. "R$ 150.000,00")
    // or F is purely a label-like value at a known position
    if (colFLower.includes("meta") && !metaMensal) {
      const numInF = parseNumber(colF);
      if (numInF > 1000) metaMensal = numInF;
    }
  }

  // Step 3: Extract daily data from columns B-E
  const dias: {
    dia: number;
    metaDiaria: number;
    alcancado: number;
    faltam: number;
  }[] = [];

  for (let i = startRow; i < endRow; i++) {
    const row = data[i];
    if (!row) continue;

    const colB = row[1]?.trim() || "";
    const dayNum = parseInt(colB);

    if (dayNum > 0 && dayNum <= 31) {
      dias.push({
        dia: dayNum,
        metaDiaria: parseNumber(row[2]),
        alcancado: parseNumber(row[3]),
        faltam: parseNumber(row[4]),
      });
    }
  }

  // Step 4: Calculate accumulated values
  let metaAcc = 0;
  let alcAcc = 0;
  const diasComAcumulado = dias.map((d) => {
    metaAcc += d.metaDiaria;
    alcAcc += d.alcancado;
    return { ...d, metaAcumulada: metaAcc, alcancadoAcumulado: alcAcc };
  });

  // Step 5: Fallback calculations
  if (!metaMensal && metaDiaria && dias.length) {
    metaMensal = metaDiaria * dias.length;
  }
  if (!alcancadoTotal && dias.length) {
    alcancadoTotal = dias.reduce((s, d) => s + d.alcancado, 0);
  }
  if (!faltam && metaMensal) {
    faltam = Math.max(0, metaMensal - alcancadoTotal);
  }
  if (!pctAtingido && metaMensal) {
    pctAtingido = (alcancadoTotal / metaMensal) * 100;
  }

  return {
    mes: currentMonth.name,
    metaMensal,
    metaDiaria,
    alcancadoTotal,
    faltam,
    pctAtingido,
    dias: diasComAcumulado,
  };
}

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function isMonthName(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return MONTH_NAMES.some((m) => lower.startsWith(m));
}

// ---------------------------------------------------------------------------
// NPS Parser (working correctly per user feedback — kept as-is)
// ---------------------------------------------------------------------------
function parseNPS(data: string[][]) {
  const responses: Record<string, unknown>[] = [];
  const criteriaKeys = [
    "facilidadeClareza",
    "pontualidade",
    "limpeza",
    "atendimentoRecepcao",
    "profissionalismo",
    "explicacaoProcedimento",
    "conforto",
    "tempoEspera",
    "custoBeneficio",
    "acompanhamentoPos",
  ];
  const criteriaLabels = [
    "Clareza das informações",
    "Pontualidade",
    "Limpeza e organização",
    "Atendimento da recepção",
    "Profissionalismo",
    "Explicação do procedimento",
    "Conforto",
    "Tempo de espera",
    "Custo-benefício",
    "Acompanhamento pós",
  ];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    const date = row[0]?.trim();
    const paciente = row[1]?.trim();
    if (!date || !paciente) continue;

    const response: Record<string, unknown> = { data: date, paciente };
    for (let j = 0; j < criteriaKeys.length; j++) {
      response[criteriaKeys[j]] = parseNumber(row[j + 2]);
    }
    response.comentario = row[12]?.trim() || "";
    responses.push(response);
  }

  const criteriaAverages: Record<string, number> = {};
  for (let j = 0; j < criteriaKeys.length; j++) {
    const values = responses
      .map((r) => r[criteriaKeys[j]] as number)
      .filter((v) => v > 0);
    criteriaAverages[criteriaLabels[j]] =
      values.length > 0
        ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
        : 0;
  }

  function calcNPS(resps: Record<string, unknown>[]) {
    const scores = resps.map((r) => {
      const vals = criteriaKeys.map((k) => r[k] as number).filter((v) => v > 0);
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    });
    const promotores = scores.filter((s) => s >= 9.5).length;
    const neutros = scores.filter((s) => s >= 8.5 && s < 9.5).length;
    const detratores = scores.filter((s) => s > 0 && s < 8.5).length;
    const total = promotores + neutros + detratores;
    const nps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0;
    return { promotores, neutros, detratores, nps, total };
  }

  const allNPS = calcNPS(responses);
  const periods = [{ label: "Todo período", ...allNPS }];

  return { responses, periods, criteriaAverages };
}

// ---------------------------------------------------------------------------
// Repasse Parser (working correctly per user feedback — kept as-is)
// ---------------------------------------------------------------------------
function parseRepasse(data: string[][]) {
  const items: {
    procedimento: string;
    valor: number;
    repasseAtual: number;
    repasseIdeal: number;
    diferenca: number;
    convenio: string;
  }[] = [];

  let currentConvenio = "";
  const convenios = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;

    const colB = row[1]?.trim() || "";
    const colC = row[2]?.trim() || "";

    if (
      colB &&
      !parseNumber(colC) &&
      !row[3]?.trim() &&
      !row[4]?.trim()
    ) {
      currentConvenio = colB;
      convenios.add(currentConvenio);
      continue;
    }

    if (colB && parseNumber(colC)) {
      items.push({
        procedimento: colB,
        valor: parseNumber(colC),
        repasseAtual: parseNumber(row[3]),
        repasseIdeal: parseNumber(row[4]),
        diferenca: parseNumber(row[5]),
        convenio: currentConvenio,
      });
    }
  }

  return { items, convenios: Array.from(convenios) };
}
