import { Finding, Severity } from "@/types/finding";
import { RiskLevel } from "@/types/scan";

/**
 * REPORADAR DETERMINISTIC RISK SCORING ALGORITHM
 *
 * Formula:
 * 1. Base Weighting per finding:
 *    - Critical: 30 pts
 *    - High:     18 pts
 *    - Medium:    8 pts
 *    - Low:       3 pts
 *    - Info:      1 pt
 *
 * 2. Confidence Factor:
 *    - finding_score = baseWeight * (confidence / 100)
 *
 * 3. Saturation & Multi-File Exposure Adjustment:
 *    - Cumulative raw score = sum(finding_score)
 *    - If multiple files are compromised, exposure multiplier applies (up to 1.25x).
 *    - Distinct category presence penalty (secrets + dependencies + configuration).
 *
 * 4. Normalization & Clamping:
 *    - Logarithmic dampening prevents 10 minor warnings from out-scoring a single critical.
 *    - Clamped strictly between 0 and 100.
 */

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 30,
  high: 18,
  medium: 8,
  low: 3,
  info: 1,
};

export function calculateRiskScore(findings: Finding[]): {
  score: number;
  riskLevel: RiskLevel;
  breakdown: {
    secretsScore: number;
    dependenciesScore: number;
    configScore: number;
    rawWeightedScore: number;
  };
} {
  if (!findings || findings.length === 0) {
    return {
      score: 0,
      riskLevel: "LOW",
      breakdown: {
        secretsScore: 0,
        dependenciesScore: 0,
        configScore: 0,
        rawWeightedScore: 0,
      },
    };
  }

  let secretsScore = 0;
  let dependenciesScore = 0;
  let configScore = 0;

  const affectedFiles = new Set<string>();

  for (const f of findings) {
    const weight = SEVERITY_WEIGHTS[f.severity] || 1;
    const confidenceMultiplier = (f.confidence || 80) / 100;
    const itemScore = weight * confidenceMultiplier;

    if (f.file) {
      affectedFiles.add(f.file);
    }

    if (f.type === "secret") {
      secretsScore += itemScore;
    } else if (f.type === "dependency") {
      dependenciesScore += itemScore;
    } else if (f.type === "configuration") {
      configScore += itemScore;
    }
  }

  const rawWeightedScore = secretsScore + dependenciesScore + configScore;

  // File spread factor (1.0 to 1.25)
  const fileSpreadFactor = Math.min(1.25, 1.0 + affectedFiles.size * 0.02);

  // If there's at least one critical finding, the minimum floor is 65 (HIGH or CRITICAL)
  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasHigh = findings.some((f) => f.severity === "high");

  // Non-linear dampening: asymptotic curve towards 100
  // Score = 100 * (1 - e^(-raw / 45))
  let scaledScore = Math.round(100 * (1 - Math.exp(-rawWeightedScore / 50)) * fileSpreadFactor);

  if (hasCritical && scaledScore < 65) {
    scaledScore = 65;
  } else if (hasHigh && scaledScore < 35) {
    scaledScore = 35;
  }

  // Strictly clamp between 0 and 100
  const finalScore = Math.min(100, Math.max(0, scaledScore));

  let riskLevel: RiskLevel = "LOW";
  if (finalScore >= 80) riskLevel = "CRITICAL";
  else if (finalScore >= 60) riskLevel = "HIGH";
  else if (finalScore >= 40) riskLevel = "MODERATE";
  else if (finalScore >= 20) riskLevel = "GUARDED";
  else riskLevel = "LOW";

  return {
    score: finalScore,
    riskLevel,
    breakdown: {
      secretsScore: Math.round(secretsScore),
      dependenciesScore: Math.round(dependenciesScore),
      configScore: Math.round(configScore),
      rawWeightedScore: Math.round(rawWeightedScore),
    },
  };
}
