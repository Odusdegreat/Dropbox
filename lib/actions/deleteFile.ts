import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function deleteFileById(fileId: string, userId: string) {
  return await db
    .delete(files)
    .where(and(eq(files.id, fileId), eq(files.userId, userId)));
}
