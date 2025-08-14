import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Create uploads folder if not exists
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  // Save file locally
  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(uploadDir, file.name);
  fs.writeFileSync(filePath, buffer);

  return NextResponse.json({
    message: "File uploaded successfully",
    fileName: file.name,
  });
}
