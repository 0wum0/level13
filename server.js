import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import { configureSocketServer } from "./server/socket-server.js";

const __filename = fileURLToPath(import.meta.url);
const rootDirectory = path.dirname(__filename);
const port = Number.parseInt(process.env.PORT || "3000", 10);
const trustProxy = String(process.env.TRUST_PROXY || "").toLowerCase() === "true";
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.disable("x-powered-by");
if (trustProxy) app.set("trust proxy", 1);

app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
});

app.get("/healthz", (_request, response) => {
  response.json({
    ok: true,
    service: "level13",
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

const privatePaths = new Set([
  "/package.json",
  "/package-lock.json",
  "/server.js",
  "/.env",
  "/.env.example",
  "/.nvmrc",
]);

app.use((request, response, next) => {
  const normalizedPath = request.path.toLowerCase();
  if (
    privatePaths.has(normalizedPath)
    || normalizedPath.startsWith("/server/")
    || normalizedPath.startsWith("/.git/")
    || normalizedPath === "/.git"
  ) {
    response.sendStatus(404);
    return;
  }
  next();
});

app.use(express.static(rootDirectory, {
  dotfiles: "deny",
  index: "index.html",
  etag: true,
  lastModified: true,
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
  setHeaders(response, filePath) {
    if (filePath.endsWith("index.html") || filePath.endsWith("config.js")) {
      response.setHeader("Cache-Control", "no-cache");
    } else if (/\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|mp3|ogg|wav)$/i.test(filePath)) {
      response.setHeader("Cache-Control", "public, max-age=604800, immutable");
    }
  },
}));

app.use((request, response, next) => {
  const acceptsHtml = request.method === "GET" && request.accepts("html");
  if (!acceptsHtml || request.path.startsWith("/socket.io/")) {
    next();
    return;
  }
  response.sendFile(path.join(rootDirectory, "index.html"));
});

app.use((_request, response) => {
  response.status(404).json({ ok: false, error: "not_found" });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  serveClient: true,
  transports: ["websocket", "polling"],
  maxHttpBufferSize: 512 * 1024,
  pingInterval: 25_000,
  pingTimeout: 20_000,
  allowRequest(request, callback) {
    if (allowedOrigins.length === 0) {
      callback(null, true);
      return;
    }

    const origin = request.headers.origin;
    callback(null, !origin || allowedOrigins.includes(origin));
  },
});

const socketRuntime = configureSocketServer(io, {
  maxSessions: process.env.MAX_LIVE_SESSIONS,
  sessionTtlMs: process.env.LIVE_SESSION_TTL_MS,
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`[level13] listening on http://0.0.0.0:${port} (${process.version})`);
});

function shutdown(signal) {
  console.log(`[level13] received ${signal}, shutting down`);
  socketRuntime.close();
  io.close(() => {
    httpServer.close(() => process.exit(0));
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
