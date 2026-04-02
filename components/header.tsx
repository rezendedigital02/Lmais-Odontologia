"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export function Header() {
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => {
    const update = () => {
      setLastUpdate(
        new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-card border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <h2 className="text-lg font-semibold text-primary">Dashboard Clínica</h2>
      <div className="flex items-center gap-2 text-xs text-muted">
        <RefreshCw size={12} />
        <span>Atualizado: {lastUpdate}</span>
      </div>
    </header>
  );
}
