import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ fileId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await props.params;

    if (!fileId) {
      return NextResponse.json(
        { error: "File id is required" },
        { status: 401 }
      );
    }

    const [file] = await db
      .select()
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.userId, userId)));

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 401 });
    }

    //toggle star status

    const updatedFile = await db
      .update(files)
      .set({ isStarred: !file.isStarred })
      .where(and(eq((files.id, fileId), eq(files.userId, userId))))
      .returning();
    const updatedFile = updatedFiles[0];

    return NextResponse.json(updatedFile);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update the file" },
      { status: 500 }
    );
  }
}
