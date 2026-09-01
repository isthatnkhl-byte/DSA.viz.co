// Vercel Serverless Function Handler (CommonJS)
// Loads and exports the bundled Express server

module.exports = async (req, res) => {
  try {
    // Lazy load the server at runtime
    const serverModule = require('../dist/server.cjs');
    
    // Handle both default export and named export
    const app = serverModule.default || serverModule.app || serverModule;
    
    if (!app) {
      throw new Error('No Express app found in server.cjs');
    }
    
    // Pass the request to the Express app
    return app(req, res);
  } catch (error) {
    console.error('ERROR in serverless handler:', error);
    console.error('Stack:', error.stack);
    
    res.status(500).json({
      error: 'Server initialization failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
