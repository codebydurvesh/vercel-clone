import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDimension(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(320, Math.min(1920, Math.floor(parsed)));
}

function getTargetUrl(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target");
  if (!target) {
    return null;
  }

  try {
    const url = new URL(target);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const target = getTargetUrl(request);

  if (!target) {
    return NextResponse.json(
      { message: "Invalid or missing target URL" },
      { status: 400 },
    );
  }

  const width = parseDimension(request.nextUrl.searchParams.get("w"), 1200);
  const height = parseDimension(request.nextUrl.searchParams.get("h"), 700);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(target, { waitUntil: "networkidle", timeout: 45000 });

    const image = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    const imageBytes = new Uint8Array(image);

    return new NextResponse(imageBytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to capture snapshot",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
