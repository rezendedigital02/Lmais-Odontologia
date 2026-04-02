import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateInsights(data: Record<string, unknown>) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Você é um consultor de gestão de clínicas odontológicas.
Analise os dados fornecidos e gere um relatório executivo em português brasileiro.
Seja direto, prático e use números específicos dos dados.
Formate em markdown com seções: Resumo, Pontos Positivos, Pontos de Atenção, Sugestões de Melhoria.`,
      },
      {
        role: "user",
        content: `Dados da clínica:\n${JSON.stringify(data, null, 2)}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return completion.choices[0].message.content;
}
