import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnapshotAttempt = {
  url: string;
  label: string;
  deploymentIdHeader?: string;
};

function parseDimension(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(320, Math.min(1920, Math.floor(parsed)));
}

function getTargetUrl(request: NextRequest): URL | null {
  const target = request.nextUrl.searchParams.get("target");
  if (!target) {
    return null;
  }

  try {
    const url = new URL(target);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function parseInternalBaseUrl(rawValue?: string): URL {
  const candidate = rawValue?.trim() || "http://request-handler-service:3001";

  try {
    return new URL(candidate);
  } catch {
    return new URL(`http://${candidate}`);
  }
}

function getDeploymentIdFromLocalhostSubdomain(target: URL): string | null {
  const hostParts = target.hostname.split(".");
  const isLocalhostSubdomain =
    hostParts.length >= 2 && hostParts[hostParts.length - 1] === "localhost";

  if (!isLocalhostSubdomain) {
    return null;
  }

  return hostParts[0] || null;
}

function buildSnapshotAttempts(
  target: URL,
  explicitDeploymentId?: string,
): SnapshotAttempt[] {
  const attempts: SnapshotAttempt[] = [
    {
      url: target.toString(),
      label: "target",
    },
  ];

  const isLocalhostTarget =
    target.hostname === "localhost" || target.hostname.endsWith(".localhost");

  if (!isLocalhostTarget) {
    return attempts;
  }

  const deploymentId =
    getDeploymentIdFromLocalhostSubdomain(target) ||
    explicitDeploymentId?.trim();
  const internalBase = parseInternalBaseUrl(
    process.env.SNAPSHOT_INTERNAL_BASE_URL,
  );
  const internalTarget = new URL(target.toString());

  internalTarget.protocol = internalBase.protocol;
  internalTarget.hostname = internalBase.hostname;
  internalTarget.port = internalBase.port;

  attempts.unshift({
    url: internalTarget.toString(),
    label: "docker-internal",
    deploymentIdHeader: deploymentId,
  });

  return attempts;
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
  const deploymentId = request.nextUrl.searchParams.get("id") || undefined;
  const attempts = buildSnapshotAttempts(target, deploymentId);

  let browser;
  let lastError: unknown = null;
  try {
    const executablePath =
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;

    browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    for (const attempt of attempts) {
      const context = await browser.newContext({
        viewport: { width, height },
        extraHTTPHeaders: attempt.deploymentIdHeader
          ? { "x-deployment-id": attempt.deploymentIdHeader }
          : undefined,
      });

      const page = await context.newPage();
      console.log(
        "[snapshot] Trying URL:",
        attempt.url,
        "mode:",
        attempt.label,
        "deployment-id:",
        attempt.deploymentIdHeader || "none",
      );

      try {
        await page.goto(attempt.url, {
          waitUntil: "networkidle",
          timeout: 20000,
        });

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
        lastError = error;
        console.error(
          "[snapshot] Attempt failed:",
          attempt.label,
          error instanceof Error ? error.message : error,
        );
      } finally {
        await context.close();
      }
    }

    throw lastError || new Error("All snapshot attempts failed");
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
