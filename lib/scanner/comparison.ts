import { Finding } from "@/types/finding";
import { ScanResult } from "@/types/scan";

export const findingIdentity = (finding: Finding) => [finding.type, finding.file || "", finding.evidence?.pattern || "", finding.vulnerabilityId || "", finding.package?.name || "", finding.title].join("|").toLowerCase();

export function compareScans(previous: ScanResult, current: ScanResult) {
  const currentIds = new Set(current.findings.map(findingIdentity));
  const previousIds = new Set(previous.findings.map(findingIdentity));
  return {
    resolved: previous.findings.filter((f) => !currentIds.has(findingIdentity(f))),
    remaining: current.findings.filter((f) => previousIds.has(findingIdentity(f))),
    newFindings: current.findings.filter((f) => !previousIds.has(findingIdentity(f))),
    unchanged: current.findings.filter((f) => previousIds.has(findingIdentity(f))),
    previousScore: previous.score,
    currentScore: current.score,
  };
}
