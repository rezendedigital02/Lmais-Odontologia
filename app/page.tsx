"use client";

import { useSheetData } from "@/lib/hooks";
import { formatBRL, formatPercent } from "@/lib/utils";
import { KPICard } from "@/components/cards/kpi-card";
import { LineChartComponent } from "@/components/charts/line-chart";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { CardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  Target,
  TrendingUp,
  Star,
  Users,
  Percent,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const { data: codData, isLoading: codLoading } = useSheetData("cod");
  const { data: metaData, isLoading: metaLoading } = useSheetData("meta");
  const { data: agendData, isLoading: agendLoading } = useSheetData("agendamento");
  const { data: npsData, isLoading: npsLoading } = useSheetData("nps");

  const [insights, setInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const isLoading = codLoading || metaLoading || agendLoading || npsLoading;

  const cod = codData as Record<string, unknown> | undefined;
  const meta = metaData as Record<string, unknown> | undefined;
  const agend = agendData as Record<string, unknown> | undefined;
  const nps = npsData as Record<string, unknown> | undefined;

  const custoTotal = (cod?.total as number) || 0;
  const metaMensal = (meta?.metaMensal as number) || 0;
  const alcancado = (meta?.alcancadoTotal as number) || 0;
  const pctMeta = (meta?.pctAtingido as number) || 0;
  const faltam = (meta?.faltam as number) || 0;

  // Weekly data
  const weeklySummaries = (agend?.weeklySummaries as Record<string, unknown>[]) || [];
  const lastWeek = weeklySummaries[weeklySummaries.length - 1];
  const faturamentoSemanal = (lastWeek?.totalFechadosRs as number) || 0;

  const dailyData = (agend?.daily as Record<string, unknown>[]) || [];
  const totalAgendados = dailyData.reduce(
    (s, d) =>
      s +
      ((d.agendadosPlano as number) || 0) +
      ((d.agendadosParticular as number) || 0),
    0
  );
  const totalComparecidos = dailyData.reduce(
    (s, d) =>
      s +
      ((d.comparecidosPlano as number) || 0) +
      ((d.comparecidosParticular as number) || 0),
    0
  );
  const totalOrcamentos = dailyData.reduce(
    (s, d) =>
      s +
      ((d.orcamentosPlano as number) || 0) +
      ((d.orcamentosParticular as number) || 0),
    0
  );
  const totalFechados = dailyData.reduce(
    (s, d) =>
      s +
      ((d.fechadosPlano as number) || 0) +
      ((d.fechadosParticular as number) || 0),
    0
  );

  const taxaComparecimento =
    totalAgendados > 0 ? (totalComparecidos / totalAgendados) * 100 : 0;
  const taxaConversao =
    totalOrcamentos > 0 ? (totalFechados / totalOrcamentos) * 100 : 0;

  // NPS
  const npsPeriods = (nps?.periods as { nps: number; label: string }[]) || [];
  const currentNPS = npsPeriods[0]?.nps || 0;

  // Meta chart data
  const metaDias = (meta?.dias as Record<string, unknown>[]) || [];
  const metaChartData = metaDias.map((d) => ({
    dia: `Dia ${d.dia}`,
    "Meta Acumulada": d.metaAcumulada,
    "Realizado Acumulado": d.alcancadoAcumulado,
  }));

  // Weekly bar chart data
  const weeklyChartData = weeklySummaries.map((w, i) => ({
    semana: (w.semana as string) || `Semana ${i + 1}`,
    Faturamento: (w.totalFechadosRs as number) || 0,
  }));

  async function handleGenerateInsights() {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custos: { total: custoTotal },
          meta: {
            metaMensal,
            alcancado,
            pctAtingido: pctMeta,
            faltam,
          },
          agendamento: {
            totalAgendados,
            totalComparecidos,
            taxaComparecimento,
            totalOrcamentos,
            totalFechados,
            taxaConversao,
            faturamentoSemanal,
          },
          nps: { score: currentNPS },
        }),
      });
      const data = await res.json();
      setInsights(data.insights);
    } catch {
      setInsights("Erro ao gerar insights. Tente novamente.");
    }
    setInsightsLoading(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Custo Open Doors"
          value={formatBRL(custoTotal)}
          subtitle="Custos fixos do mês"
          icon={DollarSign}
          color="red"
        />
        <KPICard
          title="Meta do Mês"
          value={formatBRL(alcancado)}
          subtitle={`${formatPercent(pctMeta)} de ${formatBRL(metaMensal)}`}
          icon={Target}
          color="default"
        >
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all"
                style={{ width: `${Math.min(pctMeta, 100)}%` }}
              />
            </div>
          </div>
        </KPICard>
        <KPICard
          title="Faturamento Semanal"
          value={formatBRL(faturamentoSemanal)}
          subtitle="Total fechado na última semana"
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="NPS Atual"
          value={`${currentNPS}%`}
          subtitle={currentNPS >= 70 ? "Excelente" : currentNPS >= 50 ? "Bom" : "Precisa melhorar"}
          icon={Star}
          color={currentNPS >= 70 ? "green" : currentNPS >= 50 ? "yellow" : "red"}
        />
        <KPICard
          title="Taxa de Comparecimento"
          value={formatPercent(taxaComparecimento)}
          subtitle={`${totalComparecidos} de ${totalAgendados} agendados`}
          icon={Users}
          color={taxaComparecimento >= 70 ? "green" : "yellow"}
        />
        <KPICard
          title="Taxa de Conversão"
          value={formatPercent(taxaConversao)}
          subtitle={`${totalFechados} de ${totalOrcamentos} orçamentos`}
          icon={Percent}
          color={taxaConversao >= 50 ? "green" : "yellow"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {metaChartData.length > 0 && (
          <LineChartComponent
            data={metaChartData}
            xKey="dia"
            lines={[
              { key: "Meta Acumulada", color: "#94a3b8", name: "Meta Acumulada" },
              {
                key: "Realizado Acumulado",
                color: "#10b981",
                name: "Realizado Acumulado",
              },
            ]}
            title="Meta vs Realizado (Acumulado)"
            formatAsCurrency
          />
        )}
        {weeklyChartData.length > 0 && (
          <BarChartComponent
            data={weeklyChartData}
            xKey="semana"
            bars={[
              { key: "Faturamento", color: "#1e3a5f", name: "Faturamento" },
            ]}
            title="Faturamento Semanal"
            formatAsCurrency
          />
        )}
      </div>

      {/* AI Insights */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Insights com IA
            </h3>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={insightsLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
          >
            {insightsLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Gerar Análise
              </>
            )}
          </button>
        </div>
        {insights ? (
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{
              __html: insights
                .replace(/\n/g, "<br/>")
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/### (.*?)(<br\/>)/g, "<h4 class='text-base font-semibold mt-4 mb-2'>$1</h4>")
                .replace(/## (.*?)(<br\/>)/g, "<h3 class='text-lg font-bold mt-4 mb-2'>$1</h3>")
                .replace(/- (.*?)(<br\/>)/g, "<li class='ml-4'>$1</li>"),
            }}
          />
        ) : (
          <p className="text-sm text-muted">
            Clique em &quot;Gerar Análise&quot; para obter um resumo executivo com
            sugestões de melhoria baseado nos dados atuais.
          </p>
        )}
      </div>
    </div>
  );
}
