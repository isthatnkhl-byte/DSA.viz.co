// Vercel Serverless Function Entrypoint
import serverModule from "./server.cjs";

const app =
  serverModule.default?.default ||
  serverModule.default?.app ||
  serverModule.default ||
  serverModule.app ||
  serverModule;

export default function handler(req, res) {
  if (req.url && !req.url.startsWith("/api/") && req.url !== "/api") {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return app(req, res);
}
