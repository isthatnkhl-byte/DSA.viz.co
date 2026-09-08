import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Shield, FileText, Scale, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — DSA.viz.co" },
      {
        name: "description",
        content:
          "Terms and Conditions governing the use of DSA.viz.co algorithmic visualizations, compiler sandboxes, and AI technical interview tools.",
      },
    ],
  }),
  component: TermsPage,
});

export function TermsPage() {
  const lastUpdated = "September 8, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />

      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Header Ribbon */}
        <div className="border-b border-border/70 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-4">
            <Scale className="size-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-foreground">
            Terms and Conditions
          </h1>
          <p className="mt-2 text-xs font-mono text-muted-foreground">
            Effective Date: {lastUpdated} • Version 2.0
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="size-4 text-primary" />
              <span>1. Acceptance of Terms</span>
            </h2>
            <p>
              By accessing, browsing, or utilizing <strong>DSA.viz.co</strong> ("we", "us", "our", or the "Platform"), you ("User", "Developer", or "Candidate") acknowledge that you have read, understood, and irrevocably agree to be bound by these Terms and Conditions ("Terms") and our <Link to="/privacy" className="text-primary underline hover:text-accent">Privacy Policy</Link> and <Link to="/cookies" className="text-primary underline hover:text-accent">Cookie Policy</Link>. If you do not agree to these Terms, you must cease using the Platform immediately.
            </p>
          </section>

          {/* Section 2: Educational Platform & Intellectual Property */}
          <section className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <span>2. Independent Educational Platform &amp; Fair Use Disclaimer</span>
            </h2>
            <p>
              DSA.viz.co is an independent educational technology and visual algorithm simulation platform designed to build structural intuition for data structures and algorithmic complexity.
            </p>
            <p>
              <strong>Trademark Notice:</strong> "LeetCode" is a registered trademark of LeetCode LLC. "HackerRank" is a registered trademark of HackerRank, Inc. DSA.viz.co is not affiliated with, sponsored by, authorized by, or endorsed by LeetCode LLC, HackerRank, Inc., or any of their respective affiliates. Problem titles, algorithmic descriptions, and constraint parameters referenced on the Platform are utilized strictly under non-commercial fair use principles for transformative pedagogical, research, and comparative computer science education.
            </p>
          </section>

          {/* Section 3: Educational Advice & No Guaranteed Outcomes */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <span>3. No Guaranteed Interview Outcomes or Job Offers</span>
            </h2>
            <p>
              The Platform provides educational simulations, Socratic AI coaching hints, and algorithmic visualizers. While these tools are architected to assist developers in preparing for software engineering evaluations, <strong>DSA.viz.co does not warrant or guarantee that use of the Platform will result in interview passage, employment offers, promotion, or compensation increases at any company or institution.</strong>
            </p>
            <p>
              Algorithmic ratings (such as 1-10 scores, asymptotic complexity badges, or interview evaluation tier summaries) are automated heuristic assessments intended purely for practice and self-reflection.
            </p>
          </section>

          {/* Section 4: Acceptable Use & Compiler Sandbox Rules */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Scale className="size-4 text-primary" />
              <span>4. Acceptable Use &amp; Sandboxed Execution Policy</span>
            </h2>
            <p>
              The Platform grants you a revocable, non-exclusive, non-transferable, limited license to access our educational services. You expressly agree that you will NOT:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Execute or transmit malicious code, destructive logic, cryptocurrency mining routines, network fuzzers, or fork-bombs via the C++ compiler sandbox or API endpoints;
              </li>
              <li>
                Circumvent, disable, or tamper with security-related features, authentication tokens, rate limiters, or access restrictions;
              </li>
              <li>
                Impersonate other users or harvest authentication tokens or user submissions;
              </li>
              <li>
                Engage in automated scraping, mass harvesting, or denial-of-service (DoS/DDoS) attacks against our servers, APIs, or sandbox workers;
              </li>
              <li>
                Use the Platform for any purpose that violates applicable local, state, national, or international computer fraud and abuse laws.
              </li>
            </ul>
          </section>

          {/* Section 5: Mock Interview Hardware Telemetry & Privacy */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="size-4 text-primary" />
              <span>5. Live Mock Interview Environment &amp; Browser-Only Processing</span>
            </h2>
            <p>
              Our proctored mock interview simulator permits candidates to practice under realistic simulated conditions with webcam, microphone volume monitoring, and full-screen focus checks.
            </p>
            <p>
              <strong>Privacy Assurance:</strong> Video frames and microphone audio streams are processed exclusively within the local browser runtime memory for visual meters and speech recognition. <strong>No video or audio recordings are uploaded, stored, or transmitted to our backend servers.</strong>
            </p>
          </section>

          {/* Section 6: User Accounts & Data Retention */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span>6. User Accounts &amp; Right to Erasure</span>
            </h2>
            <p>
              You are responsible for safeguarding your login credentials. You agree to notify us immediately of any unauthorized use of your account. Under our commitment to data minimization and global privacy regulations (GDPR, CCPA, DPDP), you retain full ownership of your algorithm notes, pseudocode attempts, and code submissions, and you may permanently delete your data and account at any time via the User Profile page or by contacting support.
            </p>
          </section>

          {/* Section 7: Disclaimers & Limitation of Liability */}
          <section className="space-y-3 border-t border-border/60 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              7. Warranty Disclaimer &amp; Limitation of Liability
            </h2>
            <p className="uppercase text-[11px] font-mono text-muted-foreground">
              THE PLATFORM, INCLUDING ALL CODE ENGINES, VISUALIZERS, SIMULATIONS, AND AI DIAGNOSTICS, IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED UNDER APPLICABLE LAW, DSA.VIZ.CO DISCLAIMS ALL WARRANTIES, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. IN NO EVENT SHALL DSA.VIZ.CO, ITS DEVELOPERS, OR CONTRIBUTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF YOUR USE OF OR INABILITY TO USE THE PLATFORM.
            </p>
          </section>

          {/* Section 8: Changes to Terms */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              8. Modifications to Terms
            </h2>
            <p>
              We reserve the right to revise or replace these Terms at our discretion. Notice of substantial revisions will be made visible on this page with an updated Effective Date. Continued use of the Platform after changes are posted constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Section 9: Contact */}
          <section className="space-y-3 border-t border-border/60 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              <span>9. Inquiries &amp; Legal Notices</span>
            </h2>
            <p>
              For legal questions, intellectual property notices, or compliance inquiries, please contact our administrative team at{" "}
              <code className="text-primary font-mono text-xs bg-muted/60 px-2 py-0.5 rounded">legal@dsa.viz.co</code>.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default TermsPage;
