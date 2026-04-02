"use client";

import { useSheetData } from "@/lib/hooks";
import { getNPSColor } from "@/lib/utils";
import { KPICard } from "@/components/cards/kpi-card";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { RadarChartComponent } from "@/components/charts/radar-chart";
import { CardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Star, ThumbsUp, Minus, ThumbsDown } from "lucide-react";

export default function NPSPage() {
  const { data, isLoading } = useSheetData("nps");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  const nps = data as {
    responses: Record<string, unknown>[];
    periods: { label: string; promotores: number; neutros: number; detratores: number; nps: number; total: number }[];
    criteriaAverages: Record<string, number>;
  } | undefined;

  const responses = nps?.responses || [];
  const periods = nps?.periods || [];
  const criteriaAverages = nps?.criteriaAverages || {};

  const mainPeriod = periods[0] || {
    label: "Todo período",
    promotores: 0,
    neutros: 0,
    detratores: 0,
    nps: 0,
    total: 0,
  };

  // NPS distribution bar chart
  const distributionData = periods.map((p) => ({
    periodo: p.label,
    Promotores: p.promotores,
    Neutros: p.neutros,
    Detratores: p.detratores,
  }));

  // Radar chart data
  const radarData = Object.entries(criteriaAverages).map(([subject, value]) => ({
    subject: subject.length > 15 ? subject.substring(0, 12) + "..." : subject,
    value,
    fullMark: 10,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">NPS - Satisfação</h1>

      {/* Big NPS score */}
      <div className="bg-card rounded-lg border border-border p-8 flex flex-col items-center">
        <p className="text-sm text-muted mb-2">NPS Score</p>
        <div
          className={`text-6xl font-bold ${getNPSColor(mainPeriod.nps)}`}
        >
          {mainPeriod.nps}%
        </div>
        <p className="text-sm text-muted mt-2">
          {mainPeriod.nps >= 70
            ? "Zona de Excelência"
            : mainPeriod.nps >= 50
            ? "Zona de Qualidade"
            : mainPeriod.nps >= 0
            ? "Zona de Aperfeiçoamento"
            : "Zona Crítica"}
        </p>
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-1.5 text-sm">
            <ThumbsUp size={14} className="text-accent" />
            <span className="text-muted">Promotores:</span>
            <span className="font-semibold">{mainPeriod.promotores}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Minus size={14} className="text-warning" />
            <span className="text-muted">Neutros:</span>
            <span className="font-semibold">{mainPeriod.neutros}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <ThumbsDown size={14} className="text-danger" />
            <span className="text-muted">Detratores:</span>
            <span className="font-semibold">{mainPeriod.detratores}</span>
          </div>
        </div>
        <p className="text-xs text-muted mt-2">
          Total de respostas: {mainPeriod.total}
        </p>
      </div>

      {/* Period comparison */}
      {periods.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Comparativo por Período
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {periods.map((p) => (
              <KPICard
                key={p.label}
                title={p.label}
                value={`${p.nps}%`}
                subtitle={`${p.total} respostas`}
                icon={Star}
                color={p.nps >= 70 ? "green" : p.nps >= 50 ? "yellow" : "red"}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {distributionData.length > 0 && (
          <BarChartComponent
            data={distributionData}
            xKey="periodo"
            bars={[
              { key: "Promotores", color: "#10b981", name: "Promotores", stackId: "stack" },
              { key: "Neutros", color: "#f59e0b", name: "Neutros", stackId: "stack" },
              { key: "Detratores", color: "#ef4444", name: "Detratores", stackId: "stack" },
            ]}
            title="Distribuição Promotor / Neutro / Detrator"
          />
        )}

        {radarData.length > 0 && (
          <RadarChartComponent
            data={radarData}
            title="Média por Critério de Avaliação"
            height={300}
          />
        )}
      </div>

      {/* Latest responses table */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Últimas Avaliações
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted">Data</th>
                <th className="text-left py-2 px-2 text-muted">Paciente</th>
                <th className="text-center py-2 px-2 text-muted">Pontualidade</th>
                <th className="text-center py-2 px-2 text-muted">Limpeza</th>
                <th className="text-center py-2 px-2 text-muted">Atendimento</th>
                <th className="text-center py-2 px-2 text-muted">Profissionalismo</th>
                <th className="text-center py-2 px-2 text-muted">Conforto</th>
                <th className="text-left py-2 px-2 text-muted">Comentário</th>
              </tr>
            </thead>
            <tbody>
              {responses.slice(0, 20).map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-background/50"
                >
                  <td className="py-2 px-2">{r.data as string}</td>
                  <td className="py-2 px-2">{r.paciente as string}</td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`inline-block w-6 h-6 rounded-full text-white text-center leading-6 ${
                        (r.pontualidade as number) >= 9
                          ? "bg-green-500"
                          : (r.pontualidade as number) >= 7
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    >
                      {r.pontualidade as number}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`inline-block w-6 h-6 rounded-full text-white text-center leading-6 ${
                        (r.limpeza as number) >= 9
                          ? "bg-green-500"
                          : (r.limpeza as number) >= 7
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    >
                      {r.limpeza as number}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`inline-block w-6 h-6 rounded-full text-white text-center leading-6 ${
                        (r.atendimentoRecepcao as number) >= 9
                          ? "bg-green-500"
                          : (r.atendimentoRecepcao as number) >= 7
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    >
                      {r.atendimentoRecepcao as number}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`inline-block w-6 h-6 rounded-full text-white text-center leading-6 ${
                        (r.profissionalismo as number) >= 9
                          ? "bg-green-500"
                          : (r.profissionalismo as number) >= 7
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    >
                      {r.profissionalismo as number}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span
                      className={`inline-block w-6 h-6 rounded-full text-white text-center leading-6 ${
                        (r.conforto as number) >= 9
                          ? "bg-green-500"
                          : (r.conforto as number) >= 7
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    >
                      {r.conforto as number}
                    </span>
                  </td>
                  <td className="py-2 px-2 max-w-[200px] truncate">
                    {r.comentario as string}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
