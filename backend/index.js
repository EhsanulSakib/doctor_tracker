// Vercel entry point. Vercel looks for app/index/server files in the project root before src/, and
// only accepts one that imports express, so this file wins over src/app.ts. Vercel runs `npm run build`
// (tsc) before bundling, so this imports the compiled dist/ output: our own tsc build stays the only
// TypeScript pass (Vercel's TS compiler resolves package types differently and rejects valid code).
// The default-exported app runs as a single Vercel Function. Locally the API still starts from
// src/server.ts (npm run dev / npm start).
import express from 'express';
import { createApp } from './dist/app.js';
import { connectDb } from './dist/config/db.js';

// Runs once per function instance on cold start; warm requests reuse the instance and its Mongo pool.
await connectDb();

/** @type {express.Express} */
const app = createApp();

export default app;
