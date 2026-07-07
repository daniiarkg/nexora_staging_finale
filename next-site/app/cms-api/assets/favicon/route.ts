import { NextRequest, NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { readFaviconAsset, writeFaviconAsset } from "@/lib/content";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/png",
  "image/svg+xml"
]);

export async function GET() {
  const asset = await readFaviconAsset();

  return new NextResponse(asset.bytes, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "no-store"
    }
  });
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "file_required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ ok: false, error: "unsupported_type" }, { status: 400 });
  }

  if (file.size > 256 * 1024) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400 });
  }

  await writeFaviconAsset(Buffer.from(await file.arrayBuffer()), file.type);

  return NextResponse.json({ ok: true });
}
