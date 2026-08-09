import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

export async function streamAnswer(
  prompt: string,
  onToken: (token: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const stream = await openai.chat.completions.create(
    {
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    },
    { signal },
  );

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) onToken(token);
  }
}