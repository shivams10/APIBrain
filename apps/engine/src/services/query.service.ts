import { retrieveRelevantChunks, type RetrievedChunk } from "../lib/retrieval";
import { streamAnswer } from "../lib/llm";

export type Source = { index: number; documentId: string; title: string; chunkIndex: number };

type AnswerHandlers = {
  onSources: (sources: Source[]) => void;
  onToken: (token: string) => void;
};

function buildPrompt(question: string, chunks: RetrievedChunk[]): string {
  const sourceList = chunks
    .map((c, i) => `[${i + 1}] (from "${c.title}", chunk ${c.chunkIndex}): ${c.content}`)
    .join("\n\n");

  return `You are APIBrain, an assistant that answers questions about API documentation using ONLY the sources below. Cite sources inline using bracketed numbers like [1] or [2] matching the list. If the sources don't contain enough information to answer, say so explicitly instead of guessing.

Sources:
${sourceList}

Question: ${question}

Answer:`;
}

export async function answerQuestion(
  projectId: string,
  question: string,
  documentId: string | undefined,
  handlers: AnswerHandlers,
  signal: AbortSignal,
): Promise<void> {
  const chunks = await retrieveRelevantChunks(projectId, question, documentId);

  const sources = chunks.map((chunk, i) => ({
    index: i + 1,
    documentId: chunk.documentId,
    title: chunk.title,
    chunkIndex: chunk.chunkIndex,
  }));
  handlers.onSources(sources);

  if (chunks.length === 0) {
    handlers.onToken("No ingested documents found for this project yet.");
    return;
  }

  await streamAnswer(buildPrompt(question, chunks), handlers.onToken, signal);
}
