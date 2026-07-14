import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import { configureSocketServer } from './server/socket-server.js';
import { createRuntimeConfig } from './server/runtime-config.js';
import { DatabaseManager } from './server/database.js';
import { createAuthService } from './server/auth-service.js';
import { registerApiRoutes } from './server/api-routes.js';
import { registerPageRoutes } from './server/page-routes.js';

const __filename = fileURLToPath(import.meta.url);
const rootDirectory = path.dirname(__filename);
const port = Number.parseInt(process.env.PORT || '3000', 10);
const trustProxy = String(process.env.TRUST_PROXY || '').toLowerCase() === 'true';
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const runtimeConfig = createRuntimeConfig(rootDirectory);
const database = new DatabaseManager();
const runtimeState = {
  installation: null,
  databaseError: null,
  reconnectPromise: null,
  nextReconnectAt: 0,
};

async function reconnectDatabase({ force = false } = {}) {
  if (database.isReady) return true;
  if (!runtimeState.installation?.database) return false;
  if (runtimeState.reconnectPromise) return runtimeState.reconnectPromise;
  if (!force && Date.now() < runtimeState.nextReconnectAt) return false;

  runtimeState.nextReconnectAt = Date.now() + 10_000;
  runtimeState.reconnectPromise = database.connect(runtimeState.installation.database)
    .then(() => database.migrate())
    .then(() => {
      runtimeState.databaseError = null;
      console.log('[sublevel] database connection restored');
      return true;
    })
    .catch(error => {
      runtimeState.databaseError = error;
      console.error('[sublevel] database connection failed:', error.message);
      return false;
    })
    .finally(() => {
      runtimeState.reconnectPromise = null;
    });

  return runtimeState.reconnectPromise;
}

try {
  runtimeState.installation = await runtimeConfig.loadInstallation();
  if (runtimeState.installation?.database) await reconnectDatabase({ force: true });
} catch (error) {
  runtimeState.databaseError = error;
  console.error('[sublevel] installation configuration failed:', error.message);
}

const auth = createAuthService(database);
const app = express();
app.disable('x-powered-by');
if (trustProxy) app.set('trust proxy', 1);

app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'SAMEORIGIN');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

app.use(express.json({ limit: '3mb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
app.use(async (request, _response, next) => {
  const needsDatabase = runtimeState.installation && !database.isReady && (
    request.path === '/'
    || request.path === '/index.html'
    || request.path === '/login'
    || request.path === '/guardian'
    || request.path === '/healthz'
    || request.path.startsWith('/api/')
  );
  if (needsDatabase) await reconnectDatabase();
  next();
});
app.use(auth.loadSession);

app.get('/healthz', (_request, response) => {
  response.json({
    ok: Boolean(!runtimeState.installation || database.isReady),
    service: 'sublevel',
    installed: Boolean(runtimeState.installation),
    databaseConnected: database.isReady,
    databaseError: runtimeState.databaseError ? runtimeState.databaseError.code || 'connection_failed' : null,
    node: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

registerApiRoutes(app, {
  rootDirectory,
  runtimeConfig,
  runtimeState,
  database,
  auth,
});
registerPageRoutes(app, { rootDirectory, runtimeState });

const privatePaths = new Set([
  '/package.json',
  '/server.js',
  '/.env',
  '/.env.example',
  '/.nvmrc',
]);

app.use((request, response, next) => {
  const normalizedPath = request.path.toLowerCase();
  if (
    privatePaths.has(normalizedPath)
    || normalizedPath.startsWith('/server/')
    || normalizedPath.startsWith('/.sublevel-data/')
    || normalizedPath === '/.sublevel-data'
    || normalizedPath.startsWith('/.git/')
    || normalizedPath === '/.git'
  ) {
    response.sendStatus(404);
    return;
  }
  next();
});

app.use(express.static(rootDirectory, {
  dotfiles: 'deny',
  index: false,
  etag: true,
  lastModified: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  setHeaders(response, filePath) {
    const isTranslationFile = filePath.includes(`${path.sep}strings${path.sep}`) && filePath.endsWith('.json');
    const isAuthAsset = filePath.includes(`${path.sep}auth${path.sep}`);
    if (filePath.endsWith('index.html') || filePath.endsWith('config.js') || isTranslationFile || isAuthAsset) {
      response.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (/\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|mp3|ogg|wav)$/i.test(filePath)) {
      response.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
}));

app.use((request, response, next) => {
  const acceptsHtml = request.method === 'GET' && request.accepts('html');
  const hasFileExtension = path.extname(request.path) !== '';
  if (!acceptsHtml || hasFileExtension || request.path.startsWith('/socket.io/') || request.path.startsWith('/api/')) {
    next();
    return;
  }
  if (!runtimeState.installation) {
    response.redirect('/install');
    return;
  }
  if (!request.auth?.user) {
    response.redirect('/login');
    return;
  }
  response.sendFile(path.join(rootDirectory, 'index.html'));
});

app.use((error, request, response, _next) => {
  const statusCode = Number(error.statusCode || error.status || 500);
  if (statusCode >= 500) console.error('[sublevel] request failed:', error);
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Ein interner Serverfehler ist aufgetreten.'
    : (error.message || 'Anfrage fehlgeschlagen.');
  if (request.path.startsWith('/api/')) {
    response.status(statusCode).json({ ok: false, error: error.code || 'request_failed', message });
    return;
  }
  response.status(statusCode).send(message);
});

app.use((_request, response) => {
  response.status(404).json({ ok: false, error: 'not_found' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  serveClient: true,
  transports: ['websocket', 'polling'],
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

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`[sublevel] listening on http://0.0.0.0:${port} (${process.version})`);
  console.log(`[sublevel] installation=${Boolean(runtimeState.installation)} database=${database.isReady}`);
});

async function shutdown(signal) {
  console.log(`[sublevel] received ${signal}, shutting down`);
  socketRuntime.close();
  io.close();
  await database.disconnect();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
