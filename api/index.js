// Vercel Serverless Function Entrypoint
import serverModule from "./server.cjs";

const app =
  serverModule.default?.default ||
  serverModule.default?.app ||
  serverModule.default ||
  serverModule.app ||
  serverModule;

export default function handler(req, res) {
  return app(req, res);
}
