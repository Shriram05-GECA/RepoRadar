export const MAX_FILE_BYTES = 1_000_000; // 1MB

// Directories to skip completely
export const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  "coverage",
  ".cache",
  ".next",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
  ".turbo",
  ".gradle",
  "bin",
  "obj",
]);

// Binary / media extensions to skip downloading
export const IGNORED_EXTENSIONS = new Set([
  // Images
  "png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "bmp", "tiff", "psd",
  // Audio & Video
  "mp3", "mp4", "wav", "ogg", "flac", "avi", "mov", "mkv", "webm",
  // Fonts
  "woff", "woff2", "ttf", "eot", "otf",
  // Archives & Binaries
  "zip", "tar", "gz", "tgz", "rar", "7z", "bz2", "xz", "iso",
  "exe", "dll", "so", "dylib", "bin", "class", "jar", "war", "pyc", "pyo", "pyd",
  // Documents / Large data
  "pdf", "docx", "xlsx", "pptx", "sqlite", "sqlite3", "db", "parquet", "arrow",
  // Minified or bundle artifacts
  "min.js", "min.css", "map",
]);

// High-priority files (manifests and configs)
export const MANIFEST_FILENAMES = new Set([
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "requirements.txt",
  "pyproject.toml",
  "pipfile.lock",
  "go.mod",
  "go.sum",
  "cargo.toml",
  "cargo.lock",
  "composer.json",
  "composer.lock",
  "gemfile.lock",
  "pom.xml",
  "build.gradle",
  "dockerfile",
  "makefile",
]);

// High-priority source and text extensions (including markdown and docs where secrets leak)
export const ANALYZABLE_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "py", "go", "rs", "java", "php", "rb", "c", "cpp", "h", "cs", "kt", "swift", "scala",
  "yml", "yaml", "json", "toml", "ini", "conf", "config", "env", "sh", "bash", "zsh", "sql",
  "md", "markdown", "txt", "rst", "properties", "xml", "html", "htm"
]);

export interface FilterDecision {
  shouldAnalyze: boolean;
  reason?: "ignored_dir" | "binary_ext" | "too_large" | "not_analyzable";
}

/**
 * Determines whether a file from the repository tree should have its content fetched and scanned.
 */
export function evaluateFileForScan(path: string, size?: number): FilterDecision {
  // Check directory path
  const parts = path.split("/");
  for (let i = 0; i < parts.length - 1; i++) {
    if (IGNORED_DIRECTORIES.has(parts[i].toLowerCase())) {
      return { shouldAnalyze: false, reason: "ignored_dir" };
    }
  }

  // Check file size safety
  if (size !== undefined && size > MAX_FILE_BYTES) {
    return { shouldAnalyze: false, reason: "too_large" };
  }

  const fileName = parts[parts.length - 1];
  const lowerName = fileName.toLowerCase();

  // Always analyze manifests and dot envs
  if (MANIFEST_FILENAMES.has(lowerName) || lowerName.startsWith(".env")) {
    return { shouldAnalyze: true };
  }

  // Check extensions
  const extParts = lowerName.split(".");
  if (extParts.length > 1) {
    const ext = extParts[extParts.length - 1];
    const fullExt = extParts.slice(-2).join("."); // e.g. min.js

    if (IGNORED_EXTENSIONS.has(ext) || IGNORED_EXTENSIONS.has(fullExt)) {
      return { shouldAnalyze: false, reason: "binary_ext" };
    }

    if (ANALYZABLE_EXTENSIONS.has(ext)) {
      return { shouldAnalyze: true };
    }
  }

  return { shouldAnalyze: false, reason: "not_analyzable" };
}
