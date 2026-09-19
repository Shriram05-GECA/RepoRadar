export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  fullUrl: string;
}

const RESERVED_NAMES = new Set([
  "settings",
  "features",
  "explore",
  "pricing",
  "about",
  "enterprise",
  "trending",
  "collections",
  "events",
  "marketplace",
  "security",
  "login",
  "signup",
  "orgs",
  "users",
  "pulls",
  "issues",
  "notifications",
]);

/**
 * Validates and parses a public GitHub repository URL.
 */
export function parseGitHubUrl(input: string): {
  success: boolean;
  data?: ParsedGitHubUrl;
  error?: string;
} {
  if (!input || typeof input !== "string") {
    return { success: false, error: "Please provide a GitHub repository URL." };
  }

  let raw = input.trim();
  // Strip leading/trailing quotes or markdown brackets
  raw = raw.replace(/^<|>$/g, "").replace(/^["']|["']$/g, "");

  // Add protocol if missing
  if (!/^https?:\/\//i.test(raw)) {
    raw = "https://" + raw;
  }

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();

    if (host !== "github.com" && host !== "www.github.com") {
      return {
        success: false,
        error: "Only public GitHub (github.com) repositories are supported.",
      };
    }

    const segments = parsed.pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);

    if (segments.length < 2) {
      return {
        success: false,
        error: "URL must point to a repository in the format: owner/repository.",
      };
    }

    const owner = segments[0];
    let repo = segments[1];

    // Remove trailing .git if present
    if (repo.endsWith(".git")) {
      repo = repo.slice(0, -4);
    }

    if (RESERVED_NAMES.has(owner.toLowerCase())) {
      return {
        success: false,
        error: `"${owner}" is a reserved GitHub page, not a user repository.`,
      };
    }

    // Validate characters (standard GitHub naming conventions)
    const validNameRegex = /^[a-zA-Z0-9_\-\.]+$/;
    if (!validNameRegex.test(owner) || !validNameRegex.test(repo)) {
      return {
        success: false,
        error: "Repository name or owner contains invalid characters.",
      };
    }

    return {
      success: true,
      data: {
        owner,
        repo,
        fullUrl: `https://github.com/${owner}/${repo}`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: "Malformed URL. Please enter a valid URL like https://github.com/owner/repo",
    };
  }
}
