"use client";

import React, { useState, useEffect, useRef } from "react";
import { parseGitHubUrl } from "@/lib/github/url";
import { ScanResult } from "@/types/scan";
import { Finding, FindingStatus } from "@/types/finding";
import { compareScans } from "@/lib/scanner/comparison";
import { Treemap } from "@/components/dashboard/Treemap";
import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { FindingPanel } from "@/components/findings/FindingPanel";
import { FindingDrawer } from "@/components/findings/FindingDrawer";
import { ScanningProgress } from "@/components/scanner/ScanningProgress";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { ReportModal } from "@/components/report/ReportModal";
import { DEMO_SCAN_RESULT } from "@/lib/demo/demoData";
import { formatBytes, formatDuration } from "@/lib/utils/formatters";
import {
  Radar,
  Search,
  Github,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Command,
  FileText,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Layers,
  AlertTriangle,
  Info,
} from "lucide-react";

export default function HomePage() {
  const [urlInput, setUrlInput] = useState("");
  const [urlValidation, setUrlValidation] = useState<{
    isValid: boolean;
    owner?: string;
    repo?: string;
    error?: string;
  }>({ isValid: false });

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [activeFinding, setActiveFinding] = useState<Finding | null>(null);
  const [mode, setMode] = useState<"map" | "fix">("map");
  const [previousScan, setPreviousScan] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [findingStatuses, setFindingStatuses] = useState<Record<string, FindingStatus>>({});
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Validate GitHub URL on the fly
  useEffect(() => {
    if (!urlInput.trim()) {
      setUrlValidation({ isValid: false });
      return;
    }
    const res = parseGitHubUrl(urlInput);
    if (res.success && res.data) {
      setUrlValidation({
        isValid: true,
        owner: res.data.owner,
        repo: res.data.repo,
      });
    } else {
      setUrlValidation({
        isValid: false,
        error: res.error,
      });
    }
  }, [urlInput]);

  // Execute Real Scan
  const handleStartScan = async (repoToScan?: string) => {
    const targetUrl = repoToScan || urlInput;
    const parsed = parseGitHubUrl(targetUrl);
    if (!parsed.success || !parsed.data) {
      setScanError(parsed.error || "Please enter a valid GitHub repository URL.");
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setSelectedFile(null);
    setActiveFilter("ALL");

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: parsed.data.fullUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scan failed. Please verify the repository URL.");
      }

      if (scanResult) {
        setPreviousScan(scanResult);
        const comparison = compareScans(scanResult, data);
        if (comparison.resolved.length) {
          setFindingStatuses((statuses) => {
            const next = { ...statuses };
            for (const finding of comparison.resolved) next[finding.id] = "verified_resolved";
            return next;
          });
        }
      }
      setScanResult(data);
      setScanHistory((history) => [...history, data].slice(-4));
    } catch (err: any) {
      setScanError(err?.message || "Scan failed unexpectedly.");
    } finally {
      setIsScanning(false);
    }
  };

  // Launch Demo Mode
  const handleLaunchDemo = () => {
    setIsScanning(false);
    setScanError(null);
    setSelectedFile(null);
    setActiveFilter("ALL");
    setPreviousScan(null);
    setScanHistory([DEMO_SCAN_RESULT]);
    setFindingStatuses({});
    setChecklistState({});
    setScanResult(DEMO_SCAN_RESULT);
  };

  // Reset to Landing
  const handleResetToLanding = () => {
    setScanResult(null);
    setUrlInput("");
    setScanError(null);
    setSelectedFile(null);
    setPreviousScan(null);
    setScanHistory([]);
  };

  const openFix = (finding: Finding) => {
    setActiveFinding(finding);
    setSelectedFile(finding.file || null);
    setFindingStatuses((statuses) => ({ ...statuses, [finding.id]: statuses[finding.id] === "marked_complete" ? "marked_complete" : "in_progress" }));
  };

  const handleVerification = async () => {
    if (!scanResult) return;
    if (scanResult.isDemo) {
      const resolvedId = activeFinding?.id;
      const findings = scanResult.findings.filter((finding) => finding.id !== resolvedId);
      const categoryCounts = { secrets: findings.filter((f) => f.type === "secret").length, dependencies: findings.filter((f) => f.type === "dependency").length, configuration: findings.filter((f) => f.type === "configuration").length };
      const next = { ...scanResult, findings, categoryCounts, score: Math.max(0, scanResult.score - 12), riskLevel: "MODERATE" as const, scanDurationMs: 920 };
      setPreviousScan(scanResult); setScanResult(next); setScanHistory((history) => [...history, next].slice(-4));
      if (resolvedId) setFindingStatuses((statuses) => ({ ...statuses, [resolvedId]: "verified_resolved" }));
      setActiveFinding(null);
      return;
    }
    await handleStartScan(scanResult.repository.htmlUrl);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B14] text-gray-200 radar-grid">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-radar-border bg-radar-bg/90 backdrop-blur-md px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div
            onClick={handleResetToLanding}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="relative w-8 h-8 rounded-lg bg-radar-surface border border-radar-border flex items-center justify-center group-hover:border-radar-lime transition-colors">
              <Radar className="w-5 h-5 text-radar-lime" />
            </div>

            <div>
              <span className="font-display font-bold text-sm tracking-wider text-white">
                REPO<span className="text-radar-lime">RADAR</span>
              </span>
              <span className="text-[10px] text-radar-textSubtle block font-mono -mt-1">
                SECURITY MAP
              </span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5">
            {scanResult && (
              <>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-radar-surface border border-radar-border hover:border-radar-lime text-xs font-mono text-white transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-radar-lime" />
                  <span className="hidden sm:inline">Export Report</span>
                </button>
                <button
                  onClick={handleResetToLanding}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-radar-surface border border-radar-border hover:border-white text-xs font-mono text-radar-textMuted hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Scan</span>
                </button>
              </>
            )}

            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-radar-elevated/70 border border-radar-border text-xs font-mono text-radar-textMuted hover:text-white transition-colors"
            >
              <Command className="w-3.5 h-3.5 text-radar-lime" />
              <span className="hidden md:inline">Ctrl + K</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* VIEW 1: Scanning In Progress */}
        {isScanning ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <ScanningProgress
              repoName={urlValidation.repo ? `${urlValidation.owner}/${urlValidation.repo}` : urlInput}
              isCompleted={false}
              error={scanError}
              onRetry={() => handleStartScan()}
              onTryDemo={handleLaunchDemo}
            />
          </div>
        ) : scanError ? (
          /* Error State Screen */
          <div className="flex-1 flex items-center justify-center py-12">
            <ScanningProgress
              repoName={urlInput}
              isCompleted={false}
              error={scanError}
              onRetry={() => handleStartScan()}
              onTryDemo={handleLaunchDemo}
            />
          </div>
        ) : scanResult ? (
          /* VIEW 2: Interactive Dashboard */
          <div className="flex-1 flex flex-col space-y-4 animate-in fade-in duration-300">
            {/* Repository Summary Bar */}
            <div className="bg-radar-surface/80 border border-radar-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <a
                    href={scanResult.repository.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-bold font-display text-white hover:text-radar-lime flex items-center gap-1.5 transition-colors"
                  >
                    <span>{scanResult.repository.fullName}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-radar-textSubtle" />
                  </a>

                  {scanResult.isDemo ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      DEMO DATA
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-radar-lime/20 text-radar-lime border border-radar-lime/40">
                      LIVE SCAN
                    </span>
                  )}
                </div>

                {/* Telemetry Stats */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-radar-textMuted">
                  <span>Branch: <strong className="text-white">{scanResult.repository.defaultBranch}</strong></span>
                  <span>•</span>
                  <span><strong className="text-white">{scanResult.indexedFiles.toLocaleString()}</strong> files indexed</span>
                  <span>•</span>
                  <span><strong className="text-radar-lime">{scanResult.analyzedFiles.toLocaleString()}</strong> files analyzed</span>
                  <span>•</span>
                  <span><strong className="text-white">{scanResult.dependenciesChecked}</strong> deps checked</span>
                  <span>•</span>
                  <span><strong className="text-white">{formatDuration(scanResult.scanDurationMs)}</strong> scan</span>
                </div>
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="flex items-center gap-1 text-radar-critical">
                    <strong className="text-white">{scanResult.categoryCounts.secrets}</strong> Secrets
                  </span>
                  <span className="text-radar-textSubtle">/</span>
                  <span className="flex items-center gap-1 text-radar-high">
                    <strong className="text-white">{scanResult.categoryCounts.dependencies}</strong> Deps
                  </span>
                  <span className="text-radar-textSubtle">/</span>
                  <span className="flex items-center gap-1 text-radar-medium">
                    <strong className="text-white">{scanResult.categoryCounts.configuration}</strong> Config
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="inline-flex border border-radar-border bg-radar-surface/80 p-1 rounded-lg font-mono text-xs"><button onClick={() => setMode("map")} className={`px-3 py-1.5 rounded ${mode === "map" ? "bg-radar-lime text-black font-bold" : "text-radar-textMuted"}`}>MAP</button><button onClick={() => setMode("fix")} className={`px-3 py-1.5 rounded ${mode === "fix" ? "bg-radar-magenta text-white font-bold" : "text-radar-textMuted"}`}>FIX</button></div>
              <div className="flex gap-3 font-mono text-[10px] text-radar-textMuted"><span className="text-radar-lime">SCAN ✓</span><span>UNDERSTAND ✓</span><span className={mode === "fix" ? "text-radar-magenta" : ""}>FIX {mode === "fix" ? "→" : "○"}</span><span className={previousScan ? "text-radar-lime" : ""}>VERIFY {previousScan ? "✓" : "○"}</span></div>
            </div>
            {mode === "fix" && <div className="grid lg:grid-cols-2 gap-4"><section className="p-4 border border-radar-magenta/40 bg-radar-surface/75 rounded-xl"><h3 className="font-mono text-xs font-bold text-white">START HERE</h3><div className="mt-3 space-y-2">{[...scanResult.findings].sort((a,b) => ({critical:5,high:4,medium:3,low:2,info:1}[b.severity] - {critical:5,high:4,medium:3,low:2,info:1}[a.severity])).slice(0,3).map((finding, index) => <button key={finding.id} onClick={() => openFix(finding)} className="w-full flex text-left items-center gap-3 p-2 border border-radar-border hover:border-radar-lime"><span className="font-mono text-radar-lime">{String(index + 1).padStart(2,"0")}</span><span className="flex-1 min-w-0"><b className="text-xs text-white block truncate">{finding.title}</b><small className="font-mono text-radar-textMuted">{finding.file || "repository"}</small></span><span className="font-mono text-[10px] text-radar-lime">FIX →</span></button>)}</div></section><section className="p-4 border border-radar-border bg-radar-surface/75 rounded-xl"><div className="flex items-center justify-between"><h3 className="font-mono text-xs font-bold text-white">REMEDIATION CHECKLIST</h3><span className="font-mono text-[10px] text-radar-lime">{Object.values(checklistState).filter(Boolean).length} / {Math.min(5, scanResult.findings.length)} MARKED COMPLETE</span></div><div className="mt-3 space-y-2">{scanResult.findings.slice(0,5).map((finding) => <label key={finding.id} className="flex gap-2 text-xs text-radar-textMuted cursor-pointer"><input type="checkbox" checked={!!checklistState[finding.id]} onChange={(e) => setChecklistState((state) => ({...state, [finding.id]: e.target.checked}))} /><span>{finding.remediation}</span></label>)}</div><button onClick={handleVerification} className="mt-3 px-3 py-2 bg-radar-lime text-black font-mono text-xs font-bold">RUN VERIFICATION SCAN</button></section></div>}
            {previousScan && (() => { const diff = compareScans(previousScan, scanResult); return <section className="p-4 border border-radar-lime/30 bg-radar-surface/75 rounded-xl"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-mono text-xs font-bold text-white">SECURITY CHANGE</h3><span className="font-mono text-xs text-radar-lime">{diff.previousScore} → {diff.currentScore}</span></div><div className="grid grid-cols-3 gap-3 mt-3 text-xs font-mono"><span><b className="text-radar-lime block">RESOLVED</b>{diff.resolved.length}</span><span><b className="text-white block">UNCHANGED</b>{diff.unchanged.length}</span><span><b className="text-radar-magenta block">NEW</b>{diff.newFindings.length}</span></div>{diff.resolved.length > 0 && <p className="mt-3 text-xs text-radar-lime">✓ VERIFIED RESOLVED: {diff.resolved.map((f) => f.title).slice(0,2).join(", ")}</p>}</section>; })()}
            {/* Truncated / Limited Scan Disclosure */}
            {scanResult.scanLimits && scanResult.scanLimits.length > 0 && (
              <div className="p-3 bg-radar-elevated/80 border border-radar-border rounded-lg text-xs font-mono text-radar-textMuted flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-radar-lime flex-shrink-0" />
                  <span>{scanResult.scanLimits[0]}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-radar-textSubtle ml-2 flex-shrink-0">
                  PARTIAL INDEX
                </span>
              </div>
            )}

            {/* Core Dashboard Grid: Score Ring, Treemap, Findings Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[540px]">
              {/* Left Column: Score Ring & Tips */}
              <div className="lg:col-span-3 flex flex-col justify-between gap-3 h-auto lg:h-[540px]">
                <ScoreRing
                  score={scanResult.score}
                  riskLevel={scanResult.riskLevel}
                  categoryCounts={scanResult.categoryCounts}
                  activeFilter={activeFilter}
                  onFilterChange={(f) => setActiveFilter(f)}
                  reducedMotion={reducedMotion}
                />

                {/* Quick Guidance Box */}
                <div className="p-3.5 rounded-xl bg-radar-surface/60 border border-radar-border text-xs font-mono space-y-1.5 flex-1 flex flex-col justify-center">
                  <span className="text-radar-lime font-bold uppercase tracking-wider text-[10px] block">
                    {mode === "fix" ? "FIX WORKSPACE" : "MAP NAVIGATION TIPS"}
                  </span>
                  <p className="text-radar-textMuted text-[11px] leading-relaxed">
                    • <strong>Hover</strong> any rectangle to inspect path and risk posture.
                  </p>
                  <p className="text-radar-textMuted text-[11px] leading-relaxed">
                    • <strong>Click</strong> a file on the treemap to isolate its findings.
                  </p>
                  <p className="text-radar-textMuted text-[11px] leading-relaxed">
                    • <strong>Click</strong> a finding to inspect redacted evidence and remediation.
                  </p>
                </div>
              </div>

              {/* Center Column: Security Treemap (Signature Feature) */}
              <div className="lg:col-span-5 h-[440px] lg:h-[540px]">
                <Treemap
                  tree={scanResult.tree}
                  findings={scanResult.findings}
                  selectedFile={selectedFile}
                  onSelectFile={(path) => setSelectedFile(path)}
                  activeFilter={activeFilter}
                  reducedMotion={reducedMotion}
                />
              </div>

              {/* Right Column: Finding Investigation Panel */}
              <div className="lg:col-span-4 h-[440px] lg:h-[540px]">
                <FindingPanel
                  findings={scanResult.findings}
                  selectedFile={selectedFile}
                  onClearSelectedFile={() => setSelectedFile(null)}
                  activeFilter={activeFilter}
                  onFilterChange={(f) => setActiveFilter(f)}
                  onSelectFinding={(f) => { setActiveFinding(f); setSelectedFile(f.file || null); }}
                  mode={mode}
                  findingStatuses={findingStatuses}
                  onFixFinding={openFix}
                />
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 3: Landing Page & Live URL Scanner Form */
          <div className="flex-1 flex flex-col justify-center items-center py-10 space-y-10">
            {/* Hero Header */}
            <div className="text-center max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-radar-surface border border-radar-border text-[11px] font-mono text-radar-lime">
                <Sparkles className="w-3.5 h-3.5" />
                <span>REPOSITORY SECURITY / REAL-TIME ANALYSIS</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight text-white leading-tight">
                SEE THE RISK <br />
                <span className="text-radar-lime">INSIDE YOUR CODE.</span>
              </h1>
              <p className="text-sm sm:text-base text-radar-textMuted max-w-lg mx-auto font-sans leading-relaxed">
                Paste any public GitHub repository to turn its security posture into a living, interactive visual map. Detect secrets, vulnerable packages, and CI/CD flaws.
              </p>
            </div>

            {/* Input Form */}
            <div className="w-full max-w-2xl bg-radar-surface/90 border border-radar-border p-3 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-md space-y-3">
              <div
                className={`relative flex items-center bg-radar-bg border rounded-xl transition-all ${
                  urlValidation.isValid
                    ? "border-radar-lime ring-1 ring-radar-lime/30"
                    : "border-radar-border focus-within:border-radar-lime"
                }`}
              >
                <div className="pl-4 pr-2 text-radar-textSubtle">
                  <Github className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && urlValidation.isValid) {
                      handleStartScan();
                    }
                  }}
                  placeholder="https://github.com/owner/repository"
                  className="w-full py-3 pr-4 bg-transparent font-mono text-xs sm:text-sm text-white placeholder-radar-textSubtle focus:outline-none"
                />

                {/* Validation check badge */}
                {urlValidation.isValid && (
                  <div className="pr-4 flex items-center gap-1 text-[11px] font-mono text-radar-lime">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Valid</span>
                  </div>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => handleStartScan()}
                  disabled={!urlValidation.isValid}
                  className={`w-full sm:flex-1 py-3 px-5 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    urlValidation.isValid
                      ? "bg-radar-lime text-black hover:bg-opacity-95 shadow-lg shadow-radar-lime/20 cursor-pointer"
                      : "bg-radar-elevated text-radar-textSubtle border border-radar-border cursor-not-allowed"
                  }`}
                >
                  <span>SCAN REPOSITORY</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleLaunchDemo}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl font-mono text-xs sm:text-sm font-bold bg-radar-elevated hover:bg-radar-surface text-white border border-radar-border transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-radar-lime" />
                  <span>TRY DEMO</span>
                </button>
              </div>

              {/* Validation error or subtitle status */}
              {urlValidation.error ? (
                <p className="text-[11px] font-mono text-radar-critical text-center">
                  {urlValidation.error}
                </p>
              ) : (
                <div className="flex items-center justify-between text-[10px] font-mono text-radar-textSubtle px-1">
                  <span>PUBLIC REPOSITORIES · NO SIGN-UP</span>
                  <span>STATIC DETERMINISTIC ANALYSIS</span>
                </div>
              )}
            </div>

            {/* Quick Sample Links */}
            <div className="flex items-center gap-2 text-xs font-mono text-radar-textSubtle">
              <span>Try popular repositories:</span>
              <button
                onClick={() => {
                  setUrlInput("https://github.com/expressjs/express");
                }}
                className="text-radar-textMuted hover:text-radar-lime underline"
              >
                expressjs/express
              </button>
              <span>·</span>
              <button
                onClick={() => {
                  setUrlInput("https://github.com/facebook/react");
                }}
                className="text-radar-textMuted hover:text-radar-lime underline"
              >
                facebook/react
              </button>
            </div>

            {/* Mini Treemap Live Preview */}
            <div className="w-full max-w-4xl bg-radar-surface/40 border border-radar-border rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3 text-xs font-mono text-radar-textMuted">
                <span className="flex items-center gap-1.5 text-white font-semibold">
                  <Radar className="w-3.5 h-3.5 text-radar-lime" />
                  PREVIEW: ACME ENTERPRISE LIVING MAP (DEMO)
                </span>
                <button
                  onClick={handleLaunchDemo}
                  className="text-radar-lime hover:underline flex items-center gap-1 text-[11px]"
                >
                  Open Full Interactive Demo →
                </button>
              </div>

              <div className="h-64">
                <Treemap
                  tree={DEMO_SCAN_RESULT.tree}
                  findings={DEMO_SCAN_RESULT.findings}
                  selectedFile={null}
                  onSelectFile={() => handleLaunchDemo()}
                  activeFilter="ALL"
                  reducedMotion={reducedMotion}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Modals & Drawers */}
      <FindingDrawer
        finding={activeFinding}
        status={activeFinding ? findingStatuses[activeFinding.id] : undefined}
        onStatusChange={(finding, status) => setFindingStatuses((statuses) => ({ ...statuses, [finding.id]: status }))}
        onVerify={handleVerification}
        onClose={() => setActiveFinding(null)}
      />

      {scanResult && isReportModalOpen && (
        <ReportModal
          scanResult={scanResult}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSetFilter={(f) => setActiveFilter(f)}
        onResetFilters={() => {
          setActiveFilter("ALL");
          setSelectedFile(null);
        }}
        onReScan={() => {
          if (scanResult?.repository?.htmlUrl) {
            handleStartScan(scanResult.repository.htmlUrl);
          }
        }}
        onExportReport={() => {
          if (scanResult) setIsReportModalOpen(true);
        }}
        onToggleReducedMotion={() => setReducedMotion(!reducedMotion)}
        reducedMotion={reducedMotion}
        onFocusSearch={() => {}}
      />
    </div>
  );
}
