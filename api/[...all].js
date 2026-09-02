// Vercel Serverless Catch-All Handler for all /api/* routes
import serverModule from '../dist/server.cjs';

const app = serverModule.default || serverModule.app || serverModule;

export default function handler(req, res) {
  return app(req, res);
}
