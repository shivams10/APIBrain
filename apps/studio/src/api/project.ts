import { apiFetch } from "./client";

export type Project = { id: string; name: string; createdAt: string };
export type Document = {
  id: string;
  title: string;
  sourceType: "PDF" | "MARKDOWN" | "URL";
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  errorMessage: string | null;
};

export const projectsApi = {
  list: () => apiFetch<Project[]>("/projects"),
  create: (name: string) =>
    apiFetch<Project>("/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  listDocuments: (projectId: string) =>
    apiFetch<Document[]>(`/projects/${projectId}/documents`),
  ingestUrl: (projectId: string, title: string, url: string) =>
    apiFetch<Document>(`/projects/${projectId}/documents`, {
      method: "POST",
      body: JSON.stringify({ title, url }),
    }),
  ingestFile: async (
    projectId: string,
    title: string,
    file: File,
  ): Promise<Document> => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/projects/${projectId}/documents`,
      {
        method: "POST",
        credentials: "include",
        body: formData, // no Content-Type header — the browser sets the multipart boundary itself
      },
    );
    if (!response.ok) throw new Error("Upload failed");
    return response.json();
  },
  getDocument: (documentId: string) =>
    apiFetch<Document>(`/documents/${documentId}`),
};
