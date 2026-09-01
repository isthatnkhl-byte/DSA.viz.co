function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function describeError(error: unknown): string {
  if (error instanceof Error) {
    return [error.message, error.stack].filter(Boolean).join("\n").slice(0, 2000);
  }
  if (typeof error === "string") return error.slice(0, 2000);
  try {
    return JSON.stringify(error).slice(0, 2000);
  } catch {
    return String(error).slice(0, 2000);
  }
}

/**
 * Self-contained HTML fallback. `detail` is rendered so a self-hosted deploy
 * (Vercel, Node, etc.) can surface the real SSR failure without server logs.
 */
export function renderErrorPage(detail?: string): string {
  const safe = detail ? escapeHtml(detail) : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: dark; }
      body { font: 15px/1.6 system-ui, -apple-system, sans-serif; background: #131417; color: #eceef2; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 34rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #a3a7b1; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.55rem 1.1rem; border-radius: 0.5rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #f0b429; color: #201703; font-weight: 600; }
      .secondary { background: transparent; color: #eceef2; border-color: #3a3d45; }
      details { margin-top: 1.5rem; text-align: left; }
      summary { cursor: pointer; color: #a3a7b1; font-size: 0.85rem; }
      pre { white-space: pre-wrap; word-break: break-word; background: #1b1d22; border: 1px solid #2c2f36; border-radius: 0.5rem; padding: 0.75rem; font-size: 0.75rem; color: #c9ccd4; overflow: auto; max-height: 16rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
      ${safe ? `<details><summary>Technical details</summary><pre>${safe}</pre></details>` : ""}
    </div>
    <!-- ssr-error: ${safe ? safe.replace(/--/g, "- -") : "unknown"} -->
  </body>
</html>`;
}
