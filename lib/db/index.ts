import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
export * from "./actions";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" }); // Optional, only if needed here

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in environment");
}
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });

export { sql };
