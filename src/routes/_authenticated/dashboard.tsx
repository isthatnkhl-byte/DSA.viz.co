import { createFileRoute, Navigate, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/profile" });
  },
  component: DashboardRedirect,
});

function DashboardRedirect() {
  return <Navigate to="/profile" replace />;
}

export default DashboardRedirect;
