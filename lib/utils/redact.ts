/**
 * Securely masks a secret string while preserving recognizable prefix/suffix where possible.
 * Guarantees that at least 60-80% of the middle characters are masked with bullets (•).
 */
export function redactSecret(secret: string): string {
  if (!secret) return "";
  const trimmed = secret.trim();
  const len = trimmed.length;

  if (len <= 4) {
    return "••••";
  }

  if (len <= 8) {
    return trimmed.slice(0, 1) + "••••" + trimmed.slice(-1);
  }

  // Common prefix lengths like ghp_, akia_, sk_live_
  let prefixLen = 4;
  if (trimmed.startsWith("sk_live_")) prefixLen = 8;
  else if (trimmed.startsWith("ghp_") || trimmed.startsWith("gho_")) prefixLen = 4;
  else if (trimmed.startsWith("github_pat_")) prefixLen = 11;
  else if (trimmed.startsWith("xoxb-") || trimmed.startsWith("xoxp-")) prefixLen = 5;

  // Ensure prefix doesn't exceed 25% of string if long, or at least 2 chars
  prefixLen = Math.min(prefixLen, Math.floor(len / 3));
  const suffixLen = Math.min(2, Math.max(1, Math.floor(len / 5)));
  const maskLen = Math.max(4, len - prefixLen - suffixLen);

  const prefix = trimmed.slice(0, prefixLen);
  const suffix = trimmed.slice(len - suffixLen);

  return `${prefix}${"•".repeat(maskLen)}${suffix}`;
}

/**
 * Redacts all occurrences of a raw secret within a code snippet or evidence line.
 */
export function redactSnippet(snippet: string, rawSecret: string): string {
  if (!snippet || !rawSecret) return snippet || "";
  const redacted = redactSecret(rawSecret);
  // Redact exact match
  return snippet.split(rawSecret).join(redacted);
}
