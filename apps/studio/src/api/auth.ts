import { apiFetch } from "./client";

export type User = { id: string; email: string };

export const authApi = {
  signup: (email: string, password: string) =>
    apiFetch<User>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    apiFetch<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
  me: () => apiFetch<User>("/auth/me"),
};
