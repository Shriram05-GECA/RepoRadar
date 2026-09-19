import { Severity } from "./finding";

export interface RepositoryMetadata {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  description?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  language?: string;
  size?: number; // In KB
  visibility: "public" | "private";
  lastUpdate?: string;
  htmlUrl: string;
}

export interface RepoNode {
  path: string;
  name: string;
  type: "file" | "directory";
  size?: number;
  children?: RepoNode[];
  findings?: string[];
  highestSeverity?: Severity | "none";
}
