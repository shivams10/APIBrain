import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useLogout } from "../hooks/useAuth";
import { projectsApi } from "../api/project";

export default function ProjectsPage() {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const logout = useLogout();
  const { data: projects, isLoading } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.list });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await projectsApi.create(name);
    setName("");
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <button className="text-sm text-red-600" onClick={() => logout.mutate()}>Log out</button>
      </div>

      <form className="flex gap-2" onSubmit={handleCreate}>
        <input className="border rounded px-3 py-2 flex-1" placeholder="New project name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="bg-blue-600 text-white rounded px-4">Create</button>
      </form>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects?.map((p) => (
            <li key={p.id}>
              <Link to={`/projects/${p.id}`} className="block border rounded px-4 py-3 hover:bg-gray-50">{p.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}