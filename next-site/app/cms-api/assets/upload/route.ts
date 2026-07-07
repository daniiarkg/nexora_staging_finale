import { NextRequest, NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { isAllowedImageContentType, writeUploadedAsset } from "@/lib/content";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE = 3 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file_required" }, { status: 400 });
  }

  if (!isAllowedImageContentType(file.type)) {
    return NextResponse.json({ ok: false, error: "unsupported_type" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400 });
  }

  const url = await writeUploadedAsset(Buffer.from(await file.arrayBuffer()), file.name, file.type);

  return NextResponse.json({ ok: true, url });
}
