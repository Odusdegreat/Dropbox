// app/api/files/[fileId]/delete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteFileById } from "@/lib/actions/deleteFile";

export async function DELETE(
  req: NextRequest,
  context: { params: { fileId: string } } // ✅ use plain object, not Promise
) {
  const { userId } = await auth();
  const fileId = context.params.fileId; // ✅ directly access params

  if (!userId || !fileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteFileById(fileId, userId);

  return NextResponse.json({ message: "File deleted" }, { status: 200 });
}
