import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { architecture } from "../architecture.config.mjs";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const failures = [];

function fail(message) {
  failures.push(message);
}

for (const path of architecture.requiredTopLevel) {
  if (!existsSync(join(repositoryRoot, path))) fail(`Missing required top-level path: ${path}`);
}

for (const path of architecture.requiredArchitectureFiles) {
  if (!existsSync(join(repositoryRoot, path))) fail(`Missing architecture contract: ${path}`);
}

const sourceRoot = join(repositoryRoot, architecture.sourceRoot);
if (existsSync(sourceRoot)) {
  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (!entry.isDirectory()) continue;
    if (!architecture.allowedSourceAreas.includes(entry.name)) {
      fail(`Unregistered source area: src/${entry.name}. Add it to architecture.config.mjs or move it.`);
    }
  }
}

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const absolutePath = join(directory, entry.name);
    const repositoryPath = relative(repositoryRoot, absolutePath).split(sep).join("/");

    if (entry.isDirectory()) {
      if (architecture.forbiddenSourceDirectoryNames.includes(entry.name.toLowerCase())) {
        fail(`Ambiguous directory name is forbidden: ${repositoryPath}`);
      }
      const depth = repositoryPath.split("/").length;
      if (repositoryPath.startsWith("src/") && depth > architecture.maxSourceDepth) {
        fail(`Source nesting exceeds depth ${architecture.maxSourceDepth}: ${repositoryPath}`);
      }
      walk(absolutePath);
      continue;
    }

    if (!entry.isFile()) continue;
    if (repositoryPath.startsWith("src/") && /\.(js|jsx)$/.test(entry.name)) {
      fail(`JavaScript source is not permitted in strict TypeScript areas: ${repositoryPath}`);
    }
    if (repositoryPath.includes("/index/index.")) {
      fail(`Redundant index/index nesting: ${repositoryPath}`);
    }
  }
}

for (const path of ["src", "scripts"]) {
  const absolutePath = join(repositoryRoot, path);
  if (existsSync(absolutePath) && statSync(absolutePath).isDirectory()) walk(absolutePath);
}

if (failures.length > 0) {
  console.error("Project structure validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Project structure validation passed.");
