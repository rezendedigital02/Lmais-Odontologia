import { NextResponse } from "next/server";
import { getSheetData } from "@/lib/sheets";

export async function GET() {
  const result: Record<string, Record<string, (string | null)[]>> = {};

  // Read Meta rows 210-250 (where April 26 data should be)
  const ranges = [
    { key: "Meta_rows_1_40", range: "A1:G40" },
    { key: "Meta_rows_210_250", range: "A210:G250" },
    { key: "Agendamento_rows_1_60", range: "A1:V60" },
  ];

  for (const r of ranges) {
    try {
      const data = await getSheetData("Meta", r.range);
      if (r.key.startsWith("Agendamento")) {
        const agData = await getSheetData("Agendamento", r.range);
        const rows: Record<string, (string | null)[]> = {};
        if (agData) {
          for (let i = 0; i < agData.length; i++) {
            const row = agData[i] || [];
            const padded: (string | null)[] = [];
            for (let j = 0; j < 22; j++) {
              padded.push(row[j] !== undefined ? row[j] : null);
            }
            rows[`row_${i}`] = padded;
          }
        }
        result[r.key] = rows;
        continue;
      }

      const rows: Record<string, (string | null)[]> = {};
      if (data) {
        for (let i = 0; i < data.length; i++) {
          const row = data[i] || [];
          const padded: (string | null)[] = [];
          for (let j = 0; j < 7; j++) {
            padded.push(row[j] !== undefined ? row[j] : null);
          }
          // Label with actual sheet row number
          const actualRow = r.key.includes("210") ? i + 210 : i + 1;
          rows[`row_${actualRow}`] = padded;
        }
      }
      result[r.key] = rows;
    } catch (error) {
      result[r.key] = {
        error: [`Error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  return NextResponse.json(result);
}
