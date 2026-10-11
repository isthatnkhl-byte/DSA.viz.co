import { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  X,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  apiGetUserKeyVaultStatus,
  apiSaveUserApiKey,
  apiDeleteUserApiKey,
  type UserKeyVaultStatus,
} from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

const VAULT_UPDATED_EVENT = "dsaviz:vault-status-updated";

export function useUserKeyVaultStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<UserKeyVaultStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiGetUserKeyVaultStatus();
      setStatus(res);
    } catch {
      // Non-blocking fallback
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
    const handler = () => {
      refresh();
    };
    window.addEventListener(VAULT_UPDATED_EVENT, handler);
    return () => window.removeEventListener(VAULT_UPDATED_EVENT, handler);
  }, [refresh]);

  const notifyVaultUpdated = useCallback((newStatus?: UserKeyVaultStatus) => {
    if (newStatus) setStatus(newStatus);
    window.dispatchEvent(new CustomEvent(VAULT_UPDATED_EVENT));
  }, []);

  return { status, loading, refresh, notifyVaultUpdated };
}

export function ApiKeyVaultButton({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { status } = useUserKeyVaultStatus();
  const [open, setOpen] = useState(false);

  const hasPersonal = !!status?.hasPersonalKey;
  const activeLabel =
    status?.activeProvider && status.activeProvider !== "none"
      ? status.activeProvider.toUpperCase()
      : "API KEY";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!user) {
            toast.info("Sign in with Google to configure your personal API Key Vault.");
            navigate({ to: "/auth" });
            return;
          }
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 rounded-none border px-2.5 h-9 font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
          hasPersonal
            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400"
            : "border-[#625B52] bg-[#2C2724] text-[#EAE6DF] hover:border-primary hover:text-white"
        }`}
        title={
          hasPersonal
            ? `Personal ${activeLabel} Key Active (AES-256-GCM Backend Vault)`
            : "Configure your personal Gemini / OpenRouter / OpenAI API Key (Backend-Only Encrypted Vault)"
        }
      >
        <KeyRound className={`size-3.5 ${hasPersonal ? "text-emerald-400" : "text-primary"}`} />
        {!compact && (
          <span className="hidden sm:inline">
            {hasPersonal ? `KEY: ${activeLabel}` : "API KEY"}
          </span>
        )}
        <span
          className={`size-1.5 rounded-full ${
            hasPersonal ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-amber-400/80"
          }`}
        />
      </button>

      {open && <ApiKeyVaultModal open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

export function ApiKeyVaultModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl border-2 border-[#3A3530] bg-[#181513] text-[#F5F2EB] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Header */}
        <div className="flex items-center justify-between border-b border-[#2E2925] bg-[#221E1C] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center border border-primary/40 bg-primary/10 text-primary">
              <Lock className="size-4" />
            </div>
            <div>
              <h2 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#F5F2EB]">
                Personal AI Key Vault (Zero-Frontend-Trust)
              </h2>
              <p className="font-mono text-[10px] text-[#A39B8F]">
                AES-256-GCM Backend Encrypted • Isolated Rate Limits • HttpOnly Bound
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center border border-[#3A3530] bg-[#2C2724] text-[#A39B8F] hover:border-primary hover:text-white transition-colors"
            aria-label="Close vault modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 max-h-[82vh] overflow-y-auto">
          <ApiKeyVaultManager onSaved={() => {}} />
        </div>
      </div>
    </div>
  );
}

export function ApiKeyVaultManager({ onSaved }: { onSaved?: () => void }) {
  const { status, loading, notifyVaultUpdated } = useUserKeyVaultStatus();
  const [selectedProvider, setSelectedProvider] = useState<
    "auto" | "gemini" | "openrouter" | "openai"
  >("auto");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [revealInput, setRevealInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [removingProvider, setRemovingProvider] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setErrorMsg("Please paste your API key first.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiSaveUserApiKey({
        apiKey: trimmed,
        provider: selectedProvider,
        verify: true,
      });
      // Immediately wipe plaintext input from React memory
      setApiKeyInput("");
      setRevealInput(false);
      if (res.status) {
        notifyVaultUpdated(res.status);
      } else {
        notifyVaultUpdated();
      }
      toast.success(
        `Encrypted & verified ${res.provider?.toUpperCase() || "AI"} key (${res.maskedHint}) in backend vault!`
      );
      onSaved?.();
    } catch (err: any) {
      setErrorMsg(err?.message || "Could not verify or store API key.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteKey = async (provider: "gemini" | "openrouter" | "openai" | "all") => {
    setRemovingProvider(provider);
    setErrorMsg(null);
    try {
      const res = await apiDeleteUserApiKey(provider);
      notifyVaultUpdated(res.status);
      toast.success(
        provider === "all"
          ? "Removed all personal API keys from backend vault."
          : `Removed ${provider.toUpperCase()} key from backend vault.`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to remove API key.");
    } finally {
      setRemovingProvider(null);
    }
  };

  const providerCards: Array<{
    id: "gemini" | "openrouter" | "openai";
    title: string;
    badge: string;
    placeholder: string;
    getKeyUrl: string;
  }> = [
    {
      id: "gemini",
      title: "Google Gemini API",
      badge: "AIza... / AQ....",
      placeholder: "AIzaSy... or AQ.Ab8RN6...",
      getKeyUrl: "https://aistudio.google.com/app/apikey",
    },
    {
      id: "openrouter",
      title: "OpenRouter API",
      badge: "sk-or-v1-...",
      placeholder: "sk-or-v1-...",
      getKeyUrl: "https://openrouter.ai/keys",
    },
    {
      id: "openai",
      title: "OpenAI API",
      badge: "sk-proj-...",
      placeholder: "sk-proj-...",
      getKeyUrl: "https://platform.openai.com/api-keys",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Security Guarantee Banner */}
      <div className="border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="size-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-[#D6D1C7]">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              100% Backend-Only Secret Storage • Zero Frontend Exposure
            </p>
            <p className="text-[11px] leading-relaxed text-[#A39B8F]">
              Your API key is transmitted once over HTTPS, verified live on the server, and encrypted at rest using{" "}
              <span className="font-mono text-[#EAE6DF]">AES-256-GCM</span> with authenticated AAD binding. It is{" "}
              <strong className="text-[#EAE6DF]">never</strong> stored in{" "}
              <span className="font-mono">localStorage</span>, <span className="font-mono">sessionStorage</span>, or readable cookies, and can never be decoded or read back from the browser.
            </p>
          </div>
        </div>
      </div>

      {/* Add / Rotate Key Form */}
      <form onSubmit={handleSaveKey} className="space-y-3 border border-[#2E2925] bg-[#1E1A17] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#EAE6DF]">
            Add or Rotate Personal API Key
          </label>
          <div className="flex items-center gap-1">
            {(["auto", "gemini", "openrouter", "openai"] as const).map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => setSelectedProvider(prov)}
                className={`px-2 py-1 font-mono text-[10px] uppercase tracking-wider border transition-colors ${
                  selectedProvider === prov
                    ? "border-primary bg-primary text-primary-foreground font-bold"
                    : "border-[#3A3530] bg-[#181513] text-[#A39B8F] hover:text-white"
                }`}
              >
                {prov === "auto" ? "Auto-Detect" : prov}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={revealInput ? "text" : "password"}
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="Paste Gemini (AIza... / AQ....), OpenRouter (sk-or-...), or OpenAI (sk-...) key"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              spellCheck={false}
              className="w-full h-10 border border-[#3A3530] bg-[#12100E] px-3 pr-9 font-mono text-xs text-[#F5F2EB] placeholder:text-[#6E665E] focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setRevealInput((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C8378] hover:text-[#EAE6DF]"
              title={revealInput ? "Hide key input" : "Reveal key input"}
            >
              {revealInput ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting || !apiKeyInput.trim()}
            className="inline-flex items-center gap-1.5 h-10 px-4 border border-primary bg-primary text-primary-foreground font-mono text-xs font-bold uppercase tracking-wider hover:opacity-95 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Lock className="size-3.5" />
                <span>Encrypt & Save</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 border border-red-500/40 bg-red-950/30 p-2.5 text-red-300 font-mono text-[11px]">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>

      {/* Active Vault Providers Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#A39B8F]">
            Configured Vault Slots ({loading ? "Checking..." : status?.hasPersonalKey ? "Personal Key Active" : "No Personal Key Yet"})
          </span>
          {status?.hasPersonalKey && (
            <button
              type="button"
              onClick={() => handleDeleteKey("all")}
              disabled={removingProvider !== null}
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-red-400 hover:text-red-300"
            >
              <Trash2 className="size-3" />
              <span>Purge All Keys</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2">
          {providerCards.map((p) => {
            const pStatus = status?.providers?.[p.id];
            const isConfigured = !!pStatus?.configured;
            const isPrimary = status?.activeProvider === p.id;

            return (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-3 border p-3 transition-colors ${
                  isConfigured
                    ? "border-emerald-500/40 bg-emerald-950/10"
                    : "border-[#2E2925] bg-[#1A1715]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#F5F2EB]">
                      {p.title}
                    </span>
                    <span className="border border-[#3A3530] bg-[#12100E] px-1.5 py-0.5 font-mono text-[9px] text-[#A39B8F]">
                      {p.badge}
                    </span>
                    {isPrimary && (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-emerald-300">
                        <Sparkles className="size-2.5" /> Primary
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[11px]">
                    {isConfigured ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-300">
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                        <span>Vault Secret:</span>
                        <code className="bg-[#12100E] px-1.5 py-0.5 text-[#EAE6DF] border border-[#3A3530]">
                          {pStatus?.maskedHint}
                        </code>
                      </span>
                    ) : (
                      <span className="text-[#7A7267]">Not configured in your vault</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={p.getKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 border border-[#3A3530] bg-[#221E1C] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#D6D1C7] hover:border-primary hover:text-white"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="size-3" />
                  </a>
                  {isConfigured && (
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(p.id)}
                      disabled={removingProvider === p.id}
                      className="inline-flex items-center gap-1 border border-red-500/40 bg-red-950/20 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-red-300 hover:bg-red-950/40 cursor-pointer"
                      title={`Remove ${p.title} key from backend vault`}
                    >
                      {removingProvider === p.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
