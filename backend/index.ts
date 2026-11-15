// Vercel entry point. Vercel looks for app/index/server files in the project root before src/, and
// only accepts one that imports express, so this file wins over src/app.ts. The default-exported app
// runs as a single Vercel Function. Locally the API still starts from src/server.ts (npm run dev/start).
import express from 'express';
import { createApp } from './src/app.js';
import { connectDb } from './src/config/db.js';

// Runs once per function instance on cold start; warm requests reuse the instance and its Mongo pool.
await connectDb();

const app: express.Express = createApp();

export default app;
