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
  // Handle " R$  2.701,76 ", "R$ -", "72%", plain numbers, etc.
  let cleaned = value
    .replace(/R\$/g, "")   // remove R$ (no \s? — spaces handled next)
    .replace(/\s+/g, "")   // remove ALL whitespace
    .replace(/%/g, "")     // remove %
    .trim();
  // "R$ -" or just "-" means zero
  if (cleaned === "-" || cleaned === "") return 0;
  // BRL format: "2.701,76" → remove dots (thousands), replace comma (decimal)
  cleaned = cleaned.replace(/\./g, "").replace(",", ".");
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
