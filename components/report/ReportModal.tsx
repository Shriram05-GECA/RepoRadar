"use client";

import React from "react";
import { ScanResult } from "@/types/scan";
import { formatBytes, formatDate, formatDuration } from "@/lib/utils/formatters";
import {
  Printer,
  Download,
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Lock,
  ExternalLink,
} from "lucide-react";

interface ReportModalProps {
  scanResult: ScanResult;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ scanResult, onClose }) => {
  const { repository, score, riskLevel, findings, categoryCounts } = scanResult;

  const criticalFindings = findings.filter((f) => f.severity === "critical");
  const highFindings = findings.filter((f) => f.severity === "high");
  const mediumFindings = findings.filter((f) => f.severity === "medium");

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    // Exclude full tree if large to keep report lightweight
    const reportData = {
      title: "RepoRadar Security Assessment Report",
      exportedAt: new Date().toISOString(),
      repository: scanResult.repository,
      score: scanResult.score,
      riskLevel: scanResult.riskLevel,
      metrics: {
        indexedFiles: scanResult.indexedFiles,
        analyzedFiles: scanResult.analyzedFiles,
        skippedFiles: scanResult.skippedFiles,
        dependenciesChecked: scanResult.dependenciesChecked,
        scanDurationMs: scanResult.scanDurationMs,
        truncated: scanResult.truncated,
      },
      categoryCounts: scanResult.categoryCounts,
      scanLimits: scanResult.scanLimits,
      findings: scanResult.findings.map((f) => ({
        id: f.id,
        title: f.title,
        type: f.type,
        severity: f.severity,
        confidence: f.confidence,
        file: f.file,
        line: f.line,
        description: f.description,
        whyItMatters: f.whyItMatters,
        remediation: f.remediation,
        vulnerabilityId: f.vulnerabilityId,
        references: f.references,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporadar-${repository.name}-security-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#0C0C16] border border-radar-border rounded-xl shadow-2xl flex flex-col overflow-hidden text-gray-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar (Hidden on print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-3.5 border-b border-radar-border bg-radar-surface/90">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-radar-lime" />
            <span className="font-mono text-sm font-bold text-white">
              SECURITY AUDIT REPORT
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-radar-elevated border border-radar-border text-xs font-mono text-white hover:bg-radar-border transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-radar-lime text-black text-xs font-mono font-bold hover:bg-opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-radar-textMuted hover:text-white rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 print:p-0 print:overflow-visible">
          {/* Header */}
          <div className="border-b border-radar-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-radar-lime uppercase tracking-widest mb-1">
                REPORADAR SECURITY ASSESSMENT
              </div>
              <h1 className="text-2xl font-bold font-display text-white">
                {repository.fullName}
              </h1>
              <p className="text-xs text-radar-textMuted mt-1">
                Default Branch: <span className="text-white font-mono">{repository.defaultBranch}</span> ·
                Language: <span className="text-white">{repository.language}</span> ·
                Scanned: <span className="text-white font-mono">{formatDate(new Date().toISOString())}</span>
              </p>
            </div>

            {/* Score Badge */}
            <div className="flex items-center gap-3 bg-radar-surface border border-radar-border px-4 py-2.5 rounded-xl">
              <div className="text-right font-mono">
                <span className="text-[10px] text-radar-textSubtle block uppercase">
                  Overall Score
                </span>
                <span className="text-xs font-bold text-radar-critical uppercase">
                  {riskLevel} RISK
                </span>
              </div>
              <div className="text-3xl font-black font-display text-white">
                {score}
              </div>
            </div>
          </div>

          {/* Scan Scope & Limitations */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-radar-surface/50 border border-radar-border rounded-lg">
              <span className="text-radar-textSubtle block text-[10px]">INDEXED FILES</span>
              <span className="text-base font-bold text-white">{scanResult.indexedFiles.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-radar-surface/50 border border-radar-border rounded-lg">
              <span className="text-radar-textSubtle block text-[10px]">ANALYZED FILES</span>
              <span className="text-base font-bold text-radar-lime">{scanResult.analyzedFiles.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-radar-surface/50 border border-radar-border rounded-lg">
              <span className="text-radar-textSubtle block text-[10px]">DEPENDENCIES</span>
              <span className="text-base font-bold text-white">{scanResult.dependenciesChecked.toLocaleString()}</span>
            </div>
            <div className="p-3 bg-radar-surface/50 border border-radar-border rounded-lg">
              <span className="text-radar-textSubtle block text-[10px]">SCAN DURATION</span>
              <span className="text-base font-bold text-white">{formatDuration(scanResult.scanDurationMs)}</span>
            </div>
          </div>

          {/* Scan Limitations Warning if partial */}
          {scanResult.scanLimits && scanResult.scanLimits.length > 0 && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                Coverage Disclosure & Partial Scan Notes:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-100/90 pl-1">
                {scanResult.scanLimits.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Finding Categories */}
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-lg bg-radar-critical/10 border border-radar-critical/30">
              <span className="text-radar-critical font-bold text-sm block">
                {categoryCounts.secrets} Secrets Exposed
              </span>
              <span className="text-radar-textSubtle text-[11px]">
                API tokens, keys, DB credentials
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-radar-high/10 border border-radar-high/30">
              <span className="text-radar-high font-bold text-sm block">
                {categoryCounts.dependencies} CVE / OSV Vulns
              </span>
              <span className="text-radar-textSubtle text-[11px]">
                Known library advisories
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-radar-medium/10 border border-radar-medium/30">
              <span className="text-radar-medium font-bold text-sm block">
                {categoryCounts.configuration} Misconfigurations
              </span>
              <span className="text-radar-textSubtle text-[11px]">
                Docker, CI/CD, CORS policies
              </span>
            </div>
          </div>

          {/* Critical & High Findings Detail */}
          <div className="space-y-4">
            <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider border-b border-radar-border pb-2 flex items-center justify-between">
              <span>Immediate Attention Required ({criticalFindings.length + highFindings.length} Items)</span>
              <span className="text-xs text-radar-textSubtle">Critical & High Severity</span>
            </h3>

            <div className="space-y-3">
              {[...criticalFindings, ...highFindings].map((f) => (
                <div
                  key={f.id}
                  className="p-4 bg-radar-surface/80 border border-radar-border rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase mb-1 ${
                          f.severity === "critical"
                            ? "bg-radar-critical/20 text-radar-critical border border-radar-critical/40"
                            : "bg-radar-high/20 text-radar-high border border-radar-high/40"
                        }`}
                      >
                        {f.severity} · {f.type}
                      </span>
                      <h4 className="font-bold text-sm text-white">{f.title}</h4>
                      {f.file && (
                        <p className="font-mono text-[11px] text-radar-textMuted mt-0.5">
                          {f.file}
                          {f.line ? `:${f.line}` : ""}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-radar-textSubtle whitespace-nowrap">
                      {f.confidence}% CONF
                    </span>
                  </div>

                  <p className="text-gray-300 leading-relaxed">{f.description}</p>

                  {f.evidence?.redactedCode && (
                    <div className="p-2.5 rounded bg-[#06060C] border border-radar-border font-mono text-[11px] text-gray-300">
                      <code>{f.evidence.redactedCode}</code>
                    </div>
                  )}

                  <div className="pt-2 border-t border-radar-border/60">
                    <span className="font-mono font-bold text-radar-lime text-[11px] block">
                      Recommended Remediation:
                    </span>
                    <p className="text-[11px] text-lime-200/90 font-mono mt-0.5">
                      {f.remediation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy & Methodology Footer */}
          <div className="border-t border-radar-border pt-6 text-[11px] font-mono text-radar-textSubtle space-y-1">
            <p>
              Privacy Notice: Public repository data was parsed in a stateless analysis sandbox. Detected credentials were masked via redaction filters and were not persisted.
            </p>
            <p>© 2026 RepoRadar Engine · Continuous Code Security & Threat Visualization</p>
          </div>
        </div>
      </div>
    </div>
  );
};
