import { NextRequest, NextResponse } from "next/server";
import { executeRepositoryScan } from "@/lib/scanner/engine";
import { GitHubApiError } from "@/lib/github/client";

export const maxDuration = 60; // 60 seconds max execution

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { repoUrl } = body;

    if (!repoUrl || typeof repoUrl !== "string") {
      return NextResponse.json(
        {
          error: "A valid public GitHub repository URL is required.",
          code: "MISSING_URL",
        },
        { status: 400 }
      );
    }

    const result = await executeRepositoryScan(repoUrl);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Scan API error:", err?.message || err);

    if (err instanceof GitHubApiError) {
      if (err.isRateLimit) {
        return NextResponse.json(
          {
            error:
              "GitHub anonymous API rate limit has been reached. Please try again in a few moments, or click 'Try Demo' to test the full visualization experience immediately.",
            code: "RATE_LIMIT_REACHED",
          },
          { status: 429 }
        );
      }

      if (err.status === 404) {
        return NextResponse.json(
          {
            error:
              "Repository was not found or is private. RepoRadar only scans public repositories.",
            code: "REPO_NOT_FOUND",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          err?.message ||
          "An unexpected error occurred while scanning the repository. Try another repository or explore the Demo.",
        code: "SCAN_FAILED",
      },
      { status: 500 }
    );
  }
}
