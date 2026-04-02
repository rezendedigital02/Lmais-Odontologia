"use client";

import { useSheetData } from "@/lib/hooks";
import { formatBRL } from "@/lib/utils";
import { KPICard } from "@/components/cards/kpi-card";
import { PieChartComponent } from "@/components/charts/pie-chart";
import { CardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { DollarSign, Calculator } from "lucide-react";

export default function CustosPage() {
  const { data, isLoading } = useSheetData("cod");

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <ChartSkeleton />
          <TableSkeleton />
        </div>
      </div>
    );
  }

  const cod = data as {
    items: { categoria: string; item: string; valor: number }[];
    total: number;
    groups: Record<string, { categoria: string; item: string; valor: number }[]>;
  } | undefined;

  const items = cod?.items || [];
  const total = cod?.total || 0;
  const groups = cod?.groups || {};
  const diasUteis = 22;
  const ticketDiario = total / diasUteis;

  const pieData = Object.entries(groups).map(([name, groupItems]) => ({
    name: name.length > 20 ? name.substring(0, 17) + "..." : name,
    value: groupItems.reduce((s, item) => s + item.valor, 0),
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-lg sm:text-xl font-bold text-foreground">Custos Open Doors</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <KPICard
          title="Total de Custos Fixos"
          value={formatBRL(total)}
          subtitle="Custo mensal para manter a clínica aberta"
          icon={DollarSign}
          color="red"
        />
        <KPICard
          title="Ticket Médio Diário"
          value={formatBRL(ticketDiario)}
          subtitle={`Total / ${diasUteis} dias úteis`}
          icon={Calculator}
          color="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <PieChartComponent
          data={pieData}
          title="Distribuição por Categoria"
          formatAsCurrency
        />

        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">
            Detalhamento de Custos
          </h3>
          <div className="overflow-x-auto max-h-[350px]">
            <table className="w-full text-xs sm:text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted font-medium">Categoria</th>
                  <th className="text-left py-2 px-2 text-muted font-medium">Item</th>
                  <th className="text-right py-2 px-2 text-muted font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-background/50">
                    <td className="py-1.5 sm:py-2 px-2 text-[10px] sm:text-xs text-muted">{item.categoria}</td>
                    <td className="py-1.5 sm:py-2 px-2">{item.item}</td>
                    <td className="py-1.5 sm:py-2 px-2 text-right font-medium">{formatBRL(item.valor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-bold">
                  <td colSpan={2} className="py-2 px-2">Total</td>
                  <td className="py-2 px-2 text-right">{formatBRL(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
