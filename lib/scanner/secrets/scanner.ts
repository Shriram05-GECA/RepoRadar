import { Finding } from "@/types/finding";
import { SECRET_RULES } from "./rules";
import { isCandidateSecretEntropy } from "./entropy";
import { redactSecret, redactSnippet } from "@/lib/utils/redact";

interface RawFindingMatch {
  rule: typeof SECRET_RULES[0];
  rawSecret: string;
  matchIndex: number;
}

export function scanContentForSecrets(filePath: string, content: string): Finding[] {
  if (!content) return [];

  const lines = content.split("\n");
  const rawMatches: RawFindingMatch[] = [];
  const allDiscoveredSecrets = new Set<string>();

  // 1. First pass: Collect all matches across rules
  for (const rule of SECRET_RULES) {
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.pattern.exec(content)) !== null) {
      const rawSecret = rule.extractMatch ? rule.extractMatch(match) : match[0];
      if (!rawSecret) continue;

      const lower = rawSecret.toLowerCase();
      if (
        lower.includes("example") ||
        lower.includes("placeholder") ||
        lower.includes("xxxx") ||
        lower.includes("your_key_here") ||
        lower.includes("replace_me") ||
        lower.includes("todo")
      ) {
        continue;
      }

      rawMatches.push({
        rule,
        rawSecret,
        matchIndex: match.index,
      });
      allDiscoveredSecrets.add(rawSecret);

      if (match.index === rule.pattern.lastIndex) {
        rule.pattern.lastIndex++;
      }
    }
  }

  // 2. High-Entropy Credential Variables pass
  const varAssignRegex = /(?:password|passwd|secret|token|credential|api_key)\s*[:=]\s*["']([^"'\s]{20,120})["']/gi;
  let varMatch: RegExpExecArray | null;
  interface EntropyMatch {
    rawVal: string;
    matchIndex: number;
  }
  const entropyMatches: EntropyMatch[] = [];

  while ((varMatch = varAssignRegex.exec(content)) !== null) {
    const rawVal = varMatch[1];
    if (isCandidateSecretEntropy(rawVal, 4.2)) {
      entropyMatches.push({
        rawVal,
        matchIndex: varMatch.index,
      });
      allDiscoveredSecrets.add(rawVal);
    }
  }

  // Helper to extract 3-5 lines of surrounding context with ALL file secrets redacted
  const getContextSnippet = (lineIdx: number) => {
    const start = Math.max(0, lineIdx - 2);
    const end = Math.min(lines.length - 1, lineIdx + 2);
    const snippetLines: string[] = [];

    for (let i = start; i <= end; i++) {
      const lineNum = (i + 1).toString().padStart(4, " ");
      let safeLine = lines[i];

      // Redact every known secret in this file from the line
      for (const s of allDiscoveredSecrets) {
        safeLine = redactSnippet(safeLine, s);
      }

      snippetLines.push(`${lineNum} | ${safeLine}`);
    }

    return snippetLines.join("\n");
  };

  const findings: Finding[] = [];

  // Generate structured findings from rule matches
  for (const item of rawMatches) {
    const prefix = content.slice(0, item.matchIndex);
    const lineIndex = prefix.split("\n").length - 1;
    const lineNum = lineIndex + 1;
    const lastNewline = prefix.lastIndexOf("\n");
    const columnNum = item.matchIndex - (lastNewline === -1 ? 0 : lastNewline + 1) + 1;

    const redactedEvidence = getContextSnippet(lineIndex);

    findings.push({
      id: `sec-${item.rule.id}-${lineNum}-${columnNum}`,
      type: "secret",
      severity: item.rule.severity,
      confidence: item.rule.baseConfidence,
      title: `${item.rule.name} Detected`,
      description: item.rule.description,
      whyItMatters: item.rule.whyItMatters,
      remediation: item.rule.remediation,
      file: filePath,
      line: lineNum,
      column: columnNum,
      evidence: {
        pattern: item.rule.id,
        redactedCode: redactedEvidence,
      },
    });
  }

  // Generate findings for entropy matches not covered by regex rules
  for (const item of entropyMatches) {
    const prefix = content.slice(0, item.matchIndex);
    const lineIndex = prefix.split("\n").length - 1;
    const lineNum = lineIndex + 1;

    const alreadyFound = findings.some(
      (f) => f.file === filePath && f.line === lineNum
    );

    if (!alreadyFound) {
      const redacted = getContextSnippet(lineIndex);
      findings.push({
        id: `sec-entropy-${lineNum}`,
        type: "secret",
        severity: "high",
        confidence: 82,
        title: "High-Entropy Credential Detected",
        description: "High Shannon entropy string detected inside a credential variable assignment.",
        whyItMatters:
          "High randomness in a variable labeled password/secret strongly suggests an active cryptographic key or production secret token.",
        remediation:
          "Extract this value into secure environment variables and ensure the value is not checked into version control.",
        file: filePath,
        line: lineNum,
        evidence: {
          pattern: "SHANNON_ENTROPY_KEY",
          redactedCode: redacted,
        },
      });
    }
  }

  return findings;
}
