import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Cookie, ShieldCheck, Sliders, CheckCircle2, Lock, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CookiePreferencesModal } from "@/components/legal/CookiePreferencesModal";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — DSA.viz.co" },
      {
        name: "description",
        content:
          "Detailed Cookie and Tracking Policy for DSA.viz.co explaining local storage, session cookies, and user consent management.",
      },
    ],
  }),
  component: CookiesPage,
});

export function CookiesPage() {
  const lastUpdated = "October 11, 2026";
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />

      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Header */}
        <div className="border-b border-border/70 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-4">
            <Cookie className="size-3.5" />
            <span>Transparency &amp; Storage Inventory</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-foreground">
            Cookie &amp; Local Storage Policy
          </h1>
          <p className="mt-2 text-xs font-mono text-muted-foreground">
            Effective Date: {lastUpdated} • Version 3.0 • GDPR &amp; ePrivacy Transparency
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={() => setIsModalOpen(true)}
              size="sm"
              className="text-xs font-mono font-bold bg-primary text-primary-foreground gap-2 shadow-sm"
            >
              <Sliders className="size-3.5" />
              <span>Change My Cookie Preferences</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-10 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {/* Section 1: Overview */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <span>1. What Are Cookies and Local Storage?</span>
            </h2>
            <p>
              Cookies are small text files stored on your computer or mobile device when you visit a website. Modern web applications also utilize <strong>Local Storage (HTML5)</strong> and <strong>Session Storage</strong>, which function similarly to cookies by allowing data to persist in your browser sandbox without being sent across every network request.
            </p>
            <p>
              DSA.viz.co uses cookies and local storage to deliver high-performance interactive algorithm visualizers, preserve your theme choices, keep you securely authenticated, and defend our infrastructure against abuse.
            </p>
          </section>

          {/* Section 2: Detailed Cookie Inventory Table */}
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              <span>2. Detailed Inventory of Cookies &amp; Storage Keys</span>
            </h2>
            <p>Below is an exhaustive inventory of the storage items utilized across DSA.viz.co:</p>

            <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/60 text-foreground font-mono font-semibold uppercase text-[10px] border-b border-border/70">
                  <tr>
                    <th className="p-3">Identifier / Key</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-muted-foreground">
                  <tr>
                    <td className="p-3 font-mono font-bold text-foreground">firebase:authUser</td>
                    <td className="p-3 font-mono">IndexedDB / Storage</td>
                    <td className="p-3 text-primary font-semibold">Strictly Necessary</td>
                    <td className="p-3">Session / Persistent</td>
                    <td className="p-3">Maintains cryptographically verified user authentication across page reloads.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-foreground">dsaviz_vault_blob</td>
                    <td className="p-3 font-mono">HttpOnly Cookie (AES-256-GCM)</td>
                    <td className="p-3 text-primary font-semibold">Strictly Necessary</td>
                    <td className="p-3">1 Year</td>
                    <td className="p-3">Stores your backend-sealed AES-256-GCM account key vault envelope (bound to your Google UID) so your personal AI keys remain active across refreshes and serverless cold starts alongside Firebase Cloud Firestore.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-foreground">dsaviz_cookie_consent</td>
                    <td className="p-3 font-mono">Local Storage</td>
                    <td className="p-3 text-primary font-semibold">Strictly Necessary</td>
                    <td className="p-3">1 Year</td>
                    <td className="p-3">Stores your privacy choices and cookie preferences.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-foreground">dsaviz:theme_color</td>
                    <td className="p-3 font-mono">Local Storage</td>
                    <td className="p-3 text-emerald-400 font-semibold">Functional</td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Stores your preferred neon accent color (purple, emerald, cyan, etc.).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-foreground">dsaviz:color_mode</td>
                    <td className="p-3 font-mono">Local Storage</td>
                    <td className="p-3 text-emerald-400 font-semibold">Functional</td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Remembers your dark/light appearance setting.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-foreground">dsaviz_editor_draft_*</td>
                    <td className="p-3 font-mono">Local Storage</td>
                    <td className="p-3 text-emerald-400 font-semibold">Functional</td>
                    <td className="p-3">Persistent</td>
                    <td className="p-3">Protects unsaved pseudocode drafts in case of accidental browser close.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-foreground">dsaviz_perf_metrics</td>
                    <td className="p-3 font-mono">Local Storage</td>
                    <td className="p-3 text-amber-400 font-semibold">Analytics</td>
                    <td className="p-3">30 Days</td>
                    <td className="p-3">Measures compilation and visualizer FPS for performance debugging (strictly opt-in).</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: How to Manage and Revoke Consent */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <span>3. How to Manage or Revoke Your Consent</span>
            </h2>
            <p>You have continuous, unfettered control over how cookies are stored on your device:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>On-Page Preference Manager:</strong> Click the "Change My Cookie Preferences" button at any time to toggle non-essential cookies on or off. Changes take effect immediately without requiring a page refresh.
              </li>
              <li>
                <strong>Global Privacy Control (GPC):</strong> If you use a privacy-enabled browser or extension that transmits the <code>Sec-GPC</code> or <code>DNT</code> (Do Not Track) signal, DSA.viz.co automatically recognizes this signal and disables all non-essential analytics cookies.
              </li>
              <li>
                <strong>Browser Settings:</strong> You can configure your browser (Chrome, Firefox, Safari, Edge) to block or delete cookies. Note that disabling strictly necessary storage will prevent you from signing in to your account.
              </li>
            </ul>
          </section>

          {/* Section 4: Contact */}
          <section className="space-y-3 border-t border-border/60 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              <span>4. Contact Our Privacy &amp; Security Team</span>
            </h2>
            <p>
              If you have any questions regarding our use of cookies, local storage, or encrypted vault cookies, please contact us via our official repository channels at{" "}
              <a
                href="https://github.com/isthatnkhl-byte/DSA.viz.co/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-mono text-xs underline hover:text-accent"
              >
                github.com/isthatnkhl-byte/DSA.viz.co/issues
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Preferences Modal */}
      <CookiePreferencesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <SiteFooter />
    </div>
  );
}

export default CookiesPage;
