// app/api/files/route.ts

import { NextResponse } from "next/server";

export async function GET() {
  const files = [
    {
      id: 1,
      name: "Document.pdf",
      size: "1.2MB",
      uploadedAt: "2025-06-20T10:30:00Z",
    },
    {
      id: 2,
      name: "Photo.png",
      size: "3.5MB",
      uploadedAt: "2025-06-19T14:00:00Z",
    },
  ];

  return NextResponse.json(files);
}
