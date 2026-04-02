import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheets";

const TABS = [
  { key: "COD", sheet: "COD", range: "A1:Z40" },
  { key: "Agendamento", sheet: "Agendamento", range: "A1:V40" },
  { key: "Meta", sheet: "Meta", range: "A1:G40" },
  { key: "NPS", sheet: "NPS", range: "A1:N40" },
  { key: "Repasse", sheet: "Repasse", range: "A1:F40" },
];

export async function GET() {
  const result: Record<string, Record<string, (string | null)[]>> = {};

  for (const tab of TABS) {
    try {
      const data = await getSheetData(tab.sheet, tab.range);
      const rows: Record<string, (string | null)[]> = {};

      if (data) {
        for (let i = 0; i < data.length; i++) {
          const row = data[i] || [];
          // Pad to show all columns, replacing undefined with null
          const maxCols = 22; // up to column V
          const padded: (string | null)[] = [];
          for (let j = 0; j < maxCols; j++) {
            padded.push(row[j] !== undefined ? row[j] : null);
          }
          rows[`row_${i}`] = padded;
        }
      } else {
        rows["error"] = ["No data returned"];
      }

      result[tab.key] = rows;
    } catch (error) {
      result[tab.key] = {
        error: [`Error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  return NextResponse.json(result);
}
