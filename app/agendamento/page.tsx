"use client";

import { useSheetData } from "@/lib/hooks";
import { formatBRL, formatPercent } from "@/lib/utils";
import { KPICard } from "@/components/cards/kpi-card";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { CardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { CalendarDays, Users, TrendingUp, Percent } from "lucide-react";
import { useState, useMemo } from "react";

export default function AgendamentoPage() {
  const { data, isLoading } = useSheetData("agendamento");

  const agend = data as {
    daily: Record<string, unknown>[];
    weeklySummaries: Record<string, unknown>[];
  } | undefined;

  const daily = agend?.daily || [];
  const weeklySummaries = agend?.weeklySummaries || [];

  // Get unique weeks
  const weeks = useMemo(() => {
    const set = new Set<string>();
    daily.forEach((d) => {
      const s = d.semana as string;
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [daily]);

  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const activeWeek = selectedWeek || weeks[weeks.length - 1] || "";

  const weeklyDaily = daily.filter((d) => d.semana === activeWeek);

  // Get unique professionals for the selected week
  const professionals = useMemo(() => {
    const set = new Set<string>();
    weeklyDaily.forEach((d) => {
      const p = d.profissional as string;
      if (p) set.add(p);
    });
    return Array.from(set);
  }, [weeklyDaily]);

  // Aggregate metrics for the week
  const weekTotals = useMemo(() => {
    const totals = {
      agendadosPlano: 0,
      agendadosParticular: 0,
      comparecidosPlano: 0,
      comparecidosParticular: 0,
      orcamentos: 0,
      fechados: 0,
      totalRs: 0,
    };
    weeklyDaily.forEach((d) => {
      totals.agendadosPlano += (d.agendadosPlano as number) || 0;
      totals.agendadosParticular += (d.agendadosParticular as number) || 0;
      totals.comparecidosPlano += (d.comparecidosPlano as number) || 0;
      totals.comparecidosParticular += (d.comparecidosParticular as number) || 0;
      totals.orcamentos += ((d.orcamentosPlano as number) || 0) + ((d.orcamentosParticular as number) || 0);
      totals.fechados += ((d.fechadosPlano as number) || 0) + ((d.fechadosParticular as number) || 0);
      totals.totalRs += ((d.fechadosRsPlano as number) || 0) + ((d.fechadosRsParticular as number) || 0);
    });
    return totals;
  }, [weeklyDaily]);

  const totalAgendados = weekTotals.agendadosPlano + weekTotals.agendadosParticular;
  const totalComparecidos = weekTotals.comparecidosPlano + weekTotals.comparecidosParticular;
  const pctComparecimento = totalAgendados > 0 ? (totalComparecidos / totalAgendados) * 100 : 0;
  const pctConversao = weekTotals.orcamentos > 0 ? (weekTotals.fechados / weekTotals.orcamentos) * 100 : 0;

  // Bar chart data by day
  const daysMap = new Map<string, { plano: number; particular: number }>();
  weeklyDaily.forEach((d) => {
    const dia = d.dia as string;
    const existing = daysMap.get(dia) || { plano: 0, particular: 0 };
    existing.plano += ((d.agendadosPlano as number) || 0);
    existing.particular += ((d.agendadosParticular as number) || 0);
    daysMap.set(dia, existing);
  });
  const barData = Array.from(daysMap.entries()).map(([dia, vals]) => ({
    dia,
    Plano: vals.plano,
    Particular: vals.particular,
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Agendamento</h1>
        <select
          value={activeWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-card"
        >
          {weeks.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Agendados"
          value={String(totalAgendados)}
          subtitle={`Plano: ${weekTotals.agendadosPlano} | Part.: ${weekTotals.agendadosParticular}`}
          icon={CalendarDays}
          color="default"
        />
        <KPICard
          title="Comparecimentos"
          value={formatPercent(pctComparecimento)}
          subtitle={`${totalComparecidos} de ${totalAgendados}`}
          icon={Users}
          color={pctComparecimento >= 70 ? "green" : "yellow"}
        />
        <KPICard
          title="Taxa de Conversão"
          value={formatPercent(pctConversao)}
          subtitle={`${weekTotals.fechados} de ${weekTotals.orcamentos} orçamentos`}
          icon={Percent}
          color={pctConversao >= 50 ? "green" : "yellow"}
        />
        <KPICard
          title="Faturamento"
          value={formatBRL(weekTotals.totalRs)}
          subtitle="Total fechado na semana"
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Professional cards */}
      {professionals.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Por Profissional</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {professionals.map((prof) => {
              const profDays = weeklyDaily.filter((d) => d.profissional === prof);
              const ag = profDays.reduce((s, d) => s + ((d.agendadosPlano as number) || 0) + ((d.agendadosParticular as number) || 0), 0);
              const comp = profDays.reduce((s, d) => s + ((d.comparecidosPlano as number) || 0) + ((d.comparecidosParticular as number) || 0), 0);
              const orc = profDays.reduce((s, d) => s + ((d.orcamentosPlano as number) || 0) + ((d.orcamentosParticular as number) || 0), 0);
              const fech = profDays.reduce((s, d) => s + ((d.fechadosPlano as number) || 0) + ((d.fechadosParticular as number) || 0), 0);
              const rs = profDays.reduce((s, d) => s + ((d.fechadosRsPlano as number) || 0) + ((d.fechadosRsParticular as number) || 0), 0);
              return (
                <div key={prof} className="bg-card rounded-lg border border-border p-4">
                  <p className="font-semibold text-sm text-primary mb-2">{prof}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted">Agendados:</span> {ag}</div>
                    <div><span className="text-muted">Comparecidos:</span> {comp}</div>
                    <div><span className="text-muted">Orçamentos:</span> {orc}</div>
                    <div><span className="text-muted">Fechados:</span> {fech}</div>
                    <div className="col-span-2"><span className="text-muted">Total R$:</span> <span className="font-medium">{formatBRL(rs)}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {barData.length > 0 && (
        <BarChartComponent
          data={barData}
          xKey="dia"
          bars={[
            { key: "Plano", color: "#1e3a5f", name: "Plano", stackId: "stack" },
            { key: "Particular", color: "#10b981", name: "Particular", stackId: "stack" },
          ]}
          title="Agendados por Dia - Plano vs Particular"
        />
      )}

      {/* Detailed table */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Detalhamento por Dia</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-muted">Dia</th>
                <th className="text-left py-2 px-2 text-muted">Profissional</th>
                <th className="text-right py-2 px-2 text-muted">Ag. Plano</th>
                <th className="text-right py-2 px-2 text-muted">Ag. Part.</th>
                <th className="text-right py-2 px-2 text-muted">Comp. Plano</th>
                <th className="text-right py-2 px-2 text-muted">Comp. Part.</th>
                <th className="text-right py-2 px-2 text-muted">Orç.</th>
                <th className="text-right py-2 px-2 text-muted">Fech.</th>
                <th className="text-right py-2 px-2 text-muted">Total R$</th>
              </tr>
            </thead>
            <tbody>
              {weeklyDaily.map((d, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-background/50">
                  <td className="py-2 px-2">{d.dia as string}</td>
                  <td className="py-2 px-2">{d.profissional as string}</td>
                  <td className="py-2 px-2 text-right">{(d.agendadosPlano as number) || 0}</td>
                  <td className="py-2 px-2 text-right">{(d.agendadosParticular as number) || 0}</td>
                  <td className="py-2 px-2 text-right">{(d.comparecidosPlano as number) || 0}</td>
                  <td className="py-2 px-2 text-right">{(d.comparecidosParticular as number) || 0}</td>
                  <td className="py-2 px-2 text-right">{((d.orcamentosPlano as number) || 0) + ((d.orcamentosParticular as number) || 0)}</td>
                  <td className="py-2 px-2 text-right">{((d.fechadosPlano as number) || 0) + ((d.fechadosParticular as number) || 0)}</td>
                  <td className="py-2 px-2 text-right font-medium">{formatBRL((d.totalDia as number) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
