import { defineConfig, env } from "prisma/config";
import "dotenv/config";

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node scripts/run-prisma-seed.mjs",
  },
  datasource: {
    url: env<Env>("DATABASE_URL"),
  },
});
