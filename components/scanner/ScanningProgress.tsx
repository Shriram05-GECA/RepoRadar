"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Terminal, AlertCircle } from "lucide-react";

interface ScanningProgressProps {
  repoName: string;
  isCompleted: boolean;
  error?: string | null;
  onRetry?: () => void;
  onTryDemo?: () => void;
}

interface Step {
  id: string;
  label: string;
  detail: string;
}

const STEPS: Step[] = [
  {
    id: "metadata",
    label: "VALIDATING REPOSITORY METADATA",
    detail: "Resolving public GitHub repository branch, commit tree, and sizing",
  },
  {
    id: "tree",
    label: "BUILDING INTERNAL FILE TREE",
    detail: "Filtering vendor bundles, binaries, and prioritizing manifests",
  },
  {
    id: "secrets",
    label: "ANALYZING SECRETS & ENTROPY",
    detail: "Evaluating AWS, GitHub, Stripe, DB tokens and Shannon randomness",
  },
  {
    id: "dependencies",
    label: "CHECKING DEPENDENCIES (OSV)",
    detail: "Batch querying open vulnerability intelligence on OSV.dev",
  },
  {
    id: "config",
    label: "AUDITING CONFIGURATION & CI/CD",
    detail: "Evaluating Docker, GitHub Actions, and CORS security policies",
  },
  {
    id: "scoring",
    label: "CALCULATING RISK & POSTURE MAP",
    detail: "Severity-weighting, confidence scaling, and synthesizing treemap",
  },
];

export const ScanningProgress: React.FC<ScanningProgressProps> = ({
  repoName,
  isCompleted,
  error,
  onRetry,
  onTryDemo,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (error) return;
    if (isCompleted) {
      setCurrentStepIndex(STEPS.length);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 1100);

    return () => clearInterval(interval);
  }, [isCompleted, error]);

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-radar-surface/90 border border-radar-border rounded-xl shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-radar-border pb-4 mb-5">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-radar-lime block">
            SCAN ENGINE IN FLIGHT
          </span>
          <h3 className="text-base font-bold font-mono text-white truncate max-w-sm">
            {repoName || "GitHub Repository"}
          </h3>
        </div>
        {!error && !isCompleted && (
          <div className="relative w-8 h-8 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full border border-radar-lime/30 animate-ping" />
            <Loader2 className="w-5 h-5 text-radar-lime animate-spin" />
          </div>
        )}
      </div>

      {/* Error State */}
      {error ? (
        <div className="space-y-4 py-2">
          <div className="p-4 bg-radar-critical/10 border border-radar-critical/40 rounded-lg text-xs font-mono text-radar-critical space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              SCAN INTERRUPTED
            </div>
            <p className="text-gray-300 mt-1">{error}</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 py-2 px-4 rounded-lg bg-radar-elevated border border-radar-border text-white text-xs font-mono font-bold hover:bg-radar-border transition-colors"
              >
                RETRY SCAN
              </button>
            )}
            {onTryDemo && (
              <button
                onClick={onTryDemo}
                className="flex-1 py-2 px-4 rounded-lg bg-radar-lime text-black text-xs font-mono font-bold hover:bg-opacity-90 transition-opacity"
              >
                EXPLORE DEMO REPO
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Stepper Sequence */
        <div className="space-y-3.5 font-mono text-xs">
          {STEPS.map((step, idx) => {
            const isDone = isCompleted || idx < currentStepIndex;
            const isCurrent = !isCompleted && idx === currentStepIndex;
            const isPending = !isCompleted && idx > currentStepIndex;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 transition-opacity ${
                  isPending ? "opacity-35" : "opacity-100"
                }`}
              >
                {/* Step indicator */}
                <div className="mt-0.5 flex-shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-radar-lime" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-radar-lime animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-radar-border bg-radar-bg" />
                  )}
                </div>

                {/* Step details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold ${
                        isDone
                          ? "text-gray-300"
                          : isCurrent
                          ? "text-radar-lime font-bold"
                          : "text-radar-textSubtle"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-radar-textSubtle uppercase">
                      {isDone ? "COMPLETE" : isCurrent ? "IN PROGRESS" : "QUEUED"}
                    </span>
                  </div>
                  <p className="text-[11px] text-radar-textSubtle mt-0.5 truncate">
                    {step.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Terminal Footer */}
      <div className="mt-6 pt-3 border-t border-radar-border/80 flex items-center justify-between text-[10px] font-mono text-radar-textSubtle">
        <span className="flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-radar-lime" />
          Deterministic Sandbox Analysis
        </span>
        <span>No repository code is executed</span>
      </div>
    </div>
  );
};
