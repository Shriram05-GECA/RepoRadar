import { RepositoryMetadata, RepoNode } from "@/types/repository";
import { evaluateFileForScan, MAX_FILE_BYTES } from "@/lib/scanner/filter";

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export class GitHubApiError extends Error {
  status: number;
  isRateLimit: boolean;
  constructor(message: string, status: number, isRateLimit = false) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.isRateLimit = isRateLimit;
  }
}

export class GitHubClient {
  private token?: string;

  constructor(token?: string) {
    this.token = token || process.env.GITHUB_TOKEN;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoRadar-SecurityScanner/1.0",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Fetches metadata for a GitHub repository.
   */
  async getRepositoryMetadata(owner: string, repo: string): Promise<RepositoryMetadata> {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const res = await fetch(url, {
      headers: this.getHeaders(),
      next: { revalidate: 60 },
    });

    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        throw new GitHubApiError(
          "GitHub API rate limit exceeded for anonymous requests. Please try again later or supply a GITHUB_TOKEN.",
          res.status,
          true
        );
      }
      throw new GitHubApiError("Access to this repository is restricted or rate-limited.", res.status);
    }

    if (res.status === 404) {
      throw new GitHubApiError(
        `Repository "${owner}/${repo}" was not found or is private. Only public repositories can be scanned.`,
        404
      );
    }

    if (!res.ok) {
      throw new GitHubApiError(`GitHub API returned status ${res.status}: ${res.statusText}`, res.status);
    }

    const data = await res.json();
    return {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      defaultBranch: data.default_branch || "main",
      description: data.description || "",
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      openIssues: data.open_issues_count || 0,
      language: data.language || "Unknown",
      size: data.size || 0,
      visibility: data.private ? "private" : "public",
      lastUpdate: data.updated_at,
      htmlUrl: data.html_url,
    };
  }

  /**
   * Fetches the entire git tree recursively with automatic branch fallback.
   */
  async getGitTree(owner: string, repo: string, branch: string): Promise<GitHubTreeResponse> {
    const branchesToTry = [branch, "main", "master", "HEAD"];
    const tried = new Set<string>();

    for (const b of branchesToTry) {
      if (tried.has(b)) continue;
      tried.add(b);

      const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(b)}?recursive=1`;
      const res = await fetch(url, { headers: this.getHeaders() });

      if (res.status === 403 || res.status === 429) {
        const remaining = res.headers.get("x-ratelimit-remaining");
        if (remaining === "0") {
          throw new GitHubApiError(
            "GitHub anonymous rate limit reached while fetching repository tree. Configure a GITHUB_TOKEN or try again in a few moments.",
            res.status,
            true
          );
        }
      }

      if (res.ok) {
        return await res.json();
      }
    }

    throw new GitHubApiError(`Repository tree could not be located for branch "${branch}".`, 404);
  }

  /**
   * Fetches raw content of a specific file.
   */
  async getFileContent(
    owner: string,
    repo: string,
    branch: string,
    filePath: string,
    fileSize?: number
  ): Promise<string | null> {
    if (fileSize && fileSize > MAX_FILE_BYTES) {
      return null;
    }

    // Try raw.githubusercontent.com first for faster and non-rate-limited access to raw text
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    try {
      const res = await fetch(rawUrl, {
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
      });

      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      // Fallback to API if raw fails
    }

    // Fallback: GitHub Contents API
    try {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      const res = await fetch(apiUrl, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.encoding === "base64" && data.content) {
          return Buffer.from(data.content, "base64").toString("utf-8");
        }
      }
    } catch (e) {
      // Ignore
    }

    return null;
  }
}

/**
 * Builds a hierarchical RepoNode tree from flat GitHub tree items.
 */
export function buildRepoTree(treeItems: GitHubTreeItem[], rootName: string): RepoNode {
  const root: RepoNode = {
    path: "",
    name: rootName,
    type: "directory",
    children: [],
  };

  const dirMap = new Map<string, RepoNode>();
  dirMap.set("", root);

  // Sort by path depth
  const sorted = [...treeItems].sort((a, b) => a.path.localeCompare(b.path));

  for (const item of sorted) {
    const parts = item.path.split("/");
    const fileName = parts[parts.length - 1];
    const parentDir = parts.slice(0, -1).join("/");

    // Ensure all ancestor directories exist
    let currentPath = "";
    for (let i = 0; i < parts.length - 1; i++) {
      const subPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      if (!dirMap.has(subPath)) {
        const parentNode = dirMap.get(currentPath)!;
        const newDirNode: RepoNode = {
          path: subPath,
          name: parts[i],
          type: "directory",
          children: [],
        };
        parentNode.children = parentNode.children || [];
        parentNode.children.push(newDirNode);
        dirMap.set(subPath, newDirNode);
      }
      currentPath = subPath;
    }

    const parent = dirMap.get(parentDir) || root;

    if (item.type === "tree") {
      if (!dirMap.has(item.path)) {
        const dirNode: RepoNode = {
          path: item.path,
          name: fileName,
          type: "directory",
          children: [],
        };
        parent.children = parent.children || [];
        parent.children.push(dirNode);
        dirMap.set(item.path, dirNode);
      }
    } else {
      const fileNode: RepoNode = {
        path: item.path,
        name: fileName,
        type: "file",
        size: item.size || 1024,
      };
      parent.children = parent.children || [];
      parent.children.push(fileNode);
    }
  }

  return root;
}
