"use client";

import React, { useState, useMemo } from "react";
import { Finding, FindingStatus, Severity } from "@/types/finding";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Key,
  Package,
  Settings,
  Search,
  Filter,
  ArrowRight,
  X,
  FileCode,
} from "lucide-react";

interface FindingPanelProps {
  findings: Finding[];
  selectedFile: string | null;
  onClearSelectedFile: () => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onSelectFinding: (finding: Finding) => void;
  mode?: "map" | "fix";
  findingStatuses?: Record<string, FindingStatus>;
  onFixFinding?: (finding: Finding) => void;
}

const FILTERS = [
  { id: "ALL", label: "ALL" },
  { id: "CRITICAL", label: "CRITICAL" },
  { id: "HIGH", label: "HIGH" },
  { id: "MEDIUM", label: "MEDIUM" },
  { id: "LOW", label: "LOW" },
  { id: "SECRETS", label: "SECRETS" },
  { id: "DEPENDENCIES", label: "DEPS" },
  { id: "CONFIGURATION", label: "CONFIG" },
];

export const FindingPanel: React.FC<FindingPanelProps> = ({
  findings,
  selectedFile,
  onClearSelectedFile,
  activeFilter,
  onFilterChange,
  onSelectFinding,
  mode = "map",
  findingStatuses = {},
  onFixFinding,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      // File filter
      if (selectedFile && f.file !== selectedFile) {
        return false;
      }

      // Category / Severity filter
      if (activeFilter !== "ALL") {
        if (activeFilter === "SECRETS" && f.type !== "secret") return false;
        if (activeFilter === "DEPENDENCIES" && f.type !== "dependency") return false;
        if (activeFilter === "CONFIGURATION" && f.type !== "configuration") return false;

        const sevLevels = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
        if (sevLevels.includes(activeFilter)) {
          if (f.severity !== activeFilter.toLowerCase()) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = f.title.toLowerCase().includes(q);
        const matchFile = (f.file || "").toLowerCase().includes(q);
        const matchDesc = f.description.toLowerCase().includes(q);
        const matchVuln = (f.vulnerabilityId || "").toLowerCase().includes(q);
        if (!matchTitle && !matchFile && !matchDesc && !matchVuln) return false;
      }

      return true;
    });
  }, [findings, selectedFile, activeFilter, searchQuery]);

  const getSeverityBadge = (sev: Severity) => {
    switch (sev) {
      case "critical":
        return {
          bg: "bg-radar-critical/20 border-radar-critical text-radar-critical",
          icon: ShieldAlert,
          label: "CRITICAL",
        };
      case "high":
        return {
          bg: "bg-radar-high/20 border-radar-high text-radar-high",
          icon: ShieldAlert,
          label: "HIGH",
        };
      case "medium":
        return {
          bg: "bg-radar-medium/20 border-radar-medium text-radar-medium",
          icon: AlertTriangle,
          label: "MEDIUM",
        };
      case "low":
        return {
          bg: "bg-radar-low/20 border-radar-low text-radar-low",
          icon: Info,
          label: "LOW",
        };
      default:
        return {
          bg: "bg-radar-info/20 border-radar-info text-radar-info",
          icon: Info,
          label: "INFO",
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "secret":
        return <Key className="w-3.5 h-3.5 text-radar-critical" />;
      case "dependency":
        return <Package className="w-3.5 h-3.5 text-radar-high" />;
      default:
        return <Settings className="w-3.5 h-3.5 text-radar-medium" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-radar-surface/60 border border-radar-border rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-radar-border bg-radar-surface/90 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white tracking-tight">
              SECURITY FINDINGS
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-radar-elevated text-radar-lime border border-radar-border">
              {filteredFindings.length}
            </span>
          </div>

          {selectedFile && (
            <button
              onClick={onClearSelectedFile}
              className="flex items-center gap-1 text-[11px] font-mono text-radar-lime hover:underline bg-radar-lime/10 px-2 py-0.5 rounded border border-radar-lime/30"
            >
              <FileCode className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{selectedFile.split("/").pop()}</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-radar-textSubtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search findings, files, CVEs..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-radar-bg border border-radar-border text-xs font-mono text-white placeholder-radar-textSubtle focus:outline-none focus:border-radar-lime transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-radar-textSubtle hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono scrollbar-none">
          {FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={`px-2 py-1 rounded whitespace-nowrap transition-all border ${
                activeFilter === tab.id
                  ? "bg-radar-lime text-black font-bold border-radar-lime shadow-sm"
                  : "bg-radar-elevated text-radar-textMuted border-radar-border hover:border-radar-borderBright"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredFindings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center p-4 text-radar-textMuted">
            {findings.length === 0 ? (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-mono text-sm font-bold text-white">
                  Repository Clean
                </h4>
                <p className="text-xs font-mono text-gray-400 max-w-xs leading-relaxed">
                  No secrets, known vulnerable dependencies, or insecure configs detected.
                </p>
              </div>
            ) : (
              <div>
                <Filter className="w-8 h-8 mb-2 text-radar-textSubtle stroke-[1.5] mx-auto" />
                <p className="text-xs font-mono">No findings match &ldquo;{activeFilter}&rdquo;.</p>
                <button
                  onClick={() => {
                    onFilterChange("ALL");
                    onClearSelectedFile();
                    setSearchQuery("");
                  }}
                  className="mt-2 text-xs font-mono text-radar-lime hover:underline"
                >
                  View all {findings.length} findings
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredFindings.map((finding) => {
            const badge = getSeverityBadge(finding.severity);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={finding.id}
                onClick={() => {
                  onSelectFinding(finding);
                  if (mode === "fix") onFixFinding?.(finding);
                }}
                className="group p-3 rounded-lg bg-radar-elevated/70 border border-radar-border hover:border-radar-borderBright hover:bg-radar-elevated transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                {/* Severity & Category header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${badge.bg}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-radar-textSubtle uppercase">
                      {getTypeIcon(finding.type)}
                      {finding.type}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-radar-textSubtle">
                    {finding.confidence}% CONF
                  </span>
                </div>

                {/* Finding Title */}
                <h4 className="text-xs font-bold text-white group-hover:text-radar-lime transition-colors line-clamp-1">
                  {finding.title}
                </h4>

                {/* File location */}
                {finding.file && (
                  <p className="text-[11px] font-mono text-radar-textMuted truncate mt-1">
                    {finding.file}
                    {finding.line ? `:${finding.line}` : ""}
                  </p>
                )}

                {/* Description snippet */}
                <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                  {finding.description}
                </p>

                {/* Remediation preview */}
                <div className="mt-2 pt-2 border-t border-radar-border/60 flex items-center justify-between text-[11px]">
                  <span className="text-radar-lime font-mono text-[10px] truncate max-w-[200px]">
                    Fix: {finding.remediation.slice(0, 45)}...
                  </span>
                  <button onClick={(event) => { event.stopPropagation(); onFixFinding?.(finding); }} className="text-radar-lime hover:text-white flex items-center gap-0.5 text-[10px] font-mono font-bold transition-transform group-hover:translate-x-0.5">
                    FIX THIS <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="mt-1 text-[9px] font-mono text-radar-textSubtle">{findingStatuses[finding.id] ? findingStatuses[finding.id].replace("_", " ").toUpperCase() : "OPEN"}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
