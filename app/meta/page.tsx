"use client";

import { useSheetData } from "@/lib/hooks";
import { formatBRL, formatPercent } from "@/lib/utils";
import { KPICard } from "@/components/cards/kpi-card";
import { AreaChartComponent } from "@/components/charts/area-chart";
import { CardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Target, TrendingDown, Calculator } from "lucide-react";

export default function MetaPage() {
  const { data, isLoading } = useSheetData("meta");

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <ChartSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  const meta = data as {
    mes: string;
    metaMensal: number;
    metaDiaria: number;
    alcancadoTotal: number;
    faltam: number;
    pctAtingido: number;
    dias: {
      dia: number;
      metaDiaria: number;
      alcancado: number;
      faltam: number;
      metaAcumulada: number;
      alcancadoAcumulado: number;
    }[];
  } | undefined;

  const metaMensal = meta?.metaMensal || 0;
  const alcancado = meta?.alcancadoTotal || 0;
  const faltam = meta?.faltam || 0;
  const pctAtingido = meta?.pctAtingido || 0;
  const dias = meta?.dias || [];

  const diasComDados = dias.filter((d) => d.alcancado > 0).length;
  const diasRestantes = dias.length - diasComDados;
  const necessarioPorDia = diasRestantes > 0 ? faltam / diasRestantes : 0;

  const gaugeRotation = Math.min(pctAtingido, 100) * 1.8;

  const chartData = dias.map((d) => ({
    dia: `Dia ${d.dia}`,
    "Meta Acumulada": d.metaAcumulada,
    "Realizado Acumulado": d.alcancadoAcumulado,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-lg sm:text-xl font-bold text-foreground">Meta Mensal</h1>

      {/* Gauge */}
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6 flex flex-col items-center">
        <div className="relative w-36 h-[72px] sm:w-48 sm:h-24 overflow-hidden">
          <div className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border-[12px] sm:border-[16px] border-gray-200" />
          <div
            className="absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full border-[12px] sm:border-[16px] border-transparent"
            style={{
              borderTopColor: pctAtingido >= 70 ? "#10b981" : pctAtingido >= 40 ? "#f59e0b" : "#ef4444",
              borderRightColor: pctAtingido >= 50 ? (pctAtingido >= 70 ? "#10b981" : "#f59e0b") : "transparent",
              transform: `rotate(${gaugeRotation - 90}deg)`,
              transition: "transform 1s ease-out",
            }}
          />
          <div className="absolute inset-0 flex items-end justify-center pb-1">
            <span className="text-2xl sm:text-3xl font-bold text-foreground">
              {formatPercent(pctAtingido)}
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted mt-2">da meta atingida</p>
        <p className="text-[10px] sm:text-xs text-muted mt-1">
          Meta: {formatBRL(metaMensal)}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KPICard
          title="Alcançado"
          value={formatBRL(alcancado)}
          subtitle={`${formatPercent(pctAtingido)} da meta`}
          icon={Target}
          color="green"
        />
        <KPICard
          title="Falta Atingir"
          value={formatBRL(faltam)}
          subtitle={`${diasRestantes} dias úteis restantes`}
          icon={TrendingDown}
          color="red"
        />
        <KPICard
          title="Necessário/Dia"
          value={formatBRL(necessarioPorDia)}
          subtitle={`Para atingir nos ${diasRestantes} dias restantes`}
          icon={Calculator}
          color="yellow"
        />
      </div>

      <AreaChartComponent
        data={chartData}
        xKey="dia"
        areas={[
          { key: "Meta Acumulada", color: "#94a3b8", name: "Meta Acumulada" },
          { key: "Realizado Acumulado", color: "#10b981", name: "Realizado Acumulado" },
        ]}
        title="Meta Acumulada vs Realizado Acumulado"
        formatAsCurrency
      />

      <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">Dia a Dia</h3>
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <table className="w-full text-[10px] sm:text-xs md:text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 sm:py-2 px-2 sm:px-3 text-muted font-medium">Dia</th>
                <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 text-muted font-medium">Meta</th>
                <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 text-muted font-medium">Alcançado</th>
                <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 text-muted font-medium">Meta Ac.</th>
                <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 text-muted font-medium">Real. Ac.</th>
                <th className="text-right py-1.5 sm:py-2 px-2 sm:px-3 text-muted font-medium">Dif.</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((d, i) => {
                const diff = d.alcancadoAcumulado - d.metaAcumulada;
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-background/50">
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 font-medium">Dia {d.dia}</td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right">{formatBRL(d.metaDiaria)}</td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right">{d.alcancado > 0 ? formatBRL(d.alcancado) : "-"}</td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right">{formatBRL(d.metaAcumulada)}</td>
                    <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-right">{d.alcancadoAcumulado > 0 ? formatBRL(d.alcancadoAcumulado) : "-"}</td>
                    <td className={`py-1.5 sm:py-2 px-2 sm:px-3 text-right font-medium ${diff >= 0 ? "text-accent" : "text-danger"}`}>
                      {d.alcancadoAcumulado > 0 ? formatBRL(diff) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
