/**
 * Calculates Shannon entropy of a string (in bits per symbol).
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const frequencies: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(frequencies)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

// Regex for common non-secret high-entropy tokens
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA_HASH_REGEX = /^(sha256-|sha512-|sha1-)?[a-f0-9]{32,64}$/i;
const BASE64_INTEGRITY_REGEX = /^sha(256|384|512)-[A-Za-z0-9+/=]{40,}$/;

/**
 * Checks if a string exhibits high entropy characteristic of private keys or tokens,
 * filtered against UUIDs, git hashes, package integrity strings, etc.
 */
export function isCandidateSecretEntropy(candidate: string, minEntropy = 4.2): boolean {
  if (!candidate || candidate.length < 16 || candidate.length > 256) {
    return false;
  }

  // Filter out UUIDs, lockfile hashes, hex hashes
  if (UUID_REGEX.test(candidate)) return false;
  if (SHA_HASH_REGEX.test(candidate)) return false;
  if (BASE64_INTEGRITY_REGEX.test(candidate)) return false;

  const entropy = calculateShannonEntropy(candidate);
  return entropy >= minEntropy;
}
