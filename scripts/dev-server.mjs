/**
 * Servidor estático mínimo para desenvolvimento e testes.
 *
 * - Sem dependências externas.
 * - Bloqueia path traversal (não serve nada fora da raiz do projeto).
 * - Envia X-Content-Type-Options para evitar sniffing de MIME.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

// Nada de expor código-fonte, dependências ou artefatos de teste.
const BLOCKED_SEGMENTS = new Set([
  "node_modules",
  "tests",
  "reports",
  "test-results",
  "playwright-report",
  "blob-report",
  "scripts",
]);
const BLOCKED_FILES = new Set([
  "package.json",
  "package-lock.json",
  "README.md",
  "playwright.config.mjs",
]);

const isBlockedPath = (requestedFile) =>
  BLOCKED_FILES.has(requestedFile) ||
  requestedFile
    .split(/[\\/]+/)
    .some((segment) => segment.startsWith(".") || BLOCKED_SEGMENTS.has(segment));

const notFound = (response) => {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("404 — arquivo não encontrado");
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    const requestedFile = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = normalize(join(ROOT, requestedFile));

    const isInsideRoot = filePath === ROOT || filePath.startsWith(ROOT + sep);
    if (!isInsideRoot || isBlockedPath(requestedFile)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("403 — acesso negado");
      return;
    }

    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      notFound(response);
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(body);
  } catch {
    notFound(response);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Padaria Veneto disponível em http://${HOST}:${PORT}`);
});
