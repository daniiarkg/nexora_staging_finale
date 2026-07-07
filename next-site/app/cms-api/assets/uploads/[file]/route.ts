import { NextResponse } from "next/server";
import { readUploadedAsset } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  try {
    const { file } = await params;
    const asset = await readUploadedAsset(file);

    return new NextResponse(asset.bytes, {
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
}
