export type Source = { index: number; documentId: string; title: string; chunkIndex: number };

async function* parseSSEStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const eventLine = rawEvent.split("\n").find((l) => l.startsWith("event:"));
      const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data:"));
      if (eventLine && dataLine) {
        yield { event: eventLine.slice(6).trim(), data: dataLine.slice(5).trim() };
      }
    }
  }
}

export async function askQuestion(
  projectId: string,
  question: string,
  documentId: string | undefined,
  handlers: { onSources: (sources: Source[]) => void; onToken: (token: string) => void },
): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/projects/${projectId}/query`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, documentId }),
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to start query");
  }

  for await (const { event, data } of parseSSEStream(response.body)) {
    if (event === "sources") handlers.onSources(JSON.parse(data));
    else if (event === "token") handlers.onToken(JSON.parse(data).token);
    else if (event === "error") throw new Error(JSON.parse(data).error);
    else if (event === "done") return;
  }
}
