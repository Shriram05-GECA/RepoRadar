import { Finding } from "@/types/finding";

export interface RemediationPlan {
  summary: string;
  steps: Array<{ title: string; detail: string; providerUrl?: string }>;
  before?: string;
  after?: string;
  copyText?: string;
}

const secretKind = (finding: Finding) => {
  const value = `${finding.title} ${finding.evidence?.pattern || ""}`.toLowerCase();
  if (value.includes("aws")) return { name: "AWS", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html", env: "process.env.AWS_ACCESS_KEY_ID" };
  if (value.includes("stripe")) return { name: "Stripe", url: "https://docs.stripe.com/keys", env: "process.env.STRIPE_SECRET_KEY" };
  if (value.includes("github")) return { name: "GitHub", url: "https://docs.github.com/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens", env: "process.env.GITHUB_TOKEN" };
  if (value.includes("database") || value.includes("connection")) return { name: "database", env: "process.env.DATABASE_URL" };
  return { name: "provider", env: "process.env.API_KEY" };
};

export function getRemediationPlan(finding: Finding): RemediationPlan {
  if (finding.type === "dependency") {
    const packageName = finding.package?.name || "the affected package";
    const fixed = finding.fixedVersion;
    const command = fixed ? `npm install ${packageName}@${fixed}` : `npm update ${packageName}`;
    return {
      summary: `This installed dependency has a reported vulnerability. Upgrade only after reviewing compatibility and the linked advisory.`,
      steps: [
        { title: "REVIEW THE ADVISORY", detail: `${finding.vulnerabilityId || "The advisory"} describes the affected versions and conditions.` },
        { title: "UPGRADE THE PACKAGE", detail: fixed ? `Upgrade ${packageName} to ${fixed} or a later compatible release.` : `Upgrade ${packageName} to a release that the advisory identifies as fixed.` },
        { title: "VERIFY", detail: "Re-run RepoRadar after updating the lockfile to confirm the vulnerability is no longer detected." },
      ],
      before: `${packageName}: "${finding.package?.version || "installed version"}"`,
      after: fixed ? `${packageName}: "${fixed}"` : `${packageName}: "<secure version>"`,
      copyText: command,
    };
  }
  if (finding.type === "configuration") {
    const unsafe = finding.evidence?.pattern || "risky configuration";
    const safe = unsafe.includes("write-all") ? "permissions:\n  contents: read" : unsafe.includes("USER root") ? "RUN adduser -D appuser\nUSER appuser" : unsafe.includes("debug: true") ? "debug: false" : "# Apply the least-privilege configuration required by this service";
    return {
      summary: "This configuration grants broader access or exposes more runtime detail than is generally needed.",
      steps: [
        { title: "REVIEW THE DETECTED CONFIGURATION", detail: "Confirm the setting is required for this workflow or runtime." },
        { title: "APPLY LEAST PRIVILEGE", detail: "Replace the broad setting with the smallest supported permission or safer runtime configuration." },
        { title: "VERIFY", detail: "Re-run RepoRadar to confirm the risky configuration is no longer detected." },
      ], before: unsafe, after: safe, copyText: safe,
    };
  }
  const provider = secretKind(finding);
  return {
    summary: `This credential appears to be embedded in source code. Anyone with access to the repository may potentially use it to access associated ${provider.name} resources.`,
    steps: [
      { title: "ROTATE OR REVOKE THE CREDENTIAL", detail: `Disable the exposed credential through ${provider.name} before relying on source changes.`, providerUrl: provider.url },
      { title: "MOVE IT OUT OF SOURCE CODE", detail: "Use an environment variable or a supported secrets manager; never copy the detected value into a replacement." },
      { title: "REMOVE THE SECRET", detail: "Remove it from this file. If it was committed, review repository history separately because a current-file edit does not remove historical copies." },
      { title: "VERIFY", detail: "Run RepoRadar again and confirm that the finding is no longer detected." },
    ],
    before: 'const credential = "••••••••••••";', after: `const credential = ${provider.env};`, copyText: `const credential = ${provider.env};`,
  };
}
