// app/api/trash/route.ts
import { NextResponse } from "next/server";
import { deleteTrashedFiles } from "@/lib/db"; // Adjust to your actual DB logic

export async function DELETE() {
  try {
    // Call your DB function to permanently delete trashed files
    await deleteTrashedFiles(); // e.g., delete from database where isTrashed = true

    return NextResponse.json(
      { message: "Trash emptied successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to empty trash:", error);
    return NextResponse.json(
      { error: "Failed to empty trash" },
      { status: 500 }
    );
  }
}
