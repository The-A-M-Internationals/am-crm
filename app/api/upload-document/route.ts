import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const projectId = (formData.get("projectId") as string) || "general";
    const documentName = (formData.get("documentName") as string) || "";
    const category = (formData.get("category") as string) || "Documentation";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to public/uploads/projects/[projectId]/
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "projects", projectId);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Clean safe filename
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(uploadsDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/projects/${projectId}/${safeName}`;
    const ext = file.name.split(".").pop()?.toLowerCase() || "file";
    const sizeStr =
      file.size / 1024 < 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      name: documentName || file.name,
      fileName: file.name,
      fileSize: sizeStr,
      fileType: ext,
      category,
    });
  } catch (error: any) {
    console.error("Upload document error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}
