import { ScanResult } from "@/types/scan";
import { Finding } from "@/types/finding";
import { RepoNode } from "@/types/repository";

export const DEMO_FINDINGS: Finding[] = [
  // 1. AWS Access Key (Critical Secret)
  {
    id: "demo-sec-aws",
    type: "secret",
    severity: "critical",
    confidence: 96,
    title: "AWS Access Key ID Detected",
    description: "Hardcoded AWS Access Key ID found in active auth configuration.",
    whyItMatters:
      "Exposed AWS credentials allow unauthorized actors to manipulate cloud infrastructure, access S3 buckets, and potentially compromise private enterprise data.",
    remediation:
      "Revoke this key immediately in the AWS IAM Console, issue a new key pair, and load credentials via AWS Secrets Manager or environment variables.",
    file: "src/auth/config.ts",
    line: 18,
    column: 10,
    evidence: {
      pattern: "SEC-AWS-001",
      redactedCode: `16 | const awsConfig = {
17 |   region: process.env.AWS_REGION || "us-east-1",
18 |   accessKeyId: "AKIA••••••••••7X2",
19 |   bucket: "acme-production-vault"
20 | };`,
    },
  },

  // 2. Stripe Live API Key (Critical Secret)
  {
    id: "demo-sec-stripe",
    type: "secret",
    severity: "critical",
    confidence: 98,
    title: "Stripe Secret API Key Detected",
    description: "Live Stripe secret key found in payments handler module.",
    whyItMatters:
      "Live Stripe keys allow adversaries to initiate fraudulent charges, drain balances, inspect customer payment methods, or manipulate subscriptions.",
    remediation:
      "Immediately roll the API key in Stripe Dashboard -> Developers -> API keys. Inspect recent webhooks and checkout events for unauthorized calls.",
    file: "src/api/payments.ts",
    line: 12,
    column: 14,
    evidence: {
      pattern: "SEC-STRIPE-001",
      redactedCode: `10 | import Stripe from "stripe";
11 | 
12 | const stripe = new Stripe("sk_live_••••••••••••••••••••••••3mX9");
13 | export async function chargeCustomer(amount: number) {`,
    },
  },

  // 3. Database URI with Password (Critical Secret)
  {
    id: "demo-sec-db",
    type: "secret",
    severity: "critical",
    confidence: 94,
    title: "Database Connection String with Plaintext Password",
    description: "Production PostgreSQL database connection string containing plaintext credentials.",
    whyItMatters:
      "Direct database connection strings expose databases to immediate remote query execution, ransomware, or catastrophic data loss.",
    remediation:
      "Rotate the database user password immediately, isolate the database inside a private VPC, and pass credentials via runtime secrets injection.",
    file: "config/production.yml",
    line: 8,
    column: 12,
    evidence: {
      pattern: "SEC-DB-001",
      redactedCode: ` 6 | database:
 7 |   pool: 20
 8 |   url: "postgres://db_admin:••••••••••••@db.acme-corp.internal:5432/production"
 9 |   ssl: true`,
    },
  },

  // 4. GitHub Token (Critical Secret)
  {
    id: "demo-sec-gh",
    type: "secret",
    severity: "critical",
    confidence: 97,
    title: "GitHub Personal Access Token Detected",
    description: "Hardcoded personal access token with repository admin scope in deploy workflow.",
    whyItMatters:
      "GitHub tokens grant attackers direct access to write repository code, trigger CI/CD jobs, and publish malicious releases.",
    remediation:
      "Revoke this token in GitHub Developer Settings and replace with ephemeral GITHUB_TOKEN or OpenID Connect (OIDC).",
    file: "src/api/users.ts",
    line: 45,
    column: 22,
    evidence: {
      pattern: "SEC-GH-001",
      redactedCode: `43 | // Sync with GitHub Org
44 | async function syncTeam() {
45 |   const token = "ghp_••••••••••••••••••••••••••••••••ef";
46 |   return fetch("https://api.github.com/user/orgs", {`,
    },
  },

  // 5. OSV: Lodash Prototype Pollution (High Dependency)
  {
    id: "demo-dep-lodash",
    type: "dependency",
    severity: "high",
    confidence: 95,
    title: "GHSA-p6mc-m468-83gw: Prototype Pollution in lodash",
    description: "lodash versions prior to 4.17.21 are vulnerable to Prototype Pollution via zipObjectDeep.",
    whyItMatters:
      "Prototype pollution can lead to application crash, property injection, authentication bypass, or Remote Code Execution.",
    remediation: "Upgrade lodash to version 4.17.21 or later in package.json.",
    file: "package.json",
    package: {
      name: "lodash",
      version: "4.17.15",
      ecosystem: "npm",
    },
    vulnerabilityId: "GHSA-p6mc-m468-83gw",
    references: [
      "https://nvd.nist.gov/vuln/detail/CVE-2020-8203",
      "https://github.com/advisories/GHSA-p6mc-m468-83gw",
    ],
  },

  // 6. OSV: Axios SSRF (High Dependency)
  {
    id: "demo-dep-axios",
    type: "dependency",
    severity: "high",
    confidence: 95,
    title: "GHSA-8hc4-vh64-cxmj: Server-Side Request Forgery in axios",
    description: "Axios vulnerable to Server-Side Request Forgery (SSRF) when handling follow-redirects with confidential headers.",
    whyItMatters:
      "Attackers can force the application to make unintended network requests, exfiltrating cloud metadata (169.254.169.254) or accessing internal services.",
    remediation: "Upgrade axios to version 1.7.4 or later.",
    file: "package.json",
    package: {
      name: "axios",
      version: "0.21.1",
      ecosystem: "npm",
    },
    vulnerabilityId: "GHSA-8hc4-vh64-cxmj",
    references: [
      "https://github.com/axios/axios/security/advisories/GHSA-8hc4-vh64-cxmj",
    ],
  },

  // 7. OSV: Jsonwebtoken Algorithm Confusion (High Dependency)
  {
    id: "demo-dep-jwt",
    type: "dependency",
    severity: "high",
    confidence: 95,
    title: "GHSA-hjrf-2m55-59vw: Insecure Token Verification in jsonwebtoken",
    description: "jsonwebtoken library before 9.0.0 allows signature verification bypass under specific key configurations.",
    whyItMatters:
      "Bypassing token verification allows adversaries to forge valid user claims and act with administrative permissions.",
    remediation: "Upgrade jsonwebtoken to version 9.0.0 or higher.",
    file: "package.json",
    package: {
      name: "jsonwebtoken",
      version: "8.5.1",
      ecosystem: "npm",
    },
    vulnerabilityId: "GHSA-hjrf-2m55-59vw",
    references: [
      "https://github.com/auth0/node-jsonwebtoken/security/advisories/GHSA-hjrf-2m55-59vw",
    ],
  },

  // 8. OSV: Express Path Traversal in serve-static (Medium Dependency)
  {
    id: "demo-dep-express",
    type: "dependency",
    severity: "medium",
    confidence: 90,
    title: "GHSA-qw6h-v8gh-w369: Path Traversal in send / serve-static",
    description: "Root-relative path redirection can expose files outside static directories on Windows platforms.",
    whyItMatters:
      "Allows unauthorized clients to download application configuration files, database credentials, and source files.",
    remediation: "Upgrade express to version 4.19.2 or higher.",
    file: "package.json",
    package: {
      name: "express",
      version: "4.17.1",
      ecosystem: "npm",
    },
    vulnerabilityId: "GHSA-qw6h-v8gh-w369",
    references: [
      "https://github.com/pillarjs/send/security/advisories/GHSA-qw6h-v8gh-w369",
    ],
  },

  // 9. OSV: Minimist Prototype Pollution (Medium Dependency)
  {
    id: "demo-dep-minimist",
    type: "dependency",
    severity: "medium",
    confidence: 90,
    title: "GHSA-xvch-5ox4-9948: Prototype Pollution in minimist",
    description: "Command-line argument parser improperly handles __proto__ properties.",
    whyItMatters:
      "Manipulating Object.prototype can cause unexpected control flow or enable further exploitation in backend microservices.",
    remediation: "Upgrade minimist to version 1.2.6 or later.",
    file: "package-lock.json",
    package: {
      name: "minimist",
      version: "1.2.0",
      ecosystem: "npm",
    },
    vulnerabilityId: "GHSA-xvch-5ox4-9948",
    references: ["https://nvd.nist.gov/vuln/detail/CVE-2020-7598"],
  },

  // 10. OSV: Semver ReDoS (Low Dependency)
  {
    id: "demo-dep-semver",
    type: "dependency",
    severity: "low",
    confidence: 85,
    title: "GHSA-c2qf-rxjj-qqgw: Regular Expression Denial of Service in semver",
    description: "Complex input versions can cause catastrophic backtracking during range validation.",
    whyItMatters:
      "Resource exhaustion on the Node.js event loop causing API timeouts and denial of service.",
    remediation: "Upgrade semver to version 7.5.2 or newer.",
    file: "package-lock.json",
    package: {
      name: "semver",
      version: "6.3.0",
      ecosystem: "npm",
    },
    vulnerabilityId: "GHSA-c2qf-rxjj-qqgw",
    references: ["https://github.com/npm/node-semver/pull/564"],
  },

  // 11. Configuration: GitHub Actions write-all (High Config)
  {
    id: "demo-cfg-gha",
    type: "configuration",
    severity: "high",
    confidence: 95,
    title: "Overly Permissive Workflow Permissions (write-all)",
    description: "GitHub Actions workflow explicitly requests broad `write-all` token permissions.",
    whyItMatters:
      "If a compromised action or vulnerable pull request step runs under write-all, attackers can tamper with repository releases, contents, and issues.",
    remediation:
      "Enforce least privilege: explicitly declare only required permissions (e.g. `permissions: contents: read`).",
    file: ".github/workflows/deploy.yml",
    line: 14,
    evidence: {
      pattern: "permissions: write-all",
      redactedCode: `12 | on: [push, pull_request]
13 | 
14 | permissions: write-all
15 | 
16 | jobs:
17 |   deploy:`,
    },
  },

  // 12. Configuration: Dockerfile USER root (Medium Config)
  {
    id: "demo-cfg-docker",
    type: "configuration",
    severity: "medium",
    confidence: 90,
    title: "Dockerfile Explicitly Runs as Root",
    description: "Container explicitly declares `USER root` for execution.",
    whyItMatters:
      "Processes running as root inside containers have greater opportunity for container-escape exploits and uninhibited host tampering.",
    remediation:
      "Create a dedicated unprivileged user (e.g. `RUN adduser -D appuser && USER appuser`) before executing entrypoints.",
    file: "Dockerfile",
    line: 22,
    evidence: {
      pattern: "USER root",
      redactedCode: `20 | COPY --from=builder /app/dist ./dist
21 | 
22 | USER root
23 | 
24 | EXPOSE 8080`,
    },
  },

  // 13. Configuration: Production Debug Mode Enabled (Medium Config)
  {
    id: "demo-cfg-debug",
    type: "configuration",
    severity: "medium",
    confidence: 85,
    title: "Debug Flag Active in Production Configuration",
    description: "Production YAML configuration has `debug: true` active.",
    whyItMatters:
      "Enabling debug mode in production prints detailed stack traces, internal paths, SQL queries, and environment values to end users.",
    remediation:
      "Set `debug: false` in production configuration and rely on centralized server logging.",
    file: "config/production.yml",
    line: 3,
    evidence: {
      pattern: "debug: true",
      redactedCode: ` 1 | server:
 2 |   port: 8080
 3 |   debug: true
 4 |   environment: "production"`,
    },
  },
];

export const DEMO_TREE: RepoNode = {
  path: "",
  name: "acme-store",
  type: "directory",
  highestSeverity: "critical",
  children: [
    {
      path: "src",
      name: "src",
      type: "directory",
      highestSeverity: "critical",
      children: [
        {
          path: "src/auth",
          name: "auth",
          type: "directory",
          highestSeverity: "critical",
          children: [
            {
              path: "src/auth/config.ts",
              name: "config.ts",
              type: "file",
              size: 4200,
              highestSeverity: "critical",
              findings: ["demo-sec-aws"],
            },
            {
              path: "src/auth/session.ts",
              name: "session.ts",
              type: "file",
              size: 2800,
              highestSeverity: "none",
            },
          ],
        },
        {
          path: "src/api",
          name: "api",
          type: "directory",
          highestSeverity: "critical",
          children: [
            {
              path: "src/api/users.ts",
              name: "users.ts",
              type: "file",
              size: 5100,
              highestSeverity: "critical",
              findings: ["demo-sec-gh"],
            },
            {
              path: "src/api/payments.ts",
              name: "payments.ts",
              type: "file",
              size: 6400,
              highestSeverity: "critical",
              findings: ["demo-sec-stripe"],
            },
          ],
        },
        {
          path: "src/utils",
          name: "utils",
          type: "directory",
          highestSeverity: "none",
          children: [
            {
              path: "src/utils/crypto.ts",
              name: "crypto.ts",
              type: "file",
              size: 1900,
              highestSeverity: "none",
            },
            {
              path: "src/utils/logger.ts",
              name: "logger.ts",
              type: "file",
              size: 1400,
              highestSeverity: "none",
            },
          ],
        },
      ],
    },
    {
      path: "config",
      name: "config",
      type: "directory",
      highestSeverity: "critical",
      children: [
        {
          path: "config/production.yml",
          name: "production.yml",
          type: "file",
          size: 3200,
          highestSeverity: "critical",
          findings: ["demo-sec-db", "demo-cfg-debug"],
        },
      ],
    },
    {
      path: ".github",
      name: ".github",
      type: "directory",
      highestSeverity: "high",
      children: [
        {
          path: ".github/workflows",
          name: "workflows",
          type: "directory",
          highestSeverity: "high",
          children: [
            {
              path: ".github/workflows/deploy.yml",
              name: "deploy.yml",
              type: "file",
              size: 2100,
              highestSeverity: "high",
              findings: ["demo-cfg-gha"],
            },
          ],
        },
      ],
    },
    {
      path: "Dockerfile",
      name: "Dockerfile",
      type: "file",
      size: 1800,
      highestSeverity: "medium",
      findings: ["demo-cfg-docker"],
    },
    {
      path: "package.json",
      name: "package.json",
      type: "file",
      size: 3800,
      highestSeverity: "high",
      findings: [
        "demo-dep-lodash",
        "demo-dep-axios",
        "demo-dep-jwt",
        "demo-dep-express",
      ],
    },
    {
      path: "package-lock.json",
      name: "package-lock.json",
      type: "file",
      size: 11500,
      highestSeverity: "medium",
      findings: ["demo-dep-minimist", "demo-dep-semver"],
    },
    {
      path: "README.md",
      name: "README.md",
      type: "file",
      size: 3100,
      highestSeverity: "none",
    },
  ],
};

export const DEMO_SCAN_RESULT: ScanResult = {
  repository: {
    owner: "acme-corp",
    name: "acme-store",
    fullName: "acme-corp/acme-store",
    defaultBranch: "main",
    description: "Production enterprise e-commerce backend and payments service",
    stars: 1248,
    forks: 183,
    openIssues: 12,
    language: "TypeScript",
    size: 2450,
    visibility: "public",
    lastUpdate: "2026-09-18T12:30:00Z",
    htmlUrl: "https://github.com/acme-corp/acme-store",
  },
  indexedFiles: 14,
  analyzedFiles: 12,
  skippedFiles: 2,
  dependenciesFound: 18,
  dependenciesChecked: 18,
  scanDurationMs: 1420,
  truncated: false,
  score: 72,
  riskLevel: "HIGH",
  findings: DEMO_FINDINGS,
  tree: DEMO_TREE,
  categoryCounts: {
    secrets: 4,
    dependencies: 6,
    configuration: 3,
  },
  isDemo: true,
  scanLimits: [
    "Deterministic demo repository seed loaded. No live external requests made.",
  ],
};
