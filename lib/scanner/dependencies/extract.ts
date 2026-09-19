import { Dependency, Ecosystem } from "@/types/dependency";

/**
 * Extracts dependencies from standard manifest and lock files.
 */
export function extractDependenciesFromManifest(
  filePath: string,
  content: string
): Dependency[] {
  if (!content) return [];
  const fileName = filePath.split("/").pop() || filePath;
  const dependencies: Dependency[] = [];

  try {
    // 1. package.json
    if (fileName === "package.json") {
      const parsed = JSON.parse(content);
      const allDeps = {
        ...(parsed.dependencies || {}),
        ...(parsed.devDependencies || {}),
      };
      for (const [name, rawVersion] of Object.entries(allDeps)) {
        if (typeof rawVersion === "string") {
          // Clean version (e.g. ^1.2.3, ~1.2.3, >=1.0.0 -> 1.2.3)
          const cleanVersion = rawVersion.replace(/[\^~>=<]/g, "").trim();
          if (cleanVersion && /^[0-9]/.test(cleanVersion)) {
            dependencies.push({
              name,
              version: cleanVersion,
              ecosystem: "npm",
              manifestFile: filePath,
            });
          }
        }
      }
    }

    // 2. package-lock.json
    else if (fileName === "package-lock.json") {
      const parsed = JSON.parse(content);
      if (parsed.packages) {
        for (const [pkgPath, pkgData] of Object.entries(parsed.packages)) {
          if (pkgPath && (pkgData as any).version) {
            const name = pkgPath.replace(/^node_modules\//, "");
            if (name && !name.includes("node_modules")) {
              dependencies.push({
                name,
                version: (pkgData as any).version,
                ecosystem: "npm",
                manifestFile: filePath,
              });
            }
          }
        }
      } else if (parsed.dependencies) {
        for (const [name, depData] of Object.entries(parsed.dependencies)) {
          if ((depData as any).version) {
            dependencies.push({
              name,
              version: (depData as any).version,
              ecosystem: "npm",
              manifestFile: filePath,
            });
          }
        }
      }
    }

    // 3. requirements.txt
    else if (fileName === "requirements.txt" || fileName.endsWith(".requirements.txt")) {
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = trimmed.match(/^([a-zA-Z0-9_\-\.]+)\s*==\s*([a-zA-Z0-9_\-\.]+)/);
        if (match) {
          dependencies.push({
            name: match[1],
            version: match[2],
            ecosystem: "PyPI",
            manifestFile: filePath,
          });
        }
      }
    }

    // 4. pyproject.toml
    else if (fileName === "pyproject.toml") {
      // Basic extraction of name = "version" under dependencies
      const lines = content.split("\n");
      let inDeps = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          inDeps = trimmed.includes("dependencies");
          continue;
        }
        if (inDeps) {
          const match = trimmed.match(/^([a-zA-Z0-9_\-\.]+)\s*=\s*["'][\^~>=<]*([0-9\.]+)["']/);
          if (match) {
            dependencies.push({
              name: match[1],
              version: match[2],
              ecosystem: "PyPI",
              manifestFile: filePath,
            });
          }
        }
      }
    }

    // 5. go.mod
    else if (fileName === "go.mod") {
      const lines = content.split("\n");
      let inRequire = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("require (")) {
          inRequire = true;
          continue;
        }
        if (inRequire && trimmed === ")") {
          inRequire = false;
          continue;
        }
        if (inRequire || trimmed.startsWith("require ")) {
          const parts = trimmed.replace(/^require\s+/, "").split(/\s+/);
          if (parts.length >= 2) {
            const name = parts[0];
            const version = parts[1].replace(/^v/, "");
            if (name && version) {
              dependencies.push({
                name,
                version,
                ecosystem: "Go",
                manifestFile: filePath,
              });
            }
          }
        }
      }
    }

    // 6. Cargo.toml
    else if (fileName === "Cargo.toml") {
      const lines = content.split("\n");
      let inDeps = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          inDeps = trimmed === "[dependencies]" || trimmed === "[dev-dependencies]";
          continue;
        }
        if (inDeps) {
          // package = "1.2.3" or package = { version = "1.2.3" }
          const simpleMatch = trimmed.match(/^([a-zA-Z0-9_\-\.]+)\s*=\s*["'][\^~>=<]*([0-9\.]+)["']/);
          if (simpleMatch) {
            dependencies.push({
              name: simpleMatch[1],
              version: simpleMatch[2],
              ecosystem: "crates.io",
              manifestFile: filePath,
            });
          } else {
            const objMatch = trimmed.match(/^([a-zA-Z0-9_\-\.]+)\s*=\s*\{.*version\s*=\s*["'][\^~>=<]*([0-9\.]+)["']/);
            if (objMatch) {
              dependencies.push({
                name: objMatch[1],
                version: objMatch[2],
                ecosystem: "crates.io",
                manifestFile: filePath,
              });
            }
          }
        }
      }
    }

    // 7. composer.json
    else if (fileName === "composer.json") {
      const parsed = JSON.parse(content);
      const allDeps = {
        ...(parsed.require || {}),
        ...(parsed["require-dev"] || {}),
      };
      for (const [name, rawVersion] of Object.entries(allDeps)) {
        if (name !== "php" && typeof rawVersion === "string") {
          const cleanVersion = rawVersion.replace(/[\^~>=<]/g, "").trim();
          if (cleanVersion && /^[0-9]/.test(cleanVersion)) {
            dependencies.push({
              name,
              version: cleanVersion,
              ecosystem: "Packagist",
              manifestFile: filePath,
            });
          }
        }
      }
    }
  } catch (err) {
    // Malformed manifest - return whatever was extracted safely
    console.warn(`Failed to parse manifest ${filePath}:`, err);
  }

  return dependencies;
}
