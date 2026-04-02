"use client";

import { useSheetData } from "@/lib/hooks";
import { formatBRL } from "@/lib/utils";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { CardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";

export default function RepassePage() {
  const { data, isLoading } = useSheetData("repasse");
  const [selectedConvenio, setSelectedConvenio] = useState<string>("todos");

  const repasse = data as {
    items: {
      procedimento: string;
      valor: number;
      repasseAtual: number;
      repasseIdeal: number;
      diferenca: number;
      convenio: string;
    }[];
    convenios: string[];
  } | undefined;

  const items = repasse?.items || [];
  const convenios = repasse?.convenios || [];

  const filteredItems = useMemo(() => {
    if (selectedConvenio === "todos") return items;
    return items.filter((item) => item.convenio === selectedConvenio);
  }, [items, selectedConvenio]);

  // Top 10 with biggest gap
  const topGap = useMemo(() => {
    return [...filteredItems]
      .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))
      .slice(0, 10)
      .map((item) => ({
        procedimento:
          item.procedimento.length > 20
            ? item.procedimento.substring(0, 17) + "..."
            : item.procedimento,
        "Repasse Atual": item.repasseAtual,
        "Repasse Ideal": item.repasseIdeal,
        Diferença: Math.abs(item.diferenca),
      }));
  }, [filteredItems]);

  // Items with biggest loss
  const lossItems = useMemo(() => {
    return [...filteredItems]
      .filter((i) => i.diferenca < 0)
      .sort((a, b) => a.diferenca - b.diferenca)
      .slice(0, 5);
  }, [filteredItems]);

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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-bold text-foreground">Repasse</h1>
        <select
          value={selectedConvenio}
          onChange={(e) => setSelectedConvenio(e.target.value)}
          className="border border-border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-card"
        >
          <option value="todos">Todos os convênios</option>
          {convenios.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Loss highlights */}
      {lossItems.length > 0 && (
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3">
            Maior Perda de Margem
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {lossItems.map((item, i) => (
              <div
                key={i}
                className="bg-card rounded-lg border border-border border-l-4 border-l-danger p-3 sm:p-4"
              >
                <p className="text-xs sm:text-sm font-medium">{item.procedimento}</p>
                <p className="text-xs text-muted mt-1">
                  {item.convenio}
                </p>
                <div className="flex justify-between mt-2 text-xs">
                  <span>
                    Atual: <span className="font-medium">{formatBRL(item.repasseAtual)}</span>
                  </span>
                  <span>
                    Ideal: <span className="font-medium">{formatBRL(item.repasseIdeal)}</span>
                  </span>
                </div>
                <p className="text-sm font-bold text-danger mt-1">
                  Diferença: {formatBRL(item.diferenca)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {topGap.length > 0 && (
        <BarChartComponent
          data={topGap}
          xKey="procedimento"
          bars={[
            { key: "Repasse Atual", color: "#ef4444", name: "Repasse Atual" },
            { key: "Repasse Ideal", color: "#10b981", name: "Repasse Ideal" },
          ]}
          title="Top 10 - Maior Gap entre Repasse Atual e Ideal"
          formatAsCurrency
          height={350}
          layout="vertical"
        />
      )}

      {/* Full table */}
      <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">
          Todos os Procedimentos ({filteredItems.length})
        </h3>
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <table className="w-full text-[10px] sm:text-xs md:text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted font-medium">
                  Convênio
                </th>
                <th className="text-left py-2 px-3 text-muted font-medium">
                  Procedimento
                </th>
                <th className="text-right py-2 px-3 text-muted font-medium">
                  Valor
                </th>
                <th className="text-right py-2 px-3 text-muted font-medium">
                  Repasse Atual
                </th>
                <th className="text-right py-2 px-3 text-muted font-medium">
                  Repasse Ideal
                </th>
                <th className="text-right py-2 px-3 text-muted font-medium">
                  Diferença
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, i) => (
                <tr
                  key={i}
                  className="border-b border-border/50 hover:bg-background/50"
                >
                  <td className="py-2 px-3 text-xs text-muted">
                    {item.convenio}
                  </td>
                  <td className="py-2 px-3">{item.procedimento}</td>
                  <td className="py-2 px-3 text-right">
                    {formatBRL(item.valor)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {formatBRL(item.repasseAtual)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {formatBRL(item.repasseIdeal)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-medium ${
                      item.diferenca < 0 ? "text-danger" : item.diferenca > 0 ? "text-accent" : ""
                    }`}
                  >
                    {formatBRL(item.diferenca)}
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
