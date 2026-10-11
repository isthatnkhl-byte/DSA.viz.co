import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Shield, FileText, Scale, AlertTriangle, CheckCircle, HelpCircle, Cpu, Gavel } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service & Fair Use Notice — DSA.viz.co" },
      {
        name: "description",
        content:
          "Terms of Service, Nominative Fair Use Disclaimer (17 U.S.C. § 107), DMCA Policy, and Liability Limitations governing DSA.viz.co.",
      },
    ],
  }),
  component: TermsPage,
});

export function TermsPage() {
  const lastUpdated = "October 11, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />

      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Header Ribbon */}
        <div className="border-b border-border/70 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary mb-4">
            <Scale className="size-3.5" />
            <span>Legal Agreement &amp; Fair Use Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-foreground">
            Terms of Service &amp; Fair Use Notice
          </h1>
          <p className="mt-2 text-xs font-mono text-muted-foreground">
            Effective Date: {lastUpdated} • Version 3.0 (Z1 Legal &amp; Fair Use Hardened)
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
              By accessing, browsing, or utilizing <strong>DSA.viz.co</strong> ("we", "us", "our", or the "Platform"), you ("User", "Student", or "Developer") acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"), our{" "}
              <Link to="/privacy" className="text-primary underline hover:text-accent">
                Privacy Policy
              </Link>
              , and our{" "}
              <Link to="/cookies" className="text-primary underline hover:text-accent">
                Cookie Policy
              </Link>
              . If you do not agree to these Terms, please discontinue use of the Platform immediately.
            </p>
          </section>

          {/* Section 2: Educational Platform, Statutory Fair Use & Nominative Fair Use */}
          <section className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <span>2. Independent Educational Project, Statutory Fair Use (17 U.S.C. § 107) &amp; Nominative Fair Use</span>
            </h2>
            <p>
              <strong>DSA.viz.co</strong> is an independent, non-affiliated computer science education and algorithm visualization project designed to help students and software engineers build visual intuition for data structures, memory pointers, and asymptotic time/space complexity.
            </p>
            <p>
              <strong>Non-Affiliation &amp; Trademark Disclaimer:</strong> All third-party product names, company names, brand names, logos, and study sheet titles referenced on the Platform are the property of their respective owners. Specifically:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Coding Platforms:</strong> "LeetCode" is a registered trademark of LeetCode LLC. "HackerRank" is a registered trademark of HackerRank, Inc. "Codeforces" is a property of its respective operators.
              </li>
              <li>
                <strong>Community Study Curricula &amp; Educators:</strong> References to public study roadmaps such as "Striver's A2Z DSA Sheet" / "Striver's SDE Sheet" (TakeUForward / Raj Vikramaditya), "NeetCode 150", "Blind 75", "Grind 75" (Tech Interview Handbook / Yangshun Tay), "Love Babbar 450", "Apna College DSA Sheet", and "Sean Prasad LeetCode Patterns" are included strictly for descriptive educational indexing and attribution, with direct outbound links provided to the original problem pages on <code>leetcode.com</code>.
              </li>
              <li>
                <strong>Technology Companies:</strong> References to company names including Google®, Meta®, Amazon®, Apple®, Netflix®, Microsoft®, Bloomberg®, Uber®, Airbnb®, Stripe®, and OpenAI® are used strictly under <strong>Nominative Fair Use</strong> to categorize publicly reported, historical computer science topic tags.
              </li>
            </ul>
            <p>
              <strong>DSA.viz.co is NOT affiliated with, endorsed by, sponsored by, authorized by, or officially connected with LeetCode LLC, HackerRank, Inc., TakeUForward, NeetCode, or any listed technology company.</strong>
            </p>
            <p>
              <strong>17 U.S.C. § 107 &amp; § 102(b) Compliance:</strong> Under U.S. copyright law (17 U.S.C. § 102(b)) and international equivalents, abstract algorithms, mathematical formulas, invariants, and data structure operations are not subject to copyright protection. Problem titles, topic metadata, and illustrative examples on this Platform are used strictly for <strong>transformative, non-commercial educational commentary, step-by-step visual state inspection, and Socratic pedagogy</strong> under 17 U.S.C. § 107 (Fair Use), and link directly to original problem sources rather than acting as a substitute for any commercial judge.
            </p>
          </section>

          {/* Section 3: DMCA Safe Harbor & Good-Faith Takedown Policy */}
          <section className="space-y-3 rounded-2xl border border-border/80 bg-card/60 p-5">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Gavel className="size-4 text-primary" />
              <span>3. DMCA Safe Harbor, Attribution &amp; Good-Faith Takedown Policy (17 U.S.C. § 512)</span>
            </h2>
            <p>
              We respect the intellectual property rights of all creators, educators, and platform owners. If you are a copyright owner, trademark holder, or curriculum author and believe that any problem reference, sheet index, or attribution on DSA.viz.co goes beyond fair use or requires updated attribution or removal, please submit a notice via our official repository issue tracker:
            </p>
            <p className="font-mono text-xs bg-secondary/70 p-3 rounded-xl border border-border/60 text-foreground">
              Official Notice &amp; Takedown Channel:{" "}
              <a
                href="https://github.com/isthatnkhl-byte/DSA.viz.co/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-accent"
              >
                https://github.com/isthatnkhl-byte/DSA.viz.co/issues
              </a>
            </p>
            <p>
              Please include: (a) identification of the work or mark claimed to be infringed, (b) the specific URL or item on DSA.viz.co, (c) your contact details, and (d) a good-faith statement of authorization. Upon receipt of a valid request, we act expeditiously (typically within 24–72 hours) to update attribution or remove the specified reference.
            </p>
          </section>

          {/* Section 4: No Guaranteed Outcomes & AI Output Disclaimer */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <span>4. Educational Simulation Only — No Employment Guarantee &amp; AI Disclaimer</span>
            </h2>
            <p>
              The Platform provides educational algorithm visualizations, AI-generated coaching hints, and simulated practice environments. <strong>DSA.viz.co makes no representation, warranty, or guarantee that using the Platform will result in passing any technical interview, receiving a job offer, or achieving any academic or professional outcome.</strong>
            </p>
            <p>
              <strong>AI-Generated Feedback &amp; Heuristics:</strong> All Socratic coaching hints, code analyses, complexity evaluations, and mock interview scorecards (including simulated ratings or "Hire / Practice" study indicators) are generated by automated heuristics and third-party Large Language Models (such as Google Gemini, OpenRouter, or OpenAI). AI outputs are probabilistic and may contain inaccuracies, incomplete edge-case analysis, or formatting errors. Users must independently verify all code and complexity proofs.
            </p>
          </section>

          {/* Section 5: Acceptable Use, Third-Party Compiler Sandboxes & BYOK Vault */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Cpu className="size-4 text-primary" />
              <span>5. Acceptable Use, Third-Party Compiler Execution &amp; BYOK API Keys</span>
            </h2>
            <p>
              When using our C++ compiler runner or AI features, you acknowledge and agree to the following technical terms:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Third-Party Compiler Proxies:</strong> Code submitted in the C++ Compiler view is transmitted over HTTPS to public sandboxed compilation services (Compiler Explorer / Godbolt API and Wandbox API) for execution. Do not include confidential, proprietary, or personally identifiable information in source code sent for compilation.
              </li>
              <li>
                <strong>Bring-Your-Own-Key (BYOK) Responsibility:</strong> When you configure personal AI API keys (Gemini, OpenRouter, or OpenAI) in your Personal AI Key Vault, your keys are encrypted at rest via <code>AES-256-GCM</code> bound to your authenticated Google UID. You remain solely responsible for any API usage quotas, billing, or terms of service associated with your third-party AI provider account.
              </li>
              <li>
                <strong>Prohibited Conduct:</strong> You must not submit malicious payloads, fork-bombs, network scanners, unauthorized scraping scripts, or denial-of-service traffic to the Platform or its upstream compiler/AI APIs.
              </li>
            </ul>
          </section>

          {/* Section 6: Mock Interview Hardware Telemetry & Privacy */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="size-4 text-primary" />
              <span>6. Live Mock Interview Environment &amp; Local Browser Processing</span>
            </h2>
            <p>
              Our practice interview simulator allows users to optionally enable webcam preview, microphone speech-to-text, and browser tab-focus indicators to simulate a realistic coding session.
            </p>
            <p>
              <strong>Zero Biometric Upload:</strong> Webcam video streams and microphone audio signals are processed exclusively inside your local browser runtime (via HTML5 MediaStream and Web Audio / Web Speech APIs). <strong>DSA.viz.co never records, uploads, or stores audio, video, or biometric identifiers on any server.</strong>
            </p>
          </section>

          {/* Section 7: User Accounts & Data Erasure */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span>7. User Accounts, Ownership &amp; Right to Erasure</span>
            </h2>
            <p>
              You retain ownership of the pseudocode, notes, and C++ solutions you author on the Platform. You may revoke your saved API keys or permanently delete your account and associated Cloud Firestore records at any time from your Profile settings.
            </p>
          </section>

          {/* Section 8: Warranty Disclaimer, Limitation of Liability & Indemnification */}
          <section className="space-y-3 border-t border-border/60 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              8. "AS-IS" Warranty Disclaimer, Limitation of Liability &amp; Indemnification
            </h2>
            <p className="uppercase text-[11px] font-mono text-muted-foreground">
              THE PLATFORM, INCLUDING ALL VISUALIZATIONS, STUDY INDEXES, COMPILER PROXIES, AND AI COACHING TOOLS, IS PROVIDED STRICTLY ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF ACCURACY, RELIABILITY, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL DSA.VIZ.CO, ITS CREATORS, MAINTAINERS, OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF DATA, API CHARGES, OR EMPLOYMENT OPPORTUNITIES) ARISING OUT OF OR RELATING TO YOUR USE OF THE PLATFORM.
            </p>
            <p>
              <strong>Indemnification &amp; Good-Faith Dispute Resolution:</strong> You agree to indemnify and hold harmless the maintainers and contributors of DSA.viz.co from any claims or damages arising from your violation of these Terms or misuse of third-party APIs. Before initiating any formal legal proceeding or claim regarding content, trademarks, or Platform operation, the claiming party agrees to provide written notice via our official GitHub channel and allow a thirty (30) day good-faith cure period to resolve or remove the disputed material without litigation.
            </p>
          </section>

          {/* Section 9: Contact */}
          <section className="space-y-3 border-t border-border/60 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              <span>9. Official Contact &amp; Legal Notices</span>
            </h2>
            <p>
              For legal inquiries, fair-use attribution updates, DMCA notices, or security disclosures, please contact the maintainers via our verified public repository channels:{" "}
              <a
                href="https://github.com/isthatnkhl-byte/DSA.viz.co/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-mono text-xs underline hover:text-accent"
              >
                github.com/isthatnkhl-byte/DSA.viz.co/issues
              </a>{" "}
              or{" "}
              <a
                href="https://github.com/isthatnkhl-byte/DSA.viz.co/security"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-mono text-xs underline hover:text-accent"
              >
                github.com/isthatnkhl-byte/DSA.viz.co/security
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default TermsPage;
