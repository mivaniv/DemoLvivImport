import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

// Окрема база lvivimport_test у тому ж контейнері PostgreSQL: тести не чіпають робочі дані.
export async function setup(project: TestProject) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const testDb = `${url.pathname.slice(1)}_test`;

  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [testDb]);
  if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${testDb}"`);
  await admin.end();

  url.pathname = `/${testDb}`;
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: "ignore",
  });
  project.provide("databaseUrl", url.toString());
}
