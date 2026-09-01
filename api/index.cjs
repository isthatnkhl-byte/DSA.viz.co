// Vercel Serverless Function Handler (CommonJS)
// Loads and exports the bundled Express server

try {
  // Try to load the bundled Express server
  const serverModule = require('../dist/server.cjs');
  
  // Handle both default export and named export
  const app = serverModule.default || serverModule.app || serverModule;
  
  if (!app) {
    throw new Error('No Express app found in server.cjs');
  }
  
  module.exports = app;
} catch (error) {
  console.error('ERROR loading server.cjs:', error);
  console.error('Stack:', error.stack);
  
  // Fallback: create a minimal Express app that returns error
  const express = require('express');
  const fallbackApp = express();
  
  fallbackApp.use((req, res) => {
    res.status(500).json({
      error: 'Server initialization failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  });
  
  module.exports = fallbackApp;
}
