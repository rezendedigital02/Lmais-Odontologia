import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheets";
import { parseNumber } from "@/lib/utils";

// Use open-ended ranges so Google Sheets returns all rows
const TAB_RANGES: Record<string, string> = {
  cod: "A1:D100",
  agendamento: "A1:V500",
  meta: "A1:F500",
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
// Real structure (0-based indices):
//   Col 0 (A): Category group name — only on the FIRST row of each group, "" for the rest
//   Col 1 (B): Item name
//   Col 2 (C): Individual value (format " R$  2.701,76 ")
//   Col 3 (D): TOTAL — only row_6[3] has the grand total " R$  23.408,04 "
//
// Groups (0-based row indices):
//   row_6  to row_17: "Estrutura Física e Utilidades" (12 items)
//   row_18 to row_24: "Equipe e Encargos" (7 items)
//   row_25 to row_31: "Administrativo, Sistemas e Operação" (7 items)
//   row_32 to row_35: "Manutenção básica" (4 items)
// ---------------------------------------------------------------------------
function parseCOD(data: string[][]) {
  const items: { categoria: string; item: string; valor: number }[] = [];
  const groups: Record<string, { categoria: string; item: string; valor: number }[]> = {};

  // Grand total is ALWAYS at row_6[3] (cell D7)
  const total = data[6] ? parseNumber(data[6][3]) : 0;

  let currentGroup = "";

  // Data starts at row index 6
  for (let i = 6; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const colA = row[0]?.trim() || "";
    const colB = row[1]?.trim() || "";
    const colC = row[2]?.trim() || "";

    // When column A has text, it's a new category group
    if (colA) {
      currentGroup = colA;
    }

    // Skip rows without an item name or without a value
    if (!colB || !colC) continue;

    const valor = parseNumber(colC);
    // Skip zero or invalid values, and skip header-like text
    if (valor <= 0) continue;

    const groupKey = currentGroup || "Outros";
    if (!groups[groupKey]) groups[groupKey] = [];

    const item = { categoria: groupKey, item: colB, valor };
    items.push(item);
    groups[groupKey].push(item);
  }

  return { items, total, groups };
}

// ---------------------------------------------------------------------------
// Agendamento Parser
// ---------------------------------------------------------------------------
// Real structure — repeating blocks per week:
//
//   row N+0: col 0 = "Acompanhamento semanal" (or week number like "1")
//   row N+1: col 1 = "Segunda - 23/03", col 14+ = "Total semana - ..."
//   row N+2: col 0 = date range "23/03 a 27/03", col 1 = "Profissional",
//            col 2 = "Agendados", col 4 = "Comparecidos", etc. (header row)
//   row N+3: subheader: col 2 = "Plano", col 3 = "Particular", ...
//   row N+4: col 1 = "Luciana", col 2..13 = data
//   row N+5: col 1 = "Pedro", col 2..13 = data
//   ...more professionals...
//   row N+X: col 1 = "Terça - 24/03" (next day header)
//   ...repeats...
//
// Professional data columns (0-based):
//   1: Name, 2: Ag.Plano, 3: Ag.Part, 4: Comp.Plano, 5: Comp.Part,
//   6: Orç.Plano, 7: Orç.Part, 8: Fech.Plano, 9: Fech.Part,
//   10: Fech$.Plano, 11: Fech$.Part, 12: Total.Plano, 13: Total.Part
//
// Weekly summary (cols 14-21) on the right side, at various rows within the
// week block. Key-value pairs appear in cols 20-21 area.
// ---------------------------------------------------------------------------
function parseAgendamento(data: string[][]) {
  const daily: Record<string, unknown>[] = [];
  const rawSummaryRows: { semana: string; row: string[] }[] = [];

  let currentWeek = "";
  let currentDay = "";
  let weekCounter = 0;

  const dayPattern = /^(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado)/i;
  const profNames = ["luciana", "pedro", "leila", "giovanna", "joice"];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const col0 = row[0]?.trim() || "";
    const col1 = row[1]?.trim() || "";
    const col1Lower = col1.toLowerCase();

    // Detect week start: col 0 has number or "Acompanhamento"
    if (
      col0.toLowerCase().includes("acompanhamento") ||
      (col0 && /^\d+$/.test(col0) && col1Lower.includes("segunda"))
    ) {
      weekCounter++;
      currentWeek = `Semana ${weekCounter}`;
      currentDay = "";
    }

    // Detect day header in col 1: "Segunda - 23/03"
    if (col1 && dayPattern.test(col1) && col1.includes("-")) {
      currentDay = col1;
      if (!currentWeek) {
        weekCounter++;
        currentWeek = `Semana ${weekCounter}`;
      }
      continue;
    }

    // Detect professional rows: col 1 has a name, col 2 has data
    if (col1 && currentDay) {
      const isProfessional = profNames.some((p) =>
        col1.toLowerCase().includes(p)
      );
      // Also accept any name that isn't a day/header and has numeric data
      const isDataRow =
        !dayPattern.test(col1) &&
        !col1.toLowerCase().includes("profissional") &&
        !col1.toLowerCase().includes("agendado") &&
        !col1.toLowerCase().includes("plano") &&
        !col1.toLowerCase().includes("particular") &&
        !col1.toLowerCase().includes("total") &&
        row.length > 2 &&
        (parseNumber(row[2]) > 0 ||
          parseNumber(row[3]) > 0 ||
          parseNumber(row[4]) > 0 ||
          parseNumber(row[5]) > 0 ||
          // Also check for "R$ -" which is valid zero data
          (row[10] !== undefined || row[11] !== undefined));

      if ((isProfessional || isDataRow) && col1.length > 1) {
        daily.push({
          semana: currentWeek,
          profissional: col1,
          dia: currentDay,
          agendadosPlano: parseNumber(row[2]),
          agendadosParticular: parseNumber(row[3]),
          comparecidosPlano: parseNumber(row[4]),
          comparecidosParticular: parseNumber(row[5]),
          orcamentosPlano: parseNumber(row[6]),
          orcamentosParticular: parseNumber(row[7]),
          fechadosPlano: parseNumber(row[8]),
          fechadosParticular: parseNumber(row[9]),
          fechadosRsPlano: parseNumber(row[10]),
          fechadosRsParticular: parseNumber(row[11]),
          totalDiaPlano: parseNumber(row[12]),
          totalDiaParticular: parseNumber(row[13]),
        });
      }
    }

    // Capture summary data from columns 14+ for later processing
    if (row.length > 14 && currentWeek) {
      const hasRightData = row
        .slice(14, 22)
        .some((c) => c && c.trim() !== "");
      if (hasRightData) {
        rawSummaryRows.push({ semana: currentWeek, row: row });
      }
    }
  }

  // Build weekly aggregates
  const weeklySummaries = buildWeeklyAggregates(rawSummaryRows, daily);

  return { daily, weeklySummaries };
}

function buildWeeklyAggregates(
  rawSummaryRows: { semana: string; row: string[] }[],
  daily: Record<string, unknown>[]
) {
  // Group daily data by week
  const weekMap = new Map<string, Record<string, unknown>[]>();
  for (const d of daily) {
    const week = d.semana as string;
    if (!weekMap.has(week)) weekMap.set(week, []);
    weekMap.get(week)!.push(d);
  }

  const aggregated: Record<string, unknown>[] = [];

  for (const [week, days] of weekMap.entries()) {
    const agPlano = days.reduce(
      (s, d) => s + ((d.agendadosPlano as number) || 0),
      0
    );
    const agPart = days.reduce(
      (s, d) => s + ((d.agendadosParticular as number) || 0),
      0
    );
    const compPlano = days.reduce(
      (s, d) => s + ((d.comparecidosPlano as number) || 0),
      0
    );
    const compPart = days.reduce(
      (s, d) => s + ((d.comparecidosParticular as number) || 0),
      0
    );
    const orcTotal = days.reduce(
      (s, d) =>
        s +
        ((d.orcamentosPlano as number) || 0) +
        ((d.orcamentosParticular as number) || 0),
      0
    );
    const fechTotal = days.reduce(
      (s, d) =>
        s +
        ((d.fechadosPlano as number) || 0) +
        ((d.fechadosParticular as number) || 0),
      0
    );
    const totalRs = days.reduce(
      (s, d) =>
        s +
        ((d.fechadosRsPlano as number) || 0) +
        ((d.fechadosRsParticular as number) || 0),
      0
    );

    // Try to extract capacity and other metrics from right-side summary columns
    let capacidade = 0;
    const weekSummaryRows = rawSummaryRows.filter((r) => r.semana === week);

    for (const sr of weekSummaryRows) {
      const r = sr.row;
      // Check cols 14-21 for "Capacidade" label and its value
      for (let c = 14; c < Math.min(r.length - 1, 22); c++) {
        const cell = r[c]?.trim().toLowerCase() || "";
        if (cell.includes("capacidade") && !cell.includes("x")) {
          // Value is in the next column
          const val = parseNumber(r[c + 1]);
          if (val > 0) capacidade = val;
        }
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
        totalAgendados > 0
          ? (totalComparecidos / totalAgendados) * 100
          : 0,
      orcamentos: orcTotal,
      fechados: fechTotal,
      totalFechadosRs: totalRs,
      pctConversao: orcTotal > 0 ? (fechTotal / orcTotal) * 100 : 0,
    });
  }

  return aggregated;
}

// ---------------------------------------------------------------------------
// Meta Parser
// ---------------------------------------------------------------------------
// Real structure — multiple months stacked vertically:
//   Col 0 (A): Month name — only on the FIRST row of each month block
//   Col 1 (B): Day number
//   Col 2 (C): Meta diária (format "R$ 5.000,00")
//   Col 3 (D): Alcançado (daily)
//   Col 4 (E): Diferença (Faltam)
//   Col 5 (F): Summary data — only in first ~7 rows of each month block:
//              row+0: Meta mensal value (e.g. "R$ 150.000,00")
//              row+1: "Alcançado" (label)
//              row+2: Alcançado total value
//              row+3: "Falta" (label)
//              row+4: Falta value
//              row+5: "Meta dia" (label)
//              row+6: Meta diária value
//
// We must find the LAST month block and only parse that.
// ---------------------------------------------------------------------------
function parseMeta(data: string[][]) {
  // Step 1: Find all month block start positions
  const monthStarts: { row: number; name: string }[] = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const colA = row[0]?.trim() || "";
    if (colA && isMonthName(colA)) {
      monthStarts.push({ row: i, name: colA });
    }
  }

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

  // Use the LAST month block
  const currentMonth = monthStarts[monthStarts.length - 1];
  const startRow = currentMonth.row;
  const endRow = data.length; // last block goes to end

  // Step 2: Extract summary from col 5 (F) — positional approach
  // The first row of the month block (startRow) has the meta mensal in col 5
  let metaMensal = 0;
  let alcancadoTotal = 0;
  let faltam = 0;
  let metaDiaria = 0;
  let pctAtingido = 0;

  // Read col 5 values from the first ~10 rows of this month block
  for (let offset = 0; offset < 10 && startRow + offset < data.length; offset++) {
    const row = data[startRow + offset];
    if (!row) continue;
    const colF = row[5]?.trim() || "";
    const colFLower = colF.toLowerCase();
    const colFNum = parseNumber(colF);

    if (offset === 0 && colFNum > 0) {
      // First row: meta mensal
      metaMensal = colFNum;
      continue;
    }

    // Look for labels and values in col 5
    if (colFLower === "alcançado" || colFLower === "alcancado") {
      // Next row should have the value
      const nextRow = data[startRow + offset + 1];
      if (nextRow) {
        alcancadoTotal = parseNumber(nextRow[5]);
      }
    } else if (colFLower === "falta" || colFLower === "faltam") {
      const nextRow = data[startRow + offset + 1];
      if (nextRow) {
        faltam = parseNumber(nextRow[5]);
      }
    } else if (colFLower === "meta dia" || colFLower === "meta diária" || colFLower === "meta diaria") {
      const nextRow = data[startRow + offset + 1];
      if (nextRow) {
        metaDiaria = parseNumber(nextRow[5]);
      }
    } else if (colFLower.includes("atingido")) {
      const nextRow = data[startRow + offset + 1];
      if (nextRow) {
        pctAtingido = parseNumber(nextRow[5]);
      }
    }

    // Also try: if it's a large number and we haven't found alcancado yet
    if (!alcancadoTotal && offset >= 1 && offset <= 3 && colFNum > 100) {
      // Could be alcançado total
      const prevRow = data[startRow + offset - 1];
      const prevLabel = prevRow?.[5]?.trim().toLowerCase() || "";
      if (
        prevLabel.includes("alcançado") ||
        prevLabel.includes("alcancado")
      ) {
        alcancadoTotal = colFNum;
      }
    }
    if (!faltam && offset >= 3 && offset <= 5 && colFNum > 100) {
      const prevRow = data[startRow + offset - 1];
      const prevLabel = prevRow?.[5]?.trim().toLowerCase() || "";
      if (prevLabel.includes("falta")) {
        faltam = colFNum;
      }
    }
  }

  // Step 3: Extract daily data from cols B-E
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
  if (!metaDiaria && dias.length > 0) {
    // Average of the daily metas
    const totalMetas = dias.reduce((s, d) => s + d.metaDiaria, 0);
    metaDiaria = dias.length > 0 ? totalMetas / dias.length : 0;
  }
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
  "janeiro", "fevereiro", "março", "marco", "abril", "maio",
  "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function isMonthName(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return MONTH_NAMES.some((m) => lower.startsWith(m));
}

// ---------------------------------------------------------------------------
// NPS Parser
// ---------------------------------------------------------------------------
// Structure confirmed:
//   Row 0: Headers (col 0 empty, col 1 = "Data", col 2 = "Paciente", col 3-12 = criteria)
//   Rows 1-19: Patient responses
//   Criteria (cols 2-11 after date+name, so cols 3-12):
//     The first col after paciente is the first criterion.
//   NPS classification: each individual score (1-10) per criterion, then:
//     Promoter = score >= 9 for ALL categories
//     Detractor = score <= 6 for ANY category
//     Neutral = everything else
// ---------------------------------------------------------------------------
function parseNPS(data: string[][]) {
  const responses: Record<string, unknown>[] = [];

  // Read header row to determine column mapping
  const headerRow = data[0] || [];
  // Find where criteria start (after Date and Paciente)
  // Based on debug: col 0 empty, col 1 = "Data", col 2 = "Paciente", col 3+ = criteria
  // But the user said col 0 is empty — let's auto-detect
  let dateCol = -1;
  let nameCol = -1;
  let criteriaStart = -1;

  for (let j = 0; j < headerRow.length; j++) {
    const h = headerRow[j]?.trim().toLowerCase() || "";
    if (h === "data" && dateCol < 0) dateCol = j;
    if (h === "paciente" && nameCol < 0) nameCol = j;
  }
  if (dateCol >= 0 && nameCol >= 0) {
    criteriaStart = nameCol + 1;
  } else {
    // Fallback: assume col 0=date, 1=paciente, 2+=criteria
    dateCol = 0;
    nameCol = 1;
    criteriaStart = 2;
  }

  const criteriaLabels: string[] = [];
  for (let j = criteriaStart; j < headerRow.length; j++) {
    const h = headerRow[j]?.trim() || "";
    if (h && h.toLowerCase() !== "comentário" && h.toLowerCase() !== "comentario") {
      criteriaLabels.push(h);
    } else {
      break; // stop at "Comentário" column
    }
  }
  const commentCol = criteriaStart + criteriaLabels.length;

  // Parse responses
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < criteriaStart + 1) continue;

    const date = row[dateCol]?.trim();
    const paciente = row[nameCol]?.trim();
    if (!date || !paciente) continue;

    const response: Record<string, unknown> = { data: date, paciente };
    const scores: number[] = [];

    for (let j = 0; j < criteriaLabels.length; j++) {
      const val = parseNumber(row[criteriaStart + j]);
      const key = criteriaLabels[j];
      response[key] = val;
      if (val > 0) scores.push(val);
    }

    response.comentario = row[commentCol]?.trim() || "";
    response._scores = scores;
    responses.push(response);
  }

  // Criteria averages
  const criteriaAverages: Record<string, number> = {};
  for (let j = 0; j < criteriaLabels.length; j++) {
    const key = criteriaLabels[j];
    const values = responses
      .map((r) => r[key] as number)
      .filter((v) => v > 0);
    criteriaAverages[key] =
      values.length > 0
        ? Math.round(
            (values.reduce((s, v) => s + v, 0) / values.length) * 10
          ) / 10
        : 0;
  }

  // NPS calculation
  // Promoter: minimum score across all criteria >= 9
  // Detractor: minimum score across all criteria <= 6
  // Neutral: everything else
  function calcNPS(resps: Record<string, unknown>[]) {
    let promotores = 0;
    let neutros = 0;
    let detratores = 0;

    for (const r of resps) {
      const scores = r._scores as number[];
      if (!scores || scores.length === 0) continue;
      const minScore = Math.min(...scores);
      if (minScore >= 9) {
        promotores++;
      } else if (minScore <= 6) {
        detratores++;
      } else {
        neutros++;
      }
    }

    const total = promotores + neutros + detratores;
    const nps =
      total > 0
        ? Math.round(((promotores - detratores) / total) * 100)
        : 0;
    return { promotores, neutros, detratores, nps, total };
  }

  const allNPS = calcNPS(responses);
  const periods = [{ label: "Todo período", ...allNPS }];

  // Clean up internal _scores from responses before returning
  const cleanResponses = responses.map((r) => {
    const { _scores, ...rest } = r;
    return rest;
  });

  return {
    responses: cleanResponses,
    periods,
    criteriaAverages,
    criteriaLabels,
  };
}

// ---------------------------------------------------------------------------
// Repasse Parser (working correctly — kept as-is)
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
