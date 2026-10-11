import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ShieldCheck, Lock, Eye, Database, Globe, UserCheck, HelpCircle, KeyRound } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & Security Policy — DSA.viz.co" },
      {
        name: "description",
        content:
          "Privacy & Security Architecture for DSA.viz.co. Learn about our AES-256-GCM API key encryption, owner-isolated Firestore rules, zero biometric upload, and GDPR/CCPA/DPDP compliance.",
      },
    ],
  }),
  component: PrivacyPage,
});

export function PrivacyPage() {
  const lastUpdated = "October 11, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />

      <main id="main-content" className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        {/* Header */}
        <div className="border-b border-border/70 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-4">
            <ShieldCheck className="size-3.5" />
            <span>Z1 Security &amp; Privacy Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-foreground">
            Privacy &amp; Security Policy
          </h1>
          <p className="mt-2 text-xs font-mono text-muted-foreground">
            Effective Date: {lastUpdated} • Version 3.0 • Strict Data Minimization &amp; AES-256-GCM Vault
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {/* Commitment */}
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Lock className="size-4 text-emerald-400" />
              <span>Our Foundational Privacy &amp; Security Commitment</span>
            </h2>
            <p>
              At <strong>DSA.viz.co</strong>, we practice strict <strong>Data Minimization</strong> and defense-in-depth engineering. We collect only the minimum data necessary to authenticate your session, synchronize your study progress, and securely store your optional encrypted API keys. <strong>We never sell, rent, or monetize your personal data or code submissions with advertisers or data brokers.</strong>
            </p>
          </section>

          {/* Section 1: Data We Collect */}
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Database className="size-4 text-primary" />
              <span>1. Information We Collect &amp; Cryptographic Storage Architecture</span>
            </h2>
            <div className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <KeyRound className="size-3.5 text-primary" />
                  <span>A. Google Authentication &amp; AES-256-GCM Encrypted Account API Keys</span>
                </h3>
                <p>
                  When you sign in via Google OAuth, Firebase Authentication provides your basic profile identifiers (<code>uid</code>, email address, display name, and avatar URL). When you save personal AI API keys (Gemini, OpenRouter, or OpenAI) in your Personal AI Key Vault or connect a GitHub token, <strong>we persistently store your encrypted keys in Firebase Cloud Firestore (under your owner-isolated <code>/users/&#123;uid&#125;</code> document) and a backend-sealed vault cookie</strong> so your keys remain automatically usable for your account across browser refreshes and sessions.
                </p>
                <p>
                  <strong>Cryptographic Safeguards:</strong> All saved API keys and OAuth tokens are encrypted on the server using Node.js <code>crypto</code> <code>AES-256-GCM</code> with a unique 96-bit random initialization vector (IV), a 128-bit authentication tag, a 256-bit server secret key derived via SHA-256, and per-user Additional Authenticated Data (AAD) bound to your exact Google <code>uid</code>. Raw API keys are never logged, never returned to the browser UI after saving (only masked prefixes/suffixes are displayed), and can be permanently purged at any time.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-foreground">B. User-Authored Pseudocode, Bookmarks &amp; Study Progress</h3>
                <p>
                  We store your solved problem IDs, bookmarks, written pseudocode, C++ submissions, and AI coaching transcripts in your isolated Cloud Firestore subcollections (<code>/users/&#123;uid&#125;/...</code>). Firestore security rules strictly enforce <code>request.auth != null &amp;&amp; request.auth.uid == userId</code>, preventing any other user from reading or modifying your profile or study records.
                </p>
              </div>

              <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-foreground">C. Ephemeral Security &amp; Rate-Limit Telemetry</h3>
                <p>
                  To protect our API endpoints against automated abuse and denial-of-service (DoS) traffic, our server maintains short-lived, in-memory rate-limiting counters keyed by request IP address. All traffic is enforced over HTTPS with HSTS preload, strict Content-Security-Policy (CSP), and cross-origin isolation headers.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: What We Explicitly Do NOT Collect */}
          <section className="space-y-3 rounded-2xl border border-border/80 bg-secondary/30 p-5">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Eye className="size-4 text-primary" />
              <span>2. Explicit Non-Collection: Webcam Video &amp; Microphone Audio</span>
            </h2>
            <p>
              During optional Live Interview practice sessions, your browser may request camera and microphone permissions to display a local self-view mirror, compute a local audio volume meter, and run browser-native speech recognition.
            </p>
            <p>
              <strong>Zero Server Upload:</strong> All video frames and audio streams remain strictly within your local browser memory. <strong>No audio recordings, video recordings, or biometric templates are ever transmitted to or stored on DSA.viz.co servers.</strong>
            </p>
          </section>

          {/* Section 3: Legal Basis under GDPR & DPDP Act */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              <span>3. Legal Basis for Processing (GDPR, CCPA/CPRA &amp; India DPDP Act)</span>
            </h2>
            <p>We process personal data solely under the following lawful bases:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Performance of a Service:</strong> Authenticating your account, persisting your encrypted API key vault as requested, and syncing your algorithm progress.</li>
              <li><strong>Explicit Consent:</strong> Opt-in Google OAuth sign-in, optional saving of personal BYOK API keys, and optional functional/analytics browser storage.</li>
              <li><strong>Legitimate Security Interests:</strong> Enforcing rate limits, validating Firebase ID tokens, and preventing sandbox abuse.</li>
            </ul>
          </section>

          {/* Section 4: Your Rights */}
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <UserCheck className="size-4 text-primary" />
              <span>4. Your Data Protection Rights &amp; One-Click Revocation</span>
            </h2>
            <p>
              Regardless of your geographic location, DSA.viz.co provides all users with direct self-service controls over their data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60">
                <h4 className="font-bold text-xs text-foreground">Right of Access &amp; Inspection</h4>
                <p className="text-[11px] text-muted-foreground mt-1">View all saved submissions, activity logs, and masked API key statuses directly in your Profile.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60">
                <h4 className="font-bold text-xs text-foreground">Instant Key &amp; Account Erasure</h4>
                <p className="text-[11px] text-muted-foreground mt-1">Purge your encrypted API keys or delete your profile data at any time via the AI Key Vault or Profile settings.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60">
                <h4 className="font-bold text-xs text-foreground">Right to Rectification</h4>
                <p className="text-[11px] text-muted-foreground mt-1">Update your connected handles, preferences, or saved API keys whenever you choose.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/60">
                <h4 className="font-bold text-xs text-foreground">Zero Sale of Personal Information</h4>
                <p className="text-[11px] text-muted-foreground mt-1">We never sell or share personal data for cross-context behavioral advertising and honor Global Privacy Control (GPC).</p>
              </div>
            </div>
          </section>

          {/* Section 5: Third-Party Service Providers */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              5. Third-Party Infrastructure &amp; Subprocessors
            </h2>
            <p>To operate the Platform, we rely on the following infrastructure and user-selected API providers:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Google Cloud &amp; Firebase (Authentication &amp; Cloud Firestore):</strong> Provides OAuth identity verification and encrypted document storage.</li>
              <li><strong>AI Model Providers (Google Gemini, OpenRouter, OpenAI):</strong> Processes pseudocode, code snippets, and interview chat prompts when invoked by the user.</li>
              <li><strong>Compiler Explorer (Godbolt) &amp; Wandbox APIs:</strong> Executes user-submitted C++ source code in isolated remote Linux sandboxes.</li>
              <li><strong>Vercel:</strong> Hosts static assets and serverless API endpoints over TLS 1.3.</li>
            </ul>
          </section>

          {/* Section 6: Children's Privacy */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              6. Protection of Minors (COPPA)
            </h2>
            <p>
              DSA.viz.co is intended for computer science students and software developers aged 13 and older (or 16+ where required by local jurisdiction). We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          {/* Section 7: Data Protection Contact */}
          <section className="space-y-3 border-t border-border/60 pt-6">
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              <span>7. Security Vulnerability Disclosure &amp; Privacy Contact</span>
            </h2>
            <p>
              We maintain a standardized RFC 9116 security disclosure policy at{" "}
              <a
                href="/.well-known/security.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-mono text-xs underline hover:text-accent"
              >
                /.well-known/security.txt
              </a>
              . To report a security issue, request data erasure assistance, or ask a privacy question, please contact us via{" "}
              <a
                href="https://github.com/isthatnkhl-byte/DSA.viz.co/security"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-mono text-xs underline hover:text-accent"
              >
                github.com/isthatnkhl-byte/DSA.viz.co/security
              </a>{" "}
              or{" "}
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

      <SiteFooter />
    </div>
  );
}

export default PrivacyPage;
