import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

const cache = new Map<string, { data: string[][] | null; timestamp: number }>();
const CACHE_TTL = 30_000; // 30 seconds

export async function getSheetData(
  sheetName: string,
  range: string
): Promise<string[][] | null> {
  const cacheKey = `${sheetName}!${range}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
  });

  const data = (response.data.values as string[][] | undefined) ?? null;
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
