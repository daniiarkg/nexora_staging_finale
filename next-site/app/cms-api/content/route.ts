import { NextRequest, NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/auth";
import { readCmsPayload, writeCmsPayload } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  const payload = await readCmsPayload();
  return NextResponse.json({ ok: true, ...payload });
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  try {
    const payload = await request.json();
    const result = await writeCmsPayload({
      content: payload.content,
      lottieJsonText: payload.lottieJsonText
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "save_failed" },
      { status: 400 }
    );
  }
}
