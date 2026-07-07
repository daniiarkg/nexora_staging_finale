import { NextResponse } from "next/server";
import { readLottieJsonText } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function GET() {
  const text = await readLottieJsonText();

  return new NextResponse(text, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
