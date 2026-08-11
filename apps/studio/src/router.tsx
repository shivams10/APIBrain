import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import SignupPage from "./pages/SignupPage";

function ProtectedLayout() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: "/", element: <ProjectsPage /> },
      { path: "/projects/:projectId", element: <ProjectDetailPage /> },
    ],
  },
]);
