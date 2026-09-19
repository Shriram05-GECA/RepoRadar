import { Severity } from "@/types/finding";

export interface SecretRule {
  id: string;
  name: string;
  severity: Severity;
  baseConfidence: number;
  pattern: RegExp;
  extractMatch?: (match: RegExpExecArray) => string | null;
  description: string;
  whyItMatters: string;
  remediation: string;
}

export const SECRET_RULES: SecretRule[] = [
  {
    id: "SEC-AWS-001",
    name: "AWS Access Key ID",
    severity: "critical",
    baseConfidence: 95,
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    description: "Unencrypted AWS Access Key ID detected in code.",
    whyItMatters:
      "Exposed AWS credentials allow unauthorized actors to manipulate cloud resources, exfiltrate private data, or incur massive infrastructure costs.",
    remediation:
      "Revoke this access key immediately in AWS IAM, issue a new key, and inject credentials via environment variables or AWS Secrets Manager.",
  },
  {
    id: "SEC-AWS-002",
    name: "AWS Secret Access Key",
    severity: "critical",
    baseConfidence: 90,
    pattern: /(?:aws_secret_access_key|aws_secret_key|secret_key|aws_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    extractMatch: (m) => m[1],
    description: "Hardcoded AWS Secret Access Key detected.",
    whyItMatters:
      "Coupled with an Access Key, a Secret Access Key grants programmatic access to all authorized AWS API actions.",
    remediation:
      "Deactivate the corresponding IAM key pair, review CloudTrail logs for unauthorized actions, and utilize IAM Roles (IRSA or EC2 Instance Profiles).",
  },
  {
    id: "SEC-GH-001",
    name: "GitHub Personal Access Token",
    severity: "critical",
    baseConfidence: 98,
    pattern: /\b(ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36})\b/g,
    description: "Active GitHub Personal Access Token or OAuth Token detected.",
    whyItMatters:
      "Exposing a GitHub token can grant attackers read/write access to source code repositories, workflow runs, package registries, and organizational settings.",
    remediation:
      "Revoke the token immediately via GitHub Settings -> Developer settings -> Personal access tokens. Check repository audit logs for anomalous activity.",
  },
  {
    id: "SEC-KEY-001",
    name: "Private Cryptographic Key",
    severity: "critical",
    baseConfidence: 100,
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    description: "Unencrypted private cryptographic key block committed to repository.",
    whyItMatters:
      "Private keys allow decrypting sensitive communications, forging digital signatures, or gaining direct SSH access to servers and infrastructure.",
    remediation:
      "Regenerate and replace the public/private key pair on all servers and services. Remove the key file and rewrite Git history if published to a public repository.",
  },
  {
    id: "SEC-STRIPE-001",
    name: "Stripe Secret API Key",
    severity: "critical",
    baseConfidence: 96,
    pattern: /\b(sk_live_[0-9a-zA-Z]{24,99}|rk_live_[0-9a-zA-Z]{24,99})\b/g,
    description: "Live Stripe Secret or Restricted API Key detected.",
    whyItMatters:
      "Live Stripe keys permit executing charges, issuing unauthorized refunds, reading customer transaction details, and exporting banking information.",
    remediation:
      "Roll the affected key immediately in the Stripe Dashboard under Developers -> API keys. Audit recent transactions for fraudulent activity.",
  },
  {
    id: "SEC-SLACK-001",
    name: "Slack API Token",
    severity: "high",
    baseConfidence: 95,
    pattern: /\b(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,34}|xox[baprs]-[a-zA-Z0-9]{20,40})\b/g,
    description: "Slack Bot, App, or User Token detected.",
    whyItMatters:
      "Slack tokens enable unauthorized reading and posting of workspace messages, exfiltrating internal discussions, or impersonating team members.",
    remediation:
      "Revoke the token in the Slack App settings console and regenerate bot credentials. Rotate shared channel webhooks.",
  },
  {
    id: "SEC-DB-001",
    name: "Database Connection String with Credentials",
    severity: "critical",
    baseConfidence: 94,
    pattern: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[a-zA-Z0-9_\-\.]+:(?:([^@\s:/?#]{4,}))@[a-zA-Z0-9\.\-]+/gi,
    extractMatch: (m) => m[1],
    description: "Database URI containing plaintext username and password credentials.",
    whyItMatters:
      "Direct database connection strings expose databases to immediate remote query execution, data exfiltration, ransomware, or drop-table destruction.",
    remediation:
      "Change the database user password immediately. Store connection strings in server environment variables or a secrets manager, and configure IP allowlists.",
  },
  {
    id: "SEC-JWT-001",
    name: "JSON Web Token (JWT)",
    severity: "medium",
    baseConfidence: 85,
    pattern: /\beyJ[A-Za-z0-9-_=]{10,}\.eyJ[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_.+/=]{10,}\b/g,
    description: "Hardcoded JSON Web Token detected in source code.",
    whyItMatters:
      "Committed JWTs may belong to administrative accounts or service identities, granting unintended session access if not expired.",
    remediation:
      "Invalidate token sessions on the identity provider or auth server, and use mock tokens with synthetic signatures strictly for unit tests.",
  },
  {
    id: "SEC-GEN-001",
    name: "Generic Secret Assignment",
    severity: "high",
    baseConfidence: 80,
    pattern: /(?:api[_-]?key|auth[_-]?token|access[_-]?token|secret[_-]?key|client[_-]?secret)\s*[:=]\s*["']([a-zA-Z0-9_\-\.]{20,80})["']/gi,
    extractMatch: (m) => m[1],
    description: "Potentially sensitive authentication credential assigned in code.",
    whyItMatters:
      "Hardcoding secrets in repositories exposes private API interfaces to unauthorized consumers and creates maintenance debt.",
    remediation:
      "Migrate credential extraction to runtime environment variables (`process.env.SECRET_KEY`) or secret management infrastructure.",
  },
];
