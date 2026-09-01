import "./lib/error-capture";

import serverEntry from "@tanstack/react-start/server-entry";

import { consumeLastCapturedError } from "./lib/error-capture";
import { describeError, renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// Static import: a lazy `import()` here is not always traced by every deploy
// target's bundler (Vercel/Node presets), which makes *every* route fall into
// the catch below with a module-resolution error.
const handler = (serverEntry as unknown as { default?: ServerEntry }).default
  ? (serverEntry as unknown as { default: ServerEntry }).default
  : (serverEntry as unknown as ServerEntry);

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const captured = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(captured);
  return new Response(renderErrorPage(describeError(captured)), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const isServerFn =
      request.headers.get("x-tsr-serverFn") === "true" ||
      request.headers.get("x-tsr-serverfn") === "true" ||
      request.headers.get("x-tss-server_function") === "true" ||
      request.url.includes("/_serverFn") ||
      request.url.includes("/_build/serverFn") ||
      request.url.includes("/_server") ||
      request.url.includes("serverFn");

    // Ensure incoming server function and mutation requests always have a Content-Type set
    let req = request;
    if (isServerFn || req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      if (!req.headers.get("content-type")) {
        const headers = new Headers(req.headers);
        headers.set("content-type", "application/json");
        req = new Request(req, { headers });
      }
    }

    try {
      const rawResponse = await handler.fetch(req, env, ctx);
      let response = rawResponse;

      // Always guarantee that EVERY response has a valid Content-Type header so TanStack Start client never hits invariant error
      if (!response.headers.get("content-type")) {
        const headers = new Headers(response.headers);
        headers.set("content-type", isServerFn ? "application/json" : "text/html; charset=utf-8");
        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      if (isServerFn) {
        return response;
      }
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      if (isServerFn) {
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : "Internal Server Error",
          }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return new Response(renderErrorPage(describeError(error)), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
