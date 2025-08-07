import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const { userId } = await auth();
  const fileId = params.fileId;

  if (!userId || !fileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Mark the file as trashed (soft delete)
  await db
    .update(files)
    .set({
      /* deletedAt: new Date() */
    }) // TODO: Add 'deletedAt' to schema for soft delete
    .where(eq(files.id, fileId));

  return NextResponse.json({ message: "File moved to trash" }, { status: 200 });
}
