import { Finding, Severity } from "@/types/finding";

export interface ConfigRule {
  id: string;
  name: string;
  severity: Severity;
  confidence: number;
  appliesTo: (filePath: string) => boolean;
  evaluate: (filePath: string, content: string) => Finding[];
}

export const CONFIG_RULES: ConfigRule[] = [
  // 1. Committed .env files
  {
    id: "CFG-ENV-001",
    name: "Committed Production Environment File",
    severity: "critical",
    confidence: 96,
    appliesTo: (path) => {
      const base = path.split("/").pop() || "";
      return (
        base === ".env" ||
        base === ".env.local" ||
        base === ".env.production" ||
        base === ".env.staging"
      );
    },
    evaluate: (filePath, content) => {
      // Check if it actually contains key-value pairs and not just an example
      const lines = content.split("\n");
      const kvLines = lines.filter((l) => /^[A-Z0-9_]+\s*=\s*.+/.test(l.trim()));
      if (kvLines.length >= 2) {
        return [
          {
            id: `cfg-env-${filePath}`,
            type: "configuration",
            severity: "critical",
            confidence: 96,
            title: `Committed Environment File (${filePath.split("/").pop()})`,
            description: `Environment configuration file committed directly to Git repository with ${kvLines.length} active key-value variables.`,
            whyItMatters:
              "Committed .env files frequently leak database credentials, production API keys, encryption secrets, and internal hostnames to anyone with repository access.",
            remediation:
              "Add this file to .gitignore, remove it from the Git index (`git rm --cached`), and rotate any credentials that were committed.",
            file: filePath,
            line: 1,
            evidence: {
              pattern: "COMMITTED_ENV_FILE",
              redactedCode: kvLines.slice(0, 3).map((l, i) => `${i + 1} | ${l.split("=")[0]}=••••••••`).join("\n"),
            },
          },
        ];
      }
      return [];
    },
  },

  // 2. Docker root user / insecure commands
  {
    id: "CFG-DOCKER-ROOT",
    name: "Docker Container Running as Root",
    severity: "medium",
    confidence: 85,
    appliesTo: (path) => path.endsWith("Dockerfile") || path.includes("/Dockerfile."),
    evaluate: (filePath, content) => {
      const findings: Finding[] = [];
      const lines = content.split("\n");

      // Check for explicit USER root or absence of any USER command
      const hasUserDirective = lines.some((l) => /^\s*USER\s+/i.test(l));
      const explicitRootIndex = lines.findIndex((l) => /^\s*USER\s+root\b/i.test(l));

      if (explicitRootIndex !== -1) {
        findings.push({
          id: `cfg-docker-root-${explicitRootIndex + 1}`,
          type: "configuration",
          severity: "high",
          confidence: 90,
          title: "Dockerfile Explicitly Runs as Root",
          description: "Container explicitly declares `USER root` for final execution.",
          whyItMatters:
            "Processes running as root inside containers have greater opportunity for container-escape exploits and uninhibited filesystem tampering.",
          remediation:
            "Create a dedicated unprivileged user (e.g. `RUN adduser -D appuser && USER appuser`) before executing entrypoints.",
          file: filePath,
          line: explicitRootIndex + 1,
          evidence: {
            pattern: "USER root",
            redactedCode: `${explicitRootIndex + 1} | ${lines[explicitRootIndex]}`,
          },
        });
      } else if (!hasUserDirective && lines.length > 5) {
        findings.push({
          id: `cfg-docker-no-user`,
          type: "configuration",
          severity: "medium",
          confidence: 80,
          title: "Dockerfile Missing Non-Root USER Directive",
          description: "Container does not specify a non-root USER, defaulting to root execution.",
          whyItMatters:
            "Running containers without a non-root user violates least-privilege security controls.",
          remediation:
            "Add a non-root user creation step and specify `USER <username>` near the end of the Dockerfile.",
          file: filePath,
          line: 1,
        });
      }

      // Check for curl | sh in Dockerfile
      const curlShIndex = lines.findIndex((l) => /curl\s+[^|]+\|\s*(ba|z)?sh/i.test(l));
      if (curlShIndex !== -1) {
        findings.push({
          id: `cfg-docker-curlsh-${curlShIndex + 1}`,
          type: "configuration",
          severity: "high",
          confidence: 92,
          title: "Piped Shell Script Execution (curl | sh)",
          description: "Piping an unverified remote script from curl directly into a shell interpreter.",
          whyItMatters:
            "Piped remote scripts can be tampered with via MITM, DNS poisoning, or upstream compromise without integrity verification.",
          remediation:
            "Download scripts, verify their SHA-256 checksums explicitly, and then execute.",
          file: filePath,
          line: curlShIndex + 1,
          evidence: {
            pattern: "CURL_PIPE_SHELL",
            redactedCode: `${curlShIndex + 1} | ${lines[curlShIndex].trim()}`,
          },
        });
      }

      return findings;
    },
  },

  // 3. GitHub Actions Workflows
  {
    id: "CFG-GHA-PERMS",
    name: "GitHub Actions Insecure Configuration",
    severity: "high",
    confidence: 90,
    appliesTo: (path) => path.includes(".github/workflows/") && (path.endsWith(".yml") || path.endsWith(".yaml")),
    evaluate: (filePath, content) => {
      const findings: Finding[] = [];
      const lines = content.split("\n");

      // Check for write-all permissions
      const writeAllIdx = lines.findIndex((l) => /permissions:\s*write-all/i.test(l));
      if (writeAllIdx !== -1) {
        findings.push({
          id: `cfg-gha-writeall-${writeAllIdx + 1}`,
          type: "configuration",
          severity: "high",
          confidence: 95,
          title: "Overly Permissive Workflow Permissions (write-all)",
          description: "GitHub Actions workflow explicitly requests broad `write-all` token permissions.",
          whyItMatters:
            "If a compromised action or vulnerable pull request step runs under write-all, attackers can tamper with repository releases, contents, and issues.",
          remediation:
            "Principle of least privilege: explicitly declare only required permissions (e.g., `permissions: contents: read`).",
          file: filePath,
          line: writeAllIdx + 1,
          evidence: {
            pattern: "permissions: write-all",
            redactedCode: `${writeAllIdx + 1} | ${lines[writeAllIdx].trim()}`,
          },
        });
      }

      // Check for pull_request_target with checkout of PR head
      const hasPRTarget = lines.some((l) => /pull_request_target/i.test(l));
      const hasHeadCheckout = lines.some((l) => /ref:\s*(\${{\s*github\.event\.pull_request\.head\.sha\s*}}|\$\{\{\s*github\.head_ref\s*}})/i.test(l));
      if (hasPRTarget && hasHeadCheckout) {
        findings.push({
          id: `cfg-gha-pr-target-pwn`,
          type: "configuration",
          severity: "critical",
          confidence: 94,
          title: "Dangerous pull_request_target with Untrusted Checkout",
          description: "Workflow combines `pull_request_target` trigger with checking out untrusted PR head commit.",
          whyItMatters:
            "This pattern allows malicious pull requests from forks to execute arbitrary code with read/write secrets and permissions of the base repository.",
          remediation:
            "Use `pull_request` trigger instead, or do not checkout untrusted PR code in workflows that have access to secrets.",
          file: filePath,
          line: 1,
        });
      }

      return findings;
    },
  },

  // 4. Overly Permissive CORS Wildcard
  {
    id: "CFG-CORS-WILDCARD",
    name: "Wildcard CORS Configuration",
    severity: "medium",
    confidence: 85,
    appliesTo: (path) => /\.(ts|js|jsx|tsx|py|go|rb|php|json)$/i.test(path),
    evaluate: (filePath, content) => {
      const lines = content.split("\n");
      const findings: Finding[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          (/Access-Control-Allow-Origin/i.test(line) && line.includes("*")) ||
          (/origin:\s*["']\*["']/i.test(line) && /cors/i.test(content))
        ) {
          // Check if credentials are also enabled
          const hasCredentials = content.includes("credentials: true") || /Allow-Credentials:\s*true/i.test(content);
          findings.push({
            id: `cfg-cors-${i + 1}`,
            type: "configuration",
            severity: hasCredentials ? "high" : "medium",
            confidence: 85,
            title: hasCredentials ? "CORS Wildcard with Credentials Allowed" : "Permissive CORS Wildcard (Access-Control-Allow-Origin: *)",
            description: "Cross-Origin Resource Sharing is configured to allow requests from any external origin (*).",
            whyItMatters:
              "Wildcard CORS policies permit external third-party sites to execute API calls from victim browsers without origin validation.",
            remediation:
              "Restrict allowed origins to trusted domain names or an explicit whitelist rather than a universal wildcard (*).",
            file: filePath,
            line: i + 1,
            evidence: {
              pattern: "CORS_WILDCARD",
              redactedCode: `${i + 1} | ${line.trim()}`,
            },
          });
          break; // Avoid spamming multiple identical CORS lines in same file
        }
      }

      return findings;
    },
  },

  // 5. Insecure TLS / SSL Rejection Disabled
  {
    id: "CFG-TLS-DISABLE",
    name: "Disabled SSL/TLS Certificate Verification",
    severity: "high",
    confidence: 95,
    appliesTo: (path) => /\.(ts|js|py|go|rb|php)$/i.test(path),
    evaluate: (filePath, content) => {
      const lines = content.split("\n");
      const findings: Finding[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (
          /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]0['"]/i.test(line) ||
          /rejectUnauthorized:\s*false/i.test(line) ||
          /verify\s*=\s*False\b/i.test(line) ||
          /InsecureSkipVerify:\s*true\b/i.test(line)
        ) {
          findings.push({
            id: `cfg-tls-${i + 1}`,
            type: "configuration",
            severity: "high",
            confidence: 95,
            title: "SSL/TLS Certificate Verification Disabled",
            description: "Application configuration explicitly disables cryptographic certificate verification.",
            whyItMatters:
              "Disabling TLS verification exposes outbound network traffic and API credentials to trivial Man-In-The-Middle (MITM) interception.",
            remediation:
              "Always enable TLS certificate verification in production. Install custom CA roots if communicating with internal private endpoints.",
            file: filePath,
            line: i + 1,
            evidence: {
              pattern: "TLS_VERIFICATION_DISABLED",
              redactedCode: `${i + 1} | ${line.trim()}`,
            },
          });
        }
      }

      return findings;
    },
  },

  // 6. Production Debug Mode Enabled
  {
    id: "CFG-DEBUG-ENABLED",
    name: "Production Debug Mode Enabled",
    severity: "medium",
    confidence: 80,
    appliesTo: (path) => /(settings|config|production|prod)\.(py|json|yml|yaml|ts|js)$/i.test(path),
    evaluate: (filePath, content) => {
      const lines = content.split("\n");
      const findings: Finding[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/^\s*DEBUG\s*=\s*True\b/i.test(line) || /^\s*debug:\s*true\b/i.test(line)) {
          findings.push({
            id: `cfg-debug-${i + 1}`,
            type: "configuration",
            severity: "medium",
            confidence: 82,
            title: "Debug Flag Active in Production/Global Configuration",
            description: "Configuration file contains `DEBUG = True` or `debug: true` setting.",
            whyItMatters:
              "Debug mode in web frameworks frequently leaks detailed stack traces, environment variables, internal code paths, and database queries in error responses.",
            remediation:
              "Set `DEBUG = False` by default and override only in local development via environment variables.",
            file: filePath,
            line: i + 1,
            evidence: {
              pattern: "DEBUG_TRUE",
              redactedCode: `${i + 1} | ${line.trim()}`,
            },
          });
          break;
        }
      }

      return findings;
    },
  },
];

export function scanContentForConfigIssues(filePath: string, content: string): Finding[] {
  const findings: Finding[] = [];
  for (const rule of CONFIG_RULES) {
    if (rule.appliesTo(filePath)) {
      const results = rule.evaluate(filePath, content);
      if (results && results.length > 0) {
        findings.push(...results);
      }
    }
  }
  return findings;
}
