import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const workspace = process.cwd();
const appDir = join(workspace, "app");
const sourceDirs = ["app", "components", "lib"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const ignoredSegments = new Set([".next", "node_modules"]);

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    if (ignoredSegments.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function extensionOf(filePath) {
  const match = filePath.match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function routeFromAppPage(pagePath) {
  const rel = relative(appDir, pagePath).split(sep).join("/");
  const route = rel
    .replace(/(^|\/)page\.(tsx|ts|jsx|js)$/, "")
    .replace(/(^|\/)\([^/]+\)/g, "")
    .replace(/\/+/g, "/");

  return route ? `/${route}` : "/";
}

function routeFromAppRoute(routePath) {
  const rel = relative(appDir, routePath).split(sep).join("/");
  const route = rel
    .replace(/(^|\/)route\.(tsx|ts|jsx|js)$/, "")
    .replace(/(^|\/)\([^/]+\)/g, "")
    .replace(/\/+/g, "/");

  return route ? `/${route}` : "/";
}

function collectAppRoutes() {
  const routes = new Set();
  for (const filePath of walk(appDir)) {
    const normalizedPath = filePath.split(sep).join("/");
    if (/\/page\.(tsx|ts|jsx|js)$/.test(normalizedPath)) {
      routes.add(routeFromAppPage(filePath));
    } else if (/\/route\.(tsx|ts|jsx|js)$/.test(normalizedPath)) {
      const route = routeFromAppRoute(filePath);
      if (!route.startsWith("/api/")) routes.add(route);
    }
  }
  return routes;
}

function normalizeHref(rawHref) {
  if (
    !rawHref.startsWith("/") ||
    rawHref.startsWith("//") ||
    rawHref.includes("${") ||
    rawHref.startsWith("/api/")
  ) {
    return null;
  }

  const [path] = rawHref.split(/[?#]/);
  return path.replace(/\/+$/, "") || "/";
}

function routeMatches(routePattern, path) {
  if (routePattern === path) return true;
  const routeParts = routePattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (routeParts.length !== pathParts.length) return false;

  return routeParts.every((part, index) => {
    if (/^\[[^/]+\]$/.test(part)) return pathParts[index].length > 0;
    return part === pathParts[index];
  });
}

const appRoutes = collectAppRoutes();
const sourceFiles = sourceDirs.flatMap((dir) => walk(join(workspace, dir)));
const linkPatterns = [
  /\bhref\s*=\s*["']([^"']+)["']/g,
  /\baction\s*=\s*["']([^"']+)["']/g,
  /\bhref\s*:\s*["']([^"']+)["']/g,
  /\bredirect\s*\(\s*["']([^"']+)["']/g,
  /\brouter\.(push|replace)\s*\(\s*["']([^"']+)["']/g,
  /\bbuildFlowHref\s*\(\s*["']([^"']+)["']/g,
];

const failures = [];

for (const filePath of sourceFiles) {
  if (!sourceExtensions.has(extensionOf(filePath))) continue;

  const text = readFileSync(filePath, "utf8");
  const rel = relative(workspace, filePath).split(sep).join("/");

  for (const pattern of linkPatterns) {
    for (const match of text.matchAll(pattern)) {
      const rawHref = match[2] ?? match[1];
      const href = normalizeHref(rawHref);
      if (!href) continue;

      const exists = [...appRoutes].some((route) => routeMatches(route, href));
      if (!exists) {
        failures.push(`${rel}: unknown internal route "${rawHref}"`);
      }
    }
  }
}

if (failures.length) {
  console.error("Internal link check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`internal links ok (${appRoutes.size} app routes)`);
