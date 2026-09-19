"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  ShieldAlert,
  Key,
  Package,
  Settings,
  RefreshCw,
  FileText,
  EyeOff,
  RotateCcw,
  Sparkles,
  Command,
  X,
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSetFilter: (filter: string) => void;
  onResetFilters: () => void;
  onReScan: () => void;
  onExportReport: () => void;
  onToggleReducedMotion: () => void;
  reducedMotion: boolean;
  onFocusSearch: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSetFilter,
  onResetFilters,
  onReScan,
  onExportReport,
  onToggleReducedMotion,
  reducedMotion,
  onFocusSearch,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const commands = [
    {
      id: "filter-critical",
      title: "Show Critical Findings",
      description: "Filter security map to critical severity issues only",
      icon: ShieldAlert,
      color: "text-radar-critical",
      action: () => {
        onSetFilter("CRITICAL");
        onClose();
      },
    },
    {
      id: "filter-secrets",
      title: "Show Secrets",
      description: "Filter to hardcoded credentials, keys, and token findings",
      icon: Key,
      color: "text-radar-critical",
      action: () => {
        onSetFilter("SECRETS");
        onClose();
      },
    },
    {
      id: "filter-deps",
      title: "Show Dependencies",
      description: "Filter to known vulnerabilities discovered via OSV",
      icon: Package,
      color: "text-radar-high",
      action: () => {
        onSetFilter("DEPENDENCIES");
        onClose();
      },
    },
    {
      id: "filter-config",
      title: "Show Configuration",
      description: "Filter to Dockerfile, GitHub Actions, and CORS misconfigurations",
      icon: Settings,
      color: "text-radar-medium",
      action: () => {
        onSetFilter("CONFIGURATION");
        onClose();
      },
    },
    {
      id: "search-repo",
      title: "Search Repository Findings",
      description: "Focus on finding and file keyword search",
      icon: Search,
      color: "text-radar-lime",
      action: () => {
        onFocusSearch();
        onClose();
      },
    },
    {
      id: "reset-filters",
      title: "Reset Filters",
      description: "Clear all active filters and file selections",
      icon: RotateCcw,
      color: "text-white",
      action: () => {
        onResetFilters();
        onClose();
      },
    },
    {
      id: "export-report",
      title: "Export Security Report",
      description: "Generate and download a comprehensive security audit report",
      icon: FileText,
      color: "text-radar-blue",
      action: () => {
        onExportReport();
        onClose();
      },
    },
    {
      id: "rescan",
      title: "Re-run Repository Scan",
      description: "Re-query GitHub and OSV to refresh repository security posture",
      icon: RefreshCw,
      color: "text-emerald-400",
      action: () => {
        onReScan();
        onClose();
      },
    },
    {
      id: "toggle-motion",
      title: reducedMotion ? "Enable Animation Motion" : "Enable Reduced Motion",
      description: reducedMotion
        ? "Switch to standard cinematic reveals"
        : "Switch to instantaneous UI transitions",
      icon: EyeOff,
      color: "text-radar-textMuted",
      action: () => {
        onToggleReducedMotion();
        onClose();
      },
    },
  ];

  const filteredCommands = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.description.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/75 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-xl bg-radar-surface border border-radar-borderBright rounded-xl shadow-2xl overflow-hidden font-mono text-xs animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-radar-border bg-radar-bg">
          <Command className="w-4 h-4 text-radar-lime mr-2.5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or filter (e.g. 'critical', 'export')..."
            className="flex-1 bg-transparent border-none text-white text-xs placeholder-radar-textSubtle focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-radar-textMuted hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-radar-textSubtle">
              No command found matching &quot;{query}&quot;
            </div>
          ) : (
            filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-radar-elevated text-left group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${cmd.color}`} />
                    <div>
                      <span className="text-white font-semibold block">
                        {cmd.title}
                      </span>
                      <span className="text-[11px] text-radar-textSubtle">
                        {cmd.description}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-radar-textSubtle group-hover:text-radar-lime">
                    Execute ↵
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-radar-bg/90 border-t border-radar-border flex items-center justify-between text-[10px] text-radar-textSubtle">
          <span>Navigation: ↑ ↓ Enter</span>
          <span>RepoRadar Palette (Cmd/Ctrl + K)</span>
        </div>
      </div>
    </div>
  );
};
