import { Dependency } from "@/types/dependency";
import { Finding, Severity } from "@/types/finding";

interface OSVBatchQuery {
  package: {
    name: string;
    ecosystem: string;
  };
  version: string;
}

interface OSVVulnerability {
  id: string;
  summary?: string;
  details?: string;
  aliases?: string[];
  severity?: Array<{
    type: string;
    score: string;
  }>;
  affected?: Array<{
    package?: {
      name: string;
      ecosystem: string;
    };
    ranges?: Array<{
      type: string;
      events?: Array<{
        introduced?: string;
        fixed?: string;
      }>;
    }>;
    database_specific?: {
      severity?: string;
    };
  }>;
  references?: Array<{
    type: string;
    url: string;
  }>;
}

interface OSVBatchResponse {
  results: Array<{
    vulns?: OSVVulnerability[];
  }>;
}

/**
 * Maps CVSS score or OSV severity string into RepoRadar Severity
 */
function parseOSVSeverity(vuln: OSVVulnerability): Severity {
  // Check CVSS score if available
  if (vuln.severity && vuln.severity.length > 0) {
    const cvss = vuln.severity[0].score;
    // Extract CVSS numeric score if present, e.g. "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H" -> default critical
    if (cvss.includes("C:H/I:H/A:H") || cvss.includes("S:C")) return "critical";
    if (cvss.includes("C:H") || cvss.includes("I:H")) return "high";
  }

  // Check database_specific severity string
  if (vuln.affected && vuln.affected.length > 0) {
    for (const aff of vuln.affected) {
      const sevStr = aff.database_specific?.severity?.toUpperCase();
      if (sevStr) {
        if (sevStr === "CRITICAL") return "critical";
        if (sevStr === "HIGH") return "high";
        if (sevStr === "MODERATE" || sevStr === "MEDIUM") return "medium";
        if (sevStr === "LOW") return "low";
      }
    }
  }

  // Check summary keywords
  const sum = (vuln.summary || "").toLowerCase() + (vuln.details || "").toLowerCase();
  if (sum.includes("remote code execution") || sum.includes("command injection") || sum.includes("critical")) {
    return "critical";
  }
  if (sum.includes("sql injection") || sum.includes("privilege escalation") || sum.includes("authentication bypass")) {
    return "high";
  }
  if (sum.includes("cross-site scripting") || sum.includes("xss") || sum.includes("denial of service") || sum.includes("dos")) {
    return "medium";
  }

  return "medium";
}

/**
 * Queries OSV.dev batch API for identified dependencies and returns normalized Findings.
 */
export async function queryOSVBatch(
  dependencies: Dependency[]
): Promise<{ findings: Finding[]; error?: string }> {
  if (!dependencies || dependencies.length === 0) {
    return { findings: [] };
  }

  // Deduplicate dependencies by name + version + ecosystem
  const uniqueMap = new Map<string, Dependency>();
  for (const dep of dependencies) {
    const key = `${dep.ecosystem}:${dep.name}@${dep.version}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, dep);
    }
  }

  const uniqueDeps = Array.from(uniqueMap.values());
  const batchQueries: OSVBatchQuery[] = uniqueDeps.map((d) => ({
    package: {
      name: d.name,
      ecosystem: d.ecosystem,
    },
    version: d.version,
  }));

  const CHUNK_SIZE = 250;
  const findings: Finding[] = [];
  const seenVulnIds = new Set<string>();

  try {
    for (let i = 0; i < batchQueries.length; i += CHUNK_SIZE) {
      const chunk = batchQueries.slice(i, i + CHUNK_SIZE);
      const depChunk = uniqueDeps.slice(i, i + CHUNK_SIZE);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch("https://api.osv.dev/v1/querybatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: chunk }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSV API HTTP ${response.status}: ${response.statusText}`);
      }

      const data: OSVBatchResponse = await response.json();

      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((result, idx) => {
          const dep = depChunk[idx];
          if (result.vulns && result.vulns.length > 0) {
            for (const vuln of result.vulns) {
              const uniqueVulnKey = `${vuln.id}:${dep.name}`;
              if (seenVulnIds.has(uniqueVulnKey)) continue;
              seenVulnIds.add(uniqueVulnKey);

              const severity = parseOSVSeverity(vuln);

              // Find fixed version if indicated
              let fixedVersion: string | undefined;
              let affectedRange: string | undefined;
              if (vuln.affected) {
                for (const aff of vuln.affected) {
                  if (aff.ranges) {
                    affectedRange = aff.ranges.map((r) => r.events?.map((e) => e.fixed ? `fixed ${e.fixed}` : e.introduced ? `introduced ${e.introduced}` : "").filter(Boolean).join(", ")).filter(Boolean).join("; ") || undefined;
                    for (const r of aff.ranges) {
                      const fixEvent = r.events?.find((e) => e.fixed);
                      if (fixEvent?.fixed) {
                        fixedVersion = fixEvent.fixed;
                        break;
                      }
                    }
                  }
                }
              }

              const refs = vuln.references ? vuln.references.map((r) => r.url).slice(0, 4) : [];
              const summaryText = vuln.summary || vuln.details?.slice(0, 150) || `Known vulnerability in ${dep.name}`;

              findings.push({
                id: `dep-${vuln.id}-${dep.name.replace(/[^a-zA-Z0-9]/g, "_")}`,
                type: "dependency",
                severity,
                confidence: 95,
                title: `${vuln.id}: Vulnerability in ${dep.name} (${dep.version})`,
                description: summaryText,
                whyItMatters:
                  "Using dependencies with known vulnerabilities exposes the application to public exploits, automated attacks, and security regressions.",
                remediation: fixedVersion
                  ? `Upgrade ${dep.name} to version ${fixedVersion} or newer in ${dep.manifestFile}.`
                  : `Upgrade ${dep.name} to the latest secure release or apply an upstream patch.`,
                file: dep.manifestFile,
                package: {
                  name: dep.name,
                  version: dep.version,
                  ecosystem: dep.ecosystem,
                },
                vulnerabilityId: vuln.id,
                fixedVersion,
                affectedRange,
                references: refs,
              });
            }
          }
        });
      }
    }

    return { findings };
  } catch (err: any) {
    console.warn("OSV Batch Query Warning / Graceful Fallback:", err?.message || err);
    return {
      findings,
      error: `OSV vulnerability intelligence service was unreachable (${err?.message || "timeout"}). Dependency checks partially limited.`,
    };
  }
}
