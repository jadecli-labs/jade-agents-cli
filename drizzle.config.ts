import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./ts/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL!,
  },
});
