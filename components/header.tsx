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
    <header className="bg-card border-b border-border px-3 py-2 md:px-6 md:py-3 flex items-center justify-between sticky top-0 z-20">
      <h2 className="text-sm md:text-lg font-semibold text-primary">
        Dashboard Clínica
      </h2>
      <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted">
        <RefreshCw size={10} className="md:w-3 md:h-3" />
        <span className="hidden sm:inline">Atualizado: {lastUpdate}</span>
        <span className="sm:hidden">{lastUpdate}</span>
      </div>
    </header>
  );
}
