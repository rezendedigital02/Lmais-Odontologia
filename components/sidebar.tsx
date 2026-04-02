"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DollarSign,
  CalendarDays,
  Target,
  Star,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Visão Geral", shortLabel: "Geral", icon: LayoutDashboard },
  { href: "/custos", label: "Custos", shortLabel: "Custos", icon: DollarSign },
  { href: "/agendamento", label: "Agendamento", shortLabel: "Agenda", icon: CalendarDays },
  { href: "/meta", label: "Meta", shortLabel: "Meta", icon: Target },
  { href: "/nps", label: "NPS", shortLabel: "NPS", icon: Star },
  { href: "/repasse", label: "Repasse", shortLabel: "Repasse", icon: ArrowLeftRight },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-sidebar-bg text-sidebar-text min-h-screen fixed left-0 top-0 z-30">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold tracking-tight">L+ Odontologia</h1>
          <p className="text-xs text-white/60 mt-0.5">Dashboard Clínica</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-hover text-white font-medium"
                    : "text-white/70 hover:bg-sidebar-hover hover:text-white"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom navigation bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-sidebar-bg text-sidebar-text z-40 flex justify-around items-center py-1.5 border-t border-white/10 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[3rem] py-1 rounded-md transition-colors",
                isActive
                  ? "text-white"
                  : "text-white/50 active:text-white/80"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={cn(
                "text-[9px] leading-tight",
                isActive ? "font-semibold" : "font-normal"
              )}>
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
