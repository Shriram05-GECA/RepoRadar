export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type FindingType = "secret" | "dependency" | "configuration";
export type FindingStatus = "open" | "in_progress" | "marked_complete" | "verified_resolved";

export interface Finding {
  id: string;
  type: FindingType;
  severity: Severity;
  confidence: number; // 0 to 100
  title: string;
  description: string;
  whyItMatters: string;
  remediation: string;
  file?: string;
  line?: number;
  column?: number;
  evidence?: {
    redactedCode?: string;
    pattern?: string;
  };
  package?: {
    name: string;
    version: string;
    ecosystem?: string;
  };
  vulnerabilityId?: string;
  affectedRange?: string;
  fixedVersion?: string;
  references?: string[];
}
