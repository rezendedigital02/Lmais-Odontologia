import { NextRequest, NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheets";
import { parseNumber } from "@/lib/utils";

const TAB_RANGES: Record<string, string> = {
  cod: "A1:Z50",
  agendamento: "A1:V200",
  meta: "A1:G50",
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

function parseCOD(data: string[][]) {
  const items: { categoria: string; item: string; valor: number }[] = [];
  const groups: Record<string, { categoria: string; item: string; valor: number }[]> = {};
  let currentGroup = "";
  let total = 0;

  for (let i = 5; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;

    const colB = row[1]?.trim() || "";
    const colE = row[4]?.trim() || "";

    if (!colB) continue;

    if (colB.toLowerCase().includes("total geral") || colB.toLowerCase() === "total") {
      total = parseNumber(colE);
      continue;
    }

    // Check if this is a group header (no value in column E, or text-like)
    if (
      colB &&
      !colE &&
      !parseNumber(row[2]) &&
      !parseNumber(row[3])
    ) {
      currentGroup = colB;
      if (!groups[currentGroup]) groups[currentGroup] = [];
      continue;
    }

    const valor = parseNumber(colE) || parseNumber(row[2]) || parseNumber(row[3]);
    if (valor > 0) {
      const item = { categoria: currentGroup, item: colB, valor };
      items.push(item);
      if (!groups[currentGroup]) groups[currentGroup] = [];
      groups[currentGroup].push(item);
    }
  }

  return { items, total, groups };
}

function parseAgendamento(data: string[][]) {
  const daily: Record<string, unknown>[] = [];
  const weeklySummaries: Record<string, unknown>[] = [];

  // Parse weekly summary blocks from columns O-V area
  // The structure repeats in blocks per week
  let currentWeek = "";
  let currentProfissional = "";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;

    const colA = row[0]?.trim() || "";

    // Detect week headers like "Semana 1", "Semana 2" etc
    if (colA.toLowerCase().includes("semana")) {
      currentWeek = colA;
      continue;
    }

    // Detect professional names
    const profNames = ["luciana", "pedro", "leila", "giovanna", "joice"];
    if (profNames.some((p) => colA.toLowerCase().includes(p))) {
      currentProfissional = colA;
      continue;
    }

    // Detect day rows
    const dias = ["segunda", "terça", "quarta", "quinta", "sexta"];
    if (dias.some((d) => colA.toLowerCase().includes(d))) {
      daily.push({
        semana: currentWeek,
        profissional: currentProfissional,
        dia: colA,
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

    // Check for summary data in columns O-V (index 14-21)
    if (row.length > 14) {
      const colO = row[14]?.trim() || "";
      if (colO.toLowerCase().includes("total semana") || colO.toLowerCase().includes("capacidade")) {
        weeklySummaries.push({
          semana: currentWeek,
          label: colO,
          agendadosPlano: parseNumber(row[15]),
          agendadosParticular: parseNumber(row[16]),
          comparecidosPlano: parseNumber(row[17]),
          comparecidosParticular: parseNumber(row[18]),
          capacidade: parseNumber(row[19]),
          totalFechadosRs: parseNumber(row[20]),
        });
      }
    }
  }

  return { daily, weeklySummaries, raw: data.slice(0, 5) };
}

function parseMeta(data: string[][]) {
  const dias: {
    dia: number;
    metaDiaria: number;
    alcancado: number;
    faltam: number;
  }[] = [];

  let metaMensal = 0;
  let metaDiaria = 0;
  let alcancadoTotal = 0;
  let faltam = 0;
  let pctAtingido = 0;
  let mes = "";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;

    const colA = row[0]?.trim() || "";
    const colB = row[1]?.trim() || "";
    const colF = row[5]?.trim() || "";

    // First row usually has the month name
    if (i === 0 && colA) {
      mes = colA;
    }

    // Look for meta mensal in column F area
    if (colF) {
      if (colF.toLowerCase().includes("meta") && row[6]) {
        metaMensal = parseNumber(row[6]);
      }
      if (colF.toLowerCase().includes("diária") && row[6]) {
        metaDiaria = parseNumber(row[6]);
      }
      if (colF.toLowerCase().includes("alcançado") && row[6]) {
        alcancadoTotal = parseNumber(row[6]);
      }
      if (colF.toLowerCase().includes("falta") && row[6]) {
        faltam = parseNumber(row[6]);
      }
      if (colF.toLowerCase().includes("atingido") && row[6]) {
        pctAtingido = parseNumber(row[6]);
      }
    }

    // Parse daily data (col B = day number, C = meta, D = alcançado, E = faltam)
    const dayNum = parseInt(colB);
    if (dayNum > 0 && dayNum <= 31) {
      let metaAcumulada = 0;
      let alcancadoAcumulado = 0;
      const prevDays = dias;
      if (prevDays.length > 0) {
        metaAcumulada =
          prevDays.reduce((s, d) => s + d.metaDiaria, 0) + parseNumber(row[2]);
        alcancadoAcumulado =
          prevDays.reduce((s, d) => s + d.alcancado, 0) + parseNumber(row[3]);
      } else {
        metaAcumulada = parseNumber(row[2]);
        alcancadoAcumulado = parseNumber(row[3]);
      }

      dias.push({
        dia: dayNum,
        metaDiaria: parseNumber(row[2]),
        alcancado: parseNumber(row[3]),
        faltam: parseNumber(row[4]),
      });
    }
  }

  // Calculate accumulated values
  let metaAcc = 0;
  let alcAcc = 0;
  const diasComAcumulado = dias.map((d) => {
    metaAcc += d.metaDiaria;
    alcAcc += d.alcancado;
    return { ...d, metaAcumulada: metaAcc, alcancadoAcumulado: alcAcc };
  });

  // Fallback calculations
  if (!metaMensal && metaDiaria && dias.length) {
    metaMensal = metaDiaria * dias.length;
  }
  if (!alcancadoTotal) {
    alcancadoTotal = dias.reduce((s, d) => s + d.alcancado, 0);
  }
  if (!faltam && metaMensal) {
    faltam = metaMensal - alcancadoTotal;
  }
  if (!pctAtingido && metaMensal) {
    pctAtingido = (alcancadoTotal / metaMensal) * 100;
  }

  return {
    mes,
    metaMensal,
    metaDiaria,
    alcancadoTotal,
    faltam,
    pctAtingido,
    dias: diasComAcumulado,
  };
}

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

  // Parse individual responses (skip header row)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    const date = row[0]?.trim();
    const paciente = row[1]?.trim();
    if (!date || !paciente) continue;

    const response: Record<string, unknown> = {
      data: date,
      paciente,
    };

    for (let j = 0; j < criteriaKeys.length; j++) {
      response[criteriaKeys[j]] = parseNumber(row[j + 2]);
    }
    response.comentario = row[12]?.trim() || "";

    responses.push(response);
  }

  // Calculate criteria averages
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

  // Calculate NPS for different periods
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
  const periods: { label: string; promotores: number; neutros: number; detratores: number; nps: number; total: number }[] = [
    { label: "Todo período", ...allNPS },
  ];

  return { responses, periods, criteriaAverages };
}

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

    // Check if this is a convenio header
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
