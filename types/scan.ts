import { Finding } from "./finding";
import { RepositoryMetadata, RepoNode } from "./repository";

export type RiskLevel = "LOW" | "GUARDED" | "MODERATE" | "HIGH" | "CRITICAL";

export interface ScanResult {
  repository: RepositoryMetadata;
  indexedFiles: number;
  analyzedFiles: number;
  skippedFiles: number;
  dependenciesFound: number;
  dependenciesChecked: number;
  scanDurationMs: number;
  truncated: boolean;
  score: number;
  riskLevel: RiskLevel;
  findings: Finding[];
  tree: RepoNode;
  categoryCounts: {
    secrets: number;
    dependencies: number;
    configuration: number;
  };
  isDemo?: boolean;
  scanLimits?: string[];
}

export type ScanStage =
  | "idle"
  | "validating"
  | "fetching_meta"
  | "fetching_tree"
  | "filtering_files"
  | "analyzing_secrets"
  | "checking_dependencies"
  | "auditing_configuration"
  | "calculating_risk"
  | "complete"
  | "error";

export interface ScanProgress {
  stage: ScanStage;
  message: string;
  progressPercent?: number;
  filesIndexed?: number;
  filesAnalyzed?: number;
}
