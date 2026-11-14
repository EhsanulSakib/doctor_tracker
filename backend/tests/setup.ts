import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    // A throwaway test database doesn't need a multi-GB cache; slow disks also need more start time.
    instance: { launchTimeout: 60_000, args: ['--wiredTigerCacheSizeGB', '0.25'] },
  });
  await mongoose.connect(mongo.getUri());
  // Build indexes up front so unique constraints are enforced from the first test.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

afterEach(async () => {
  const collections = await mongoose.connection.db?.collections();
  await Promise.all((collections ?? []).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
