import React, { useMemo } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router.tsx";

export default function App() {
  const router = useMemo(() => getRouter(), []);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <RouterProvider router={router} />
    </div>
  );
}
