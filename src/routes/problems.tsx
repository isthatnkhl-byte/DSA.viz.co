import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { ProblemCatalog } from "@/components/problems/ProblemCatalog";

export const Route = createFileRoute("/problems")({
  head: () => ({
    meta: [
      { title: "200+ Company-Tagged Problems — DSA.viz" },
      {
        name: "description",
        content:
          "Browse 200+ company-tagged LeetCode problems with instant AI review and step-by-step visualizations.",
      },
    ],
  }),
  component: ProblemsPage,
});

function ProblemsPage() {
  return (
    <div className="min-h-screen pb-20">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <ProblemCatalog />
      </main>
    </div>
  );
}

export default ProblemsPage;
