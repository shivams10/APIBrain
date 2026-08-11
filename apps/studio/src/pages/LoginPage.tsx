import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLogin } from "../hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();

  return (
    <form
      className="max-w-sm mx-auto mt-24 flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate({ email, password }, { onSuccess: () => navigate("/") });
      }}
    >
      <h1 className="text-2xl font-semibold">Log in</h1>
      <input className="border rounded px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="border rounded px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {login.isError && <p className="text-red-600 text-sm">{login.error.message}</p>}
      <button className="bg-blue-600 text-white rounded px-3 py-2" disabled={login.isPending}>
        {login.isPending ? "Logging in..." : "Log in"}
      </button>
      <Link to="/signup" className="text-sm text-blue-600">Need an account? Sign up</Link>
    </form>
  );
}