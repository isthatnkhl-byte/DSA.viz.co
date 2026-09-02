// Vercel Serverless Function Entrypoint
let app;
let loadError = null;

try {
  const serverModule = await import('../dist/server.cjs');
  app = serverModule.default?.default || serverModule.default?.app || serverModule.default || serverModule.app || serverModule;
} catch (err) {
  loadError = err;
  console.error('[FATAL] Error loading dist/server.cjs in serverless function:', err);
}

export default async function handler(req, res) {
  if (loadError) {
    return res.status(500).json({
      error: 'Serverless initialization failed',
      message: loadError.message,
      stack: loadError.stack,
    });
  }
  return app(req, res);
}
