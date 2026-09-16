import { app } from '../src/app.js';

// Vercel serverless entry — re-export the Express app. Vercel runs the whole
// backend inside a single Node.js function and routes every request to it via
// vercel.json, so all /api/* routes work exactly as they do locally.
export default app;