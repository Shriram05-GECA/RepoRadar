import { ScanResult } from "@/types/scan";
import { Finding, Severity } from "@/types/finding";
import { RepoNode } from "@/types/repository";
import { Dependency } from "@/types/dependency";
import { parseGitHubUrl } from "@/lib/github/url";
import { GitHubClient, buildRepoTree, GitHubTreeItem } from "@/lib/github/client";
import { evaluateFileForScan, MANIFEST_FILENAMES } from "@/lib/scanner/filter";
import { scanContentForSecrets } from "@/lib/scanner/secrets/scanner";
import { extractDependenciesFromManifest } from "@/lib/scanner/dependencies/extract";
import { queryOSVBatch } from "@/lib/scanner/dependencies/osv";
import { scanContentForConfigIssues } from "@/lib/scanner/config/rules";
import { calculateRiskScore } from "@/lib/scanner/scoring/calculator";

const SEVERITY_RANK: Record<Severity | "none", number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
  none: 0,
};

/**
 * Propagates highest severity and finding IDs through the RepoNode tree.
 */
function annotateTreeWithFindings(node: RepoNode, findingsByFile: Map<string, Finding[]>): Severity | "none" {
  let highest: Severity | "none" = "none";

  if (node.type === "file") {
    const fileFindings = findingsByFile.get(node.path) || [];
    if (fileFindings.length > 0) {
      node.findings = fileFindings.map((f) => f.id);
      for (const f of fileFindings) {
        if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[highest]) {
          highest = f.severity;
        }
      }
    }
  } else if (node.children) {
    for (const child of node.children) {
      const childSeverity = annotateTreeWithFindings(child, findingsByFile);
      if (SEVERITY_RANK[childSeverity] > SEVERITY_RANK[highest]) {
        highest = childSeverity;
      }
    }
  }

  node.highestSeverity = highest;
  return highest;
}

export async function executeRepositoryScan(
  repoUrl: string,
  githubToken?: string
): Promise<ScanResult> {
  const startTime = Date.now();

  // 1. Validate & Parse URL
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed.success || !parsed.data) {
    throw new Error(parsed.error || "Invalid GitHub repository URL.");
  }

  const { owner, repo } = parsed.data;
  const client = new GitHubClient(githubToken);

  // 2. Fetch Metadata
  const metadata = await client.getRepositoryMetadata(owner, repo);

  // 3. Fetch Git Tree
  const treeResponse = await client.getGitTree(owner, repo, metadata.defaultBranch);
  const rawTree = treeResponse.tree || [];
  const indexedFiles = rawTree.filter((i) => i.type === "blob").length;

  const scanLimits: string[] = [];
  if (treeResponse.truncated) {
    scanLimits.push(
      "GitHub truncated the repository tree because it exceeds 100,000 files. Partial index analyzed."
    );
  }

  // 4. Build Internal Tree
  const repoTree = buildRepoTree(rawTree, repo);

  // 5. Select Analyzable Files
  // Prioritize manifests first, then config files, then source code
  const candidateBlobs: GitHubTreeItem[] = [];
  let skippedFiles = 0;

  for (const item of rawTree) {
    if (item.type !== "blob") continue;

    const decision = evaluateFileForScan(item.path, item.size);
    if (decision.shouldAnalyze) {
      candidateBlobs.push(item);
    } else {
      skippedFiles++;
    }
  }

  // Sort candidate blobs: manifests first, configs second, then other source code
  candidateBlobs.sort((a, b) => {
    const aName = a.path.split("/").pop()?.toLowerCase() || "";
    const bName = b.path.split("/").pop()?.toLowerCase() || "";
    const aIsManifest = MANIFEST_FILENAMES.has(aName) || aName.startsWith(".env");
    const bIsManifest = MANIFEST_FILENAMES.has(bName) || bName.startsWith(".env");
    if (aIsManifest && !bIsManifest) return -1;
    if (!aIsManifest && bIsManifest) return 1;
    return (a.size || 0) - (b.size || 0);
  });

  // Limit file content downloads to safeguard response time and rate limits
  const MAX_DOWNLOAD_FILES = 80;
  const blobsToFetch = candidateBlobs.slice(0, MAX_DOWNLOAD_FILES);

  if (candidateBlobs.length > MAX_DOWNLOAD_FILES) {
    scanLimits.push(
      `Analyzed top ${MAX_DOWNLOAD_FILES} high-priority files (manifests, configs, workflows, critical source files) out of ${candidateBlobs.length} candidate files.`
    );
  }

  // 6. Concurrently Fetch Contents (batches of 8)
  const fileContents = new Map<string, string>();
  const CONCURRENCY = 8;
  for (let i = 0; i < blobsToFetch.length; i += CONCURRENCY) {
    const batch = blobsToFetch.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (blob) => {
        try {
          const content = await client.getFileContent(
            owner,
            repo,
            metadata.defaultBranch,
            blob.path,
            blob.size
          );
          if (content !== null) {
            fileContents.set(blob.path, content);
          }
        } catch (e) {
          // Skip file if fetch fails
        }
      })
    );
  }

  const analyzedFiles = fileContents.size;

  // 7. Run Secret Scanner & Configuration Rules
  const allFindings: Finding[] = [];
  const allDependencies: Dependency[] = [];

  for (const [filePath, content] of fileContents.entries()) {
    // Secret Scanner
    const secretFindings = scanContentForSecrets(filePath, content);
    allFindings.push(...secretFindings);

    // Config Rules
    const configFindings = scanContentForConfigIssues(filePath, content);
    allFindings.push(...configFindings);

    // Dependency Manifest extraction
    const deps = extractDependenciesFromManifest(filePath, content);
    if (deps.length > 0) {
      allDependencies.push(...deps);
    }
  }

  // 8. Query OSV for Dependencies
  let depFindings: Finding[] = [];
  if (allDependencies.length > 0) {
    const osvRes = await queryOSVBatch(allDependencies);
    depFindings = osvRes.findings;
    allFindings.push(...depFindings);
    if (osvRes.error) {
      scanLimits.push(osvRes.error);
    }
  }

  // 9. Calculate Risk Score
  const scoreResult = calculateRiskScore(allFindings);

  // 10. Map findings by file and annotate tree
  const findingsByFile = new Map<string, Finding[]>();
  for (const f of allFindings) {
    if (f.file) {
      const existing = findingsByFile.get(f.file) || [];
      existing.push(f);
      findingsByFile.set(f.file, existing);
    }
  }

  annotateTreeWithFindings(repoTree, findingsByFile);

  const durationMs = Date.now() - startTime;

  return {
    repository: metadata,
    indexedFiles,
    analyzedFiles,
    skippedFiles,
    dependenciesFound: allDependencies.length,
    dependenciesChecked: allDependencies.length,
    scanDurationMs: durationMs,
    truncated: treeResponse.truncated || candidateBlobs.length > MAX_DOWNLOAD_FILES,
    score: scoreResult.score,
    riskLevel: scoreResult.riskLevel,
    findings: allFindings,
    tree: repoTree,
    categoryCounts: {
      secrets: allFindings.filter((f) => f.type === "secret").length,
      dependencies: allFindings.filter((f) => f.type === "dependency").length,
      configuration: allFindings.filter((f) => f.type === "configuration").length,
    },
    scanLimits: scanLimits.length > 0 ? scanLimits : undefined,
  };
}
