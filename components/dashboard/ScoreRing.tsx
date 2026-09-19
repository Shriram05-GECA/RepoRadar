"use client";

import React, { useEffect, useState } from "react";
import { RiskLevel } from "@/types/scan";
import { ShieldAlert, ShieldCheck, Shield, AlertTriangle } from "lucide-react";

interface ScoreRingProps {
  score: number;
  riskLevel: RiskLevel;
  categoryCounts: {
    secrets: number;
    dependencies: number;
    configuration: number;
  };
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  reducedMotion?: boolean;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  riskLevel,
  categoryCounts,
  activeFilter,
  onFilterChange,
  reducedMotion = false,
}) => {
  const [displayedScore, setDisplayedScore] = useState(reducedMotion ? score : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayedScore(score);
      return;
    }

    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayedScore(Math.round(score * ease));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, reducedMotion]);

  // Color mappings
  const getColor = () => {
    switch (riskLevel) {
      case "CRITICAL":
        return { stroke: "#FF2B44", text: "text-radar-critical", border: "border-radar-critical" };
      case "HIGH":
        return { stroke: "#FF2E93", text: "text-radar-high", border: "border-radar-high" };
      case "MODERATE":
        return { stroke: "#FF9100", text: "text-radar-medium", border: "border-radar-medium" };
      case "GUARDED":
        return { stroke: "#3D5AFE", text: "text-radar-info", border: "border-radar-info" };
      default:
        return { stroke: "#C6FF3D", text: "text-radar-lime", border: "border-radar-lime" };
    }
  };

  const colors = getColor();

  // SVG parameters
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center bg-radar-surface/80 border border-radar-border rounded-xl p-4 shadow-xl backdrop-blur-md">
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* SVG Ring */}
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 130 130">
          {/* Background circle track */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            stroke="#1D1D36"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Animated score circle */}
          <circle
            cx="65"
            cy="65"
            r={radius}
            stroke={colors.stroke}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: reducedMotion ? "none" : "stroke-dashoffset 0.1s linear",
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold tracking-tight font-display text-white">
            {displayedScore}
          </span>
          <span
            className={`text-[10px] font-bold tracking-widest uppercase mt-0.5 ${colors.text}`}
          >
            {riskLevel} RISK
          </span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 mt-3 w-full justify-center">
        <button
          onClick={() => onFilterChange?.(activeFilter === "SECRETS" ? "ALL" : "SECRETS")}
          className={`flex-1 py-1 px-2 rounded-lg text-xs font-mono transition-all flex flex-col items-center border ${
            activeFilter === "SECRETS"
              ? "bg-radar-critical/20 border-radar-critical text-radar-critical"
              : "bg-radar-elevated/80 border-radar-border hover:border-radar-borderBright text-radar-textMuted"
          }`}
          title="Filter secrets"
        >
          <span className="text-[9px] uppercase tracking-wider text-radar-textSubtle font-sans">
            Secrets
          </span>
          <span className="font-bold text-white text-sm">{categoryCounts.secrets}</span>
        </button>

        <button
          onClick={() => onFilterChange?.(activeFilter === "DEPENDENCIES" ? "ALL" : "DEPENDENCIES")}
          className={`flex-1 py-1 px-2 rounded-lg text-xs font-mono transition-all flex flex-col items-center border ${
            activeFilter === "DEPENDENCIES"
              ? "bg-radar-high/20 border-radar-high text-radar-high"
              : "bg-radar-elevated/80 border-radar-border hover:border-radar-borderBright text-radar-textMuted"
          }`}
          title="Filter dependency vulnerabilities"
        >
          <span className="text-[9px] uppercase tracking-wider text-radar-textSubtle font-sans">
            Deps
          </span>
          <span className="font-bold text-white text-sm">{categoryCounts.dependencies}</span>
        </button>

        <button
          onClick={() => onFilterChange?.(activeFilter === "CONFIGURATION" ? "ALL" : "CONFIGURATION")}
          className={`flex-1 py-1 px-2 rounded-lg text-xs font-mono transition-all flex flex-col items-center border ${
            activeFilter === "CONFIGURATION"
              ? "bg-radar-medium/20 border-radar-medium text-radar-medium"
              : "bg-radar-elevated/80 border-radar-border hover:border-radar-borderBright text-radar-textMuted"
          }`}
          title="Filter configuration findings"
        >
          <span className="text-[9px] uppercase tracking-wider text-radar-textSubtle font-sans">
            Config
          </span>
          <span className="font-bold text-white text-sm">{categoryCounts.configuration}</span>
        </button>
      </div>
    </div>
  );
};
