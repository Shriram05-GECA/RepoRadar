import { Severity } from "./finding";

export type Ecosystem =
  | "npm"
  | "PyPI"
  | "Go"
  | "crates.io"
  | "Packagist"
  | "Maven"
  | "RubyGems";

export interface Dependency {
  name: string;
  version: string;
  ecosystem: Ecosystem;
  manifestFile: string;
}

export interface DependencyFinding {
  type: "dependency";
  package: string;
  ecosystem: string;
  installedVersion: string;
  vulnerabilityId: string;
  severity: Severity;
  summary: string;
  affectedRange?: string;
  fixedVersion?: string;
  references?: string[];
}
