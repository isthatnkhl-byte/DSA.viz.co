// Vercel Serverless Function Handler
// Imports and exports the bundled Express server directly

try {
  // Load the bundled Express server at module load time
  const serverModule = require('../dist/server.cjs');
  
  // The bundled server exports 'app' as a named export
  // Check for: default export, named 'app' export, or the module itself
  let app = serverModule.default || serverModule.app || serverModule;
  
  // If it's still not a function/middleware, something is wrong
  if (typeof app !== 'function') {
    console.error('[ERROR] App is not a function:', typeof app, Object.keys(serverModule || {}));
    throw new Error(`Invalid app export: expected function, got ${typeof app}`);
  }
  
  console.log('[INFO] Successfully loaded Express app from server.cjs');
  
  // Export the app directly for Vercel to use as middleware
  module.exports = app;
} catch (error) {
  console.error('[FATAL] Failed to load server.cjs:', error.message);
  console.error('Stack:', error.stack);
  
  // Create a minimal fallback handler that returns an error
  const fallbackHandler = (req, res) => {
    res.status(500).json({
      error: 'Server failed to initialize',
      message: error.message
    });
  };
  
  module.exports = fallbackHandler;
}
