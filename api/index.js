// Vercel Serverless Function Entry Point
// Loads the bundled Express server and exports it as the handler

import('../dist/server.cjs').then(module => {
  module.default;
}).catch(err => {
  console.error('Failed to import server.cjs:', err);
  throw err;
});

export { default } from '../dist/server.cjs';
