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
  } catch (error) {}
}
