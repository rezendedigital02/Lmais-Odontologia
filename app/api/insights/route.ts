import { NextRequest, NextResponse } from "next/server";
import { generateInsights } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const insights = await generateInsights(data);
    return NextResponse.json({ insights });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar insights" },
      { status: 500 }
    );
  }
}
