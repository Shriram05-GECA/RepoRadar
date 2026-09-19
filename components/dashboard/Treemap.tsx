"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { hierarchy, treemap as d3Treemap, HierarchyRectangularNode } from "d3-hierarchy";
import { RepoNode } from "@/types/repository";
import { Finding, Severity } from "@/types/finding";
import { formatBytes } from "@/lib/utils/formatters";
import { AlertCircle, FileCode, Folder, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";

interface TreemapProps {
  tree: RepoNode;
  findings: Finding[];
  selectedFile: string | null;
  onSelectFile: (filePath: string | null) => void;
  activeFilter?: string;
  reducedMotion?: boolean;
}

interface FlattenedLeaf {
  id: string;
  path: string;
  name: string;
  size: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  highestSeverity: Severity | "none";
  findingCount: number;
  hasMatchingFindings: boolean;
  findings: Finding[];
}

export const Treemap: React.FC<TreemapProps> = ({
  tree,
  findings,
  selectedFile,
  onSelectFile,
  activeFilter = "ALL",
  reducedMotion = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 650, height: 480 });
  const [hoveredLeaf, setHoveredLeaf] = useState<FlattenedLeaf | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isRendered, setIsRendered] = useState(false);

  // Resize observer to maintain bounded responsive treemap
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 50 && height > 50) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Findings indexed by file
  const findingsMap = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of findings) {
      if (f.file) {
        const list = map.get(f.file) || [];
        list.push(f);
        map.set(f.file, list);
      }
    }
    return map;
  }, [findings]);

  // Compute D3 Treemap layout with balanced non-linear sizing
  const leaves = useMemo(() => {
    if (!tree || dimensions.width <= 0 || dimensions.height <= 0) return [];

    const root = hierarchy<RepoNode>(tree)
      .sum((d) => {
        if (d.type !== "file") return 0;
        // Non-linear power scale ensures all files remain distinct and visible
        const rawSize = d.size || 1024;
        return Math.round(Math.pow(Math.max(rawSize, 400), 0.38) * 120);
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const treemapLayout = d3Treemap<RepoNode>()
      .size([dimensions.width, dimensions.height])
      .paddingOuter(4)
      .paddingTop(22)
      .paddingInner(3)
      .round(true);

    treemapLayout(root);

    const result: FlattenedLeaf[] = [];
    const allLeaves = root.leaves() as HierarchyRectangularNode<RepoNode>[];

    for (const leaf of allLeaves) {
      const nodeData = leaf.data;
      const fileFindings = findingsMap.get(nodeData.path) || [];

      // Check if this file has findings matching the active filter
      let hasMatchingFindings = true;
      if (activeFilter && activeFilter !== "ALL") {
        if (activeFilter === "SECRETS") {
          hasMatchingFindings = fileFindings.some((f) => f.type === "secret");
        } else if (activeFilter === "DEPENDENCIES") {
          hasMatchingFindings = fileFindings.some((f) => f.type === "dependency");
        } else if (activeFilter === "CONFIGURATION") {
          hasMatchingFindings = fileFindings.some((f) => f.type === "configuration");
        } else {
          // Severity filter
          const targetSev = activeFilter.toLowerCase();
          hasMatchingFindings = fileFindings.some((f) => f.severity === targetSev);
        }
      }

      result.push({
        id: nodeData.path,
        path: nodeData.path,
        name: nodeData.name,
        size: nodeData.size || 1024,
        x0: leaf.x0,
        x1: leaf.x1,
        y0: leaf.y0,
        y1: leaf.y1,
        highestSeverity: fileFindings.reduce<Severity | "none">((highest, finding) => {
          const rank = { none: 0, info: 1, low: 2, medium: 3, high: 4, critical: 5 };
          return rank[finding.severity] > rank[highest] ? finding.severity : highest;
        }, "none"),
        findingCount: fileFindings.length,
        hasMatchingFindings,
        findings: fileFindings,
      });
    }

    return result;
  }, [tree, dimensions, findingsMap, activeFilter]);

  // Trigger smooth reveal animation
  useEffect(() => {
    setIsRendered(false);
    const timer = setTimeout(() => {
      setIsRendered(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [tree]);

  // Color mapping per severity
  const getSeverityStyle = (severity: Severity | "none", isSelected: boolean, isDimmed: boolean) => {
    if (isDimmed) {
      return {
        fill: "#0F0F1E",
        border: "#1C1C36",
        glow: "",
        badgeBg: "bg-gray-800",
        textColor: "text-gray-500",
      };
    }

    switch (severity) {
      case "critical":
        return {
          fill: isSelected ? "#420D1B" : "#280A14",
          border: isSelected ? "#FF2B44" : "#FF2B44aa",
          glow: "animate-pulse-danger",
          badgeBg: "bg-radar-critical",
          textColor: "text-radar-critical",
        };
      case "high":
        return {
          fill: isSelected ? "#3E0D2B" : "#26081C",
          border: isSelected ? "#FF2E93" : "#FF2E93aa",
          glow: "glow-high",
          badgeBg: "bg-radar-high",
          textColor: "text-radar-high",
        };
      case "medium":
        return {
          fill: isSelected ? "#331B08" : "#201107",
          border: isSelected ? "#FF9100" : "#FF9100aa",
          glow: "",
          badgeBg: "bg-radar-medium",
          textColor: "text-radar-medium",
        };
      case "low":
        return {
          fill: isSelected ? "#062834" : "#081B24",
          border: isSelected ? "#00E5FF" : "#00E5FF88",
          glow: "",
          badgeBg: "bg-radar-low",
          textColor: "text-radar-low",
        };
      case "info":
        return {
          fill: isSelected ? "#0D1742" : "#09122C",
          border: isSelected ? "#3D5AFE" : "#3D5AFE88",
          glow: "",
          badgeBg: "bg-radar-info",
          textColor: "text-radar-info",
        };
      default:
        return {
          fill: isSelected ? "#1C1C38" : "#131326",
          border: isSelected ? "#C6FF3D" : "#25254A",
          glow: "",
          badgeBg: "bg-radar-surface",
          textColor: "text-radar-textSubtle",
        };
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-radar-surface/70 border border-radar-border rounded-xl overflow-hidden shadow-2xl backdrop-blur-md select-none flex flex-col"
      onMouseLeave={() => setHoveredLeaf(null)}
    >
      {/* Top Treemap Controls / Legend bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-radar-bg/95 border-b border-radar-border text-xs text-radar-textMuted backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-radar-lime" />
          <span className="font-mono text-white font-semibold text-[11px]">
            SECURITY TREEMAP
          </span>
          <span className="text-[10px] text-radar-textSubtle font-mono">
            ({leaves.length} {leaves.length === 1 ? "file" : "files"})
          </span>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-2.5 font-mono text-[9px]">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#131326] border border-[#25254A]" />
            <span>Clean</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-radar-low" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-radar-medium" />
            <span>Med</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-radar-high" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-radar-critical" />
            <span>Crit</span>
          </div>
        </div>
      </div>

      {/* When repository has only 1 file, render clean centered card instead of massive empty box */}
      {leaves.length === 1 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          {(() => {
            const single = leaves[0];
            const isSelected = selectedFile === single.path;
            const styles = getSeverityStyle(single.highestSeverity, isSelected, false);

            return (
              <div
                onClick={() => onSelectFile(isSelected ? null : single.path)}
                className={`w-full max-w-sm p-6 rounded-xl border transition-all cursor-pointer shadow-lg ${
                  isSelected ? "border-radar-lime ring-1 ring-radar-lime" : styles.glow
                }`}
                style={{ backgroundColor: styles.fill, borderColor: styles.border }}
              >
                <div className="w-12 h-12 rounded-xl bg-radar-surface/80 border border-radar-border flex items-center justify-center mx-auto mb-3">
                  <FileCode className="w-6 h-6 text-radar-lime" />
                </div>
                <h3 className="font-mono text-base font-bold text-white mb-1 truncate">
                  {single.name}
                </h3>
                <p className="font-mono text-xs text-radar-textMuted mb-3">
                  {single.path} · {formatBytes(single.size)}
                </p>

                {single.findingCount > 0 ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-radar-critical/20 text-radar-critical border border-radar-critical/40">
                    <ShieldAlert className="w-4 h-4" />
                    <span>{single.findingCount} Issues Detected</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-4 h-4" />
                    <span>No Issues Detected</span>
                  </div>
                )}
                <div className="mt-4 text-[11px] font-mono text-radar-textSubtle">
                  Click to toggle file focus
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Standard Multi-Node D3 SVG Treemap Canvas */
        <div className="flex-1 relative overflow-hidden">
          <svg
            className="w-full h-full cursor-crosshair"
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            preserveAspectRatio="none"
          >
            {leaves.map((leaf, index) => {
              const w = Math.max(0, leaf.x1 - leaf.x0);
              const h = Math.max(0, leaf.y1 - leaf.y0);
              if (w <= 2 || h <= 2) return null;

              const isSelected = selectedFile === leaf.path;
              const isFilterActive = activeFilter !== "ALL";
              const isDimmed = isFilterActive && !leaf.hasMatchingFindings;
              const styles = getSeverityStyle(leaf.highestSeverity, isSelected, isDimmed);

              const delay = reducedMotion ? 0 : Math.min(index * 6, 300);

              return (
                <g
                  key={leaf.path}
                  transform={`translate(${leaf.x0}, ${leaf.y0})`}
                  onClick={() => {
                    onSelectFile(isSelected ? null : leaf.path);
                  }}
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }
                    setHoveredLeaf(leaf);
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }
                  }}
                  className="transition-transform duration-200 hover:brightness-125 cursor-pointer"
                  style={{
                    opacity: isRendered ? (isDimmed ? 0.45 : 1) : 0,
                    transition: reducedMotion
                      ? "none"
                      : `opacity 0.3s ease ${delay}ms, filter 0.15s ease`,
                  }}
                >
                  <rect
                    width={w}
                    height={h}
                    fill={styles.fill}
                    stroke={isSelected ? "#C6FF3D" : styles.border}
                    strokeWidth={isSelected ? 2.5 : 1}
                    rx={3}
                    className={styles.glow}
                  />

                  {/* Primary File Name */}
                  {w > 28 && h > 18 && (
                    <text
                      x={6}
                      y={h > 36 ? 16 : 13}
                      fill={isDimmed ? "#666688" : isSelected ? "#FFFFFF" : "#E2E2F0"}
                      fontSize={Math.min(11, Math.max(8, Math.floor(w / 8.5)))}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      className="pointer-events-none select-none truncate"
                      style={{ maxWidth: w - 12 }}
                    >
                      {w > 80 ? leaf.name : leaf.name.length > 9 ? leaf.name.slice(0, 7) + ".." : leaf.name}
                    </text>
                  )}

                  {/* Subtitle / Directory Path */}
                  {w > 65 && h > 38 && (
                    <text
                      x={6}
                      y={28}
                      fill={isDimmed ? "#444466" : "#78789A"}
                      fontSize="8"
                      fontFamily="JetBrains Mono, monospace"
                      className="pointer-events-none select-none truncate"
                    >
                      {leaf.path.includes("/") ? leaf.path.slice(0, leaf.path.lastIndexOf("/")) : "root"}
                    </text>
                  )}

                  {/* Finding Count Indicator Badge */}
                  {leaf.findingCount > 0 && w > 32 && h > 28 && (
                    <g transform={`translate(${w - 20}, ${h - 18})`}>
                      <circle
                        cx="9"
                        cy="9"
                        r="7.5"
                        fill={
                          leaf.highestSeverity === "critical"
                            ? "#FF2B44"
                            : leaf.highestSeverity === "high"
                            ? "#FF2E93"
                            : "#FF9100"
                        }
                      />
                      <text
                        x="9"
                        y="12"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {leaf.findingCount}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Floating Hover Tooltip */}
      {hoveredLeaf && (
        <div
          className="absolute z-30 pointer-events-none bg-radar-elevated/95 border border-radar-borderBright p-3 rounded-lg shadow-2xl backdrop-blur-md max-w-xs text-xs font-mono transition-transform"
          style={{
            left: Math.min(tooltipPos.x + 12, dimensions.width - 240),
            top: Math.min(tooltipPos.y + 12, dimensions.height - 140),
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-radar-border pb-1.5 mb-1.5">
            <span className="text-white font-bold truncate">{hoveredLeaf.name}</span>
            <span className="text-[10px] text-radar-textMuted">
              {formatBytes(hoveredLeaf.size)}
            </span>
          </div>

          <p className="text-[10px] text-radar-textSubtle break-all mb-2">
            {hoveredLeaf.path}
          </p>

          {hoveredLeaf.findingCount > 0 ? (
            <div>
              <div className="flex items-center gap-1.5 text-radar-critical font-bold text-[11px] mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>
                  {hoveredLeaf.findingCount} Security Issue
                  {hoveredLeaf.findingCount > 1 ? "s" : ""} Detected
                </span>
              </div>
              <div className="space-y-0.5 text-[10px] text-radar-textMuted">
                {hoveredLeaf.findings.slice(0, 2).map((f) => (
                  <div key={f.id} className="truncate text-gray-300">
                    • {f.title}
                  </div>
                ))}
                {hoveredLeaf.findings.length > 2 && (
                  <div className="text-[9px] text-radar-textSubtle">
                    +{hoveredLeaf.findings.length - 2} more...
                  </div>
                )}
              </div>
              <div className="mt-2 text-[9px] text-radar-lime font-sans">
                Click file to isolate findings →
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>No detected vulnerabilities in file</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
