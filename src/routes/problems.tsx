import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProblemCatalog } from "@/components/problems/ProblemCatalog";

export const Route = createFileRoute("/problems")({
  head: () => ({
    meta: [
      { title: "1,500+ Algorithmic & Data Structure Problems — DSA.viz" },
      {
        name: "description",
        content:
          "Browse 1,500+ classic algorithmic and data structure problems with Socratic AI feedback and step-by-step visualizations.",
      },
    ],
  }),
  component: ProblemsPage,
});

function ProblemsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main id="main-content" className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <ProblemCatalog />
      </main>
      <SiteFooter />
    </div>
  );
}

export default ProblemsPage;
