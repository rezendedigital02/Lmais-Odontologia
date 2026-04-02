import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function parseNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const cleaned = value
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/%/g, "")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function getNPSColor(nps: number): string {
  if (nps >= 70) return "text-accent";
  if (nps >= 50) return "text-warning";
  return "text-danger";
}

export function getNPSBgColor(nps: number): string {
  if (nps >= 70) return "bg-accent";
  if (nps >= 50) return "bg-warning";
  return "bg-danger";
}
