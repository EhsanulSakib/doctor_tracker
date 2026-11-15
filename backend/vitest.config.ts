import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Set before any app module loads, so config/env.ts validates test values.
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      MONGODB_URI: 'mongodb://set-by-tests',
      FRONTEND_URL: 'http://localhost:3000',
      JWT_ACCESS_SECRET: 'test-only-secret-that-is-definitely-long-enough',
      ACCESS_TOKEN_TTL_SECONDS: '900',
      REFRESH_TOKEN_TTL_DAYS: '7',
      ADMIN_EMAIL: 'admin@test.dev',
      ADMIN_PASSWORD: 'Test!Passw0rd',
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: '123456789',
      CLOUDINARY_API_SECRET: 'test-cloudinary-secret',
    },
    // First run downloads a MongoDB binary for mongodb-memory-server.
    hookTimeout: 180_000,
    testTimeout: 20_000,
  },
});
