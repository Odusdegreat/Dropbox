// lib/db/actions.ts
import { db } from "./index";
import { files } from "./schema";
import { eq } from "drizzle-orm";

export async function deleteTrashedFiles() {
  return await db.delete(files).where(eq(files.isTrash, true));
}
