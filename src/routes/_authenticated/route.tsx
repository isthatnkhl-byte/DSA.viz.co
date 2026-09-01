import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Rely on AuthContext inside the components instead of blocking here,
    // because Firebase Auth requires onAuthStateChanged to resolve first.
    return {};
  },
  component: () => <Outlet />,
});
