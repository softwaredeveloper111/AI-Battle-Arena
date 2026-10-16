import { MongoMemoryServer } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

/**
 * Starts ONE throw-away in-memory mongod for the whole run. Each test file connects to
 * its own uniquely-named database on it (see test/setup.ts), so files can run in parallel.
 */
let mongod: MongoMemoryServer | undefined;

export default async function setup(project: TestProject) {
  mongod = await MongoMemoryServer.create();
  project.provide("mongoUri", mongod.getUri());

  return async () => {
    await mongod?.stop();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    mongoUri: string;
  }
}
