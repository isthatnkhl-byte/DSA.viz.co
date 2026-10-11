import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ShieldCheck, Lock, Eye, Database, Globe, UserCheck, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — DSA.viz.co" },
      {
        name: "description",
        content:
          "Privacy Policy for DSA.viz.co. Learn about our strict data minimization, zero biometric tracking, and GDPR, CCPA, and DPDP Act compliance.",
      },
    ],
  }),
  component: PrivacyPage,
});

export function PrivacyPage() {
  const lastUpdated = "September 8, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />

      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Header */}
        <div className="border-b border-border/70 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-4">
            <ShieldCheck className="size-3.5" />
            <span>Zero-Trust Privacy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs font-mono text-muted-foreground">
            Effective Date: {lastUpdated} • Version 2.0 • Data Minimization Certified
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {/* Commitment */}
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Lock className="size-4 text-emerald-400" />
              <span>Our Foundational Privacy Promise</span>
            </h2>
            <p>
              At <strong>DSA.viz.co</strong>, we believe that practicing computer science and data structures should never come at the cost of your personal privacy. We strictly practice <strong>Data Minimization</strong>: we collect only what is strictly required to execute code, visualize algorithms, and synchronize your progress. <strong>We do not sell, rent, or monetize your personal data or algorithm submissions with advertisers.</strong>
            </p>
          </section>

          {/* Section 1: Data We Collect */}
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Database className="size-4 text-primary" />
              <span>1. Information We Collect &amp; Why</span>
            </h2>
            <div className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-foreground">A. Authentication, Profile &amp; Encrypted Account API Keys</h3>
                <p>
                  When you authenticate using Google OAuth, Firebase Auth retrieves your email address, display name, and avatar URL. When you save personal AI API keys (Gemini, OpenRouter, or OpenAI) in your Personal AI Key Vault, <strong>we persistently store your encrypted keys in Firebase Cloud Firestore and our backend vault tied specifically to your Google Account (<code>uid</code>)</strong> so they remain automatically usable across page refreshes, sessions, and devices without needing to be re-pasted. All personal API keys and connected GitHub/LeetCode tokens are encrypted at rest using <code>AES-256-GCM</code> authenticated encryption with per-user Additional Authenticated Data (AAD) and a backend-only master key—meaning raw keys are never stored in plaintext and can be permanently revoked at any time with one click.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-foreground">B. User-Authored Pseudocode &amp; Submissions</h3>
                <p>
                  We store your written pseudocode, algorithm attempts, Big-O runtime verdicts, and AI feedback history in your personal, isolated document partition to power your personal dashboard and review metrics.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-foreground">C. Technical &amp; Security Telemetry</h3>
                <p>
                  To defend against denial-of-service (DoS) attacks and enforce API rate limits, our backend records ephemeral IP addresses and request timestamps. These logs are stored for security auditing and automatically rotated.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: What We Explicitly Do NOT Collect */}
          <section className="space-y-3 rounded-2xl border border-border/80 bg-secondary/30 p-5">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Eye className="size-4 text-primary" />
              <span>2. Explicit Non-Collection: Audio &amp; Video Streams</span>
            </h2>
            <p>
              During live mock interview simulations, the Platform requests camera and microphone access to render a local video mirror and responsive volume gauge.
            </p>
            <p>
              <strong>Zero Server Upload:</strong> Video and audio streams are processed strictly within your device's browser memory (via Web Audio API and HTML5 Video). <strong>No audio recordings, video frames, or biometric facial templates ever leave your browser or get uploaded to DSA.viz.co servers.</strong>
            </p>
          </section>

          {/* Section 3: Legal Basis under GDPR & DPDP Act */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              <span>3. Legal Basis for Processing (GDPR / DPDP)</span>
            </h2>
            <p>We process personal data under the following recognized legal bases:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Contractual Performance:</strong> Storing code submissions and generating visual animations as requested by the user.</li>
              <li><strong>Consent:</strong> Explicit user opt-in for Google OAuth sign-in and optional functional/analytics cookies.</li>
              <li><strong>Legitimate Interests:</strong> Protecting our infrastructure, preventing API rate-limit abuse, and debugging compiler sandbox failures.</li>
            </ul>
          </section>

          {/* Section 4: Your Rights */}
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <UserCheck className="size-4 text-primary" />
              <span>4. Your Data Protection Rights (GDPR, CCPA/CPRA, DPDP)</span>
            </h2>
            <p>
              Regardless of your geographic jurisdiction, DSA.viz.co extends the following foundational rights to all users:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60">
                <h4 className="font-bold text-xs text-foreground">Right of Access &amp; Portability</h4>
                <p className="text-[11px] text-muted-foreground mt-1">Request a copy of your stored submissions and chat history.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60">
                <h4 className="font-bold text-xs text-foreground">Right to Erasure ("Right to Be Forgotten")</h4>
                <p className="text-[11px] text-muted-foreground mt-1">Permanently purge your account, submissions, and profile with one click.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60">
                <h4 className="font-bold text-xs text-foreground">Right to Rectification</h4>
                <p className="text-[11px] text-muted-foreground mt-1">Update or edit your profile username and preferences at any time.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60">
                <h4 className="font-bold text-xs text-foreground">Do Not Sell or Share My Information</h4>
                <p className="text-[11px] text-muted-foreground mt-1">We do not sell personal data. We honor Global Privacy Control (GPC).</p>
              </div>
            </div>
          </section>

          {/* Section 5: Third-Party Service Providers */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              5. Third-Party Infrastructure &amp; API Subprocessors
            </h2>
            <p>We work exclusively with vetted, enterprise-grade cloud infrastructure providers:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Google Cloud Platform &amp; Firebase:</strong> Authentication, session management, and encrypted Firestore database storage.</li>
              <li><strong>Google Gemini API:</strong> Socratic pseudocode analysis and algorithmic hints. Code submitted for review does not contain PII.</li>
              <li><strong>Compiler Explorer (Godbolt) &amp; Wandbox:</strong> Sandboxed, resource-bounded C++ compilation in isolated Linux containers.</li>
              <li><strong>Vercel:</strong> Static frontend edge delivery and serverless routing.</li>
            </ul>
          </section>

          {/* Section 6: Children's Privacy */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              6. Protection of Minors (COPPA Compliance)
            </h2>
            <p>
              DSA.viz.co is designed for students, job candidates, and software engineering professionals. We do not knowingly solicit or collect personal data from children under the age of 13 (or under 16 where required by regional law). If we discover that personal data from a minor has been collected without verifiable parental consent, we will promptly delete that data.
            </p>
          </section>

          {/* Section 7: Data Protection Contact */}
          <section className="space-y-3 border-t border-border/60 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              <span>7. Privacy Inquiries &amp; Data Erasure Requests</span>
            </h2>
            <p>
              To exercise your privacy rights, request data export, or inquire about our privacy architecture, please contact our Data Protection Officer at{" "}
              <code className="text-primary font-mono text-xs bg-muted/60 px-2 py-0.5 rounded">privacy@dsa.viz.co</code>.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default PrivacyPage;
