import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { askQuestion, type Source } from "../api/query";
import { projectsApi } from "../api/project";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const { data: documents } = useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => projectsApi.listDocuments(projectId!),
    refetchInterval: 10000, // cheap polling for PENDING/PROCESSING -> READY, matches Phase 3's status model
  });

  const [urlTitle, setUrlTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [asking, setAsking] = useState(false);

  async function handleUrlIngest(e: React.FormEvent) {
    e.preventDefault();
    await projectsApi.ingestUrl(projectId!, urlTitle, url);
    setUrlTitle("");
    setUrl("");
    queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
  }

  async function handleFileIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    await projectsApi.ingestFile(projectId!, fileTitle || file.name, file);
    setFile(null);
    setFileTitle("");
    queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setAnswer("");
    setSources([]);
    setAsking(true);
    try {
      await askQuestion(projectId!, question, undefined, {
        onSources: setSources,
        onToken: (token) => setAnswer((prev) => prev + token),
      });
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-12 flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-semibold mb-2">Documents</h2>
        <ul className="flex flex-col gap-1 mb-4">
          {documents?.map((d) => (
            <li key={d.id} className="flex justify-between border rounded px-3 py-2">
              <span>{d.title}</span>
              <span className={d.status === "READY" ? "text-green-600" : d.status === "FAILED" ? "text-red-600" : "text-gray-500"}>
                {d.status}
              </span>
            </li>
          ))}
        </ul>

        <form className="flex gap-2 mb-2" onSubmit={handleUrlIngest}>
          <input className="border rounded px-2 py-1 flex-1" placeholder="Title" value={urlTitle} onChange={(e) => setUrlTitle(e.target.value)} />
          <input className="border rounded px-2 py-1 flex-1" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="bg-blue-600 text-white rounded px-3">Ingest URL</button>
        </form>

        <form className="flex gap-2" onSubmit={handleFileIngest}>
          <input className="border rounded px-2 py-1 flex-1" placeholder="Title (optional)" value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button className="bg-blue-600 text-white rounded px-3">Upload</button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Ask a question</h2>
        <form className="flex gap-2 mb-4" onSubmit={handleAsk}>
          <input className="border rounded px-2 py-1 flex-1" placeholder="Ask about this project's docs..." value={question} onChange={(e) => setQuestion(e.target.value)} />
          <button className="bg-blue-600 text-white rounded px-3" disabled={asking}>{asking ? "Asking..." : "Ask"}</button>
        </form>

        {answer && <p className="whitespace-pre-wrap border rounded p-3 mb-2">{answer}</p>}

        {sources.length > 0 && (
          <ol className="text-sm text-gray-600 flex flex-col gap-1">
            {sources.map((s) => (
              <li key={s.index}>[{s.index}] {s.title} (chunk {s.chunkIndex})</li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}