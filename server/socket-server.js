import { randomUUID } from "node:crypto";

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;
const LANGUAGE_PATTERN = /^[A-Z]{2}_[A-Z]{2}$/;
const MAX_SAVE_BYTES = 512 * 1024;

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function byteLength(value) {
  return Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8");
}

function normalizeSessionId(value) {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value) ? value : null;
}

function normalizeLanguage(value) {
  return typeof value === "string" && LANGUAGE_PATTERN.test(value) ? value : "DE_DE";
}

function safeAck(ack, payload) {
  if (typeof ack === "function") ack(payload);
}

export function configureSocketServer(io, options = {}) {
  const maxSessions = positiveInteger(options.maxSessions, 500);
  const sessionTtlMs = positiveInteger(options.sessionTtlMs, 24 * 60 * 60 * 1000);
  const sessions = new Map();
  const connectedClients = new Map();

  const roomName = (sessionId) => `game:${sessionId}`;

  const releaseClientSession = (sessionId) => {
    if (!sessionId) return;
    const remaining = (connectedClients.get(sessionId) || 1) - 1;
    if (remaining > 0) connectedClients.set(sessionId, remaining);
    else connectedClients.delete(sessionId);
  };

  const getPresence = () => ({
    connections: io.engine.clientsCount,
    sessions: connectedClients.size,
    timestamp: Date.now(),
  });

  const broadcastPresence = () => {
    io.emit("presence:update", getPresence());
  };

  const pruneSessions = () => {
    const expiry = Date.now() - sessionTtlMs;
    for (const [sessionId, session] of sessions.entries()) {
      if (session.updatedAt < expiry) sessions.delete(sessionId);
    }

    if (sessions.size <= maxSessions) return;

    const oldest = [...sessions.entries()]
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt)
      .slice(0, sessions.size - maxSessions);

    for (const [sessionId] of oldest) sessions.delete(sessionId);
  };

  const cleanupTimer = setInterval(pruneSessions, Math.min(sessionTtlMs, 60 * 60 * 1000));
  cleanupTimer.unref();

  io.on("connection", (socket) => {
    socket.data.connectionId = randomUUID();
    socket.data.language = "DE_DE";
    socket.data.sessionId = null;

    socket.emit("server:welcome", {
      connectionId: socket.data.connectionId,
      protocolVersion: 1,
      serverTime: Date.now(),
      defaultLanguage: "DE_DE",
    });

    socket.on("game:join", (payload = {}, ack) => {
      const sessionId = normalizeSessionId(payload.sessionId);
      if (!sessionId) {
        safeAck(ack, { ok: false, error: "invalid_session_id" });
        return;
      }

      if (socket.data.sessionId) {
        socket.leave(roomName(socket.data.sessionId));
        releaseClientSession(socket.data.sessionId);
      }

      socket.data.sessionId = sessionId;
      socket.data.language = normalizeLanguage(payload.language);
      socket.join(roomName(sessionId));
      connectedClients.set(sessionId, (connectedClients.get(sessionId) || 0) + 1);

      const currentSave = sessions.get(sessionId) || null;
      safeAck(ack, {
        ok: true,
        sessionId,
        presence: getPresence(),
        save: currentSave
          ? { revision: currentSave.revision, updatedAt: currentSave.updatedAt }
          : null,
      });
      broadcastPresence();
    });

    socket.on("client:language", (language, ack) => {
      socket.data.language = normalizeLanguage(language);
      safeAck(ack, { ok: true, language: socket.data.language });
    });

    socket.on("server:time", (ack) => {
      safeAck(ack, { ok: true, serverTime: Date.now() });
    });

    socket.on("save:push", (payload = {}, ack) => {
      const sessionId = socket.data.sessionId;
      if (!sessionId) {
        safeAck(ack, { ok: false, error: "not_joined" });
        return;
      }

      const data = payload.data;
      if (typeof data !== "string" || data.length === 0) {
        safeAck(ack, { ok: false, error: "invalid_save" });
        return;
      }

      if (byteLength(data) > MAX_SAVE_BYTES) {
        safeAck(ack, { ok: false, error: "save_too_large", maxBytes: MAX_SAVE_BYTES });
        return;
      }

      const previous = sessions.get(sessionId);
      const requestedRevision = Number.isInteger(payload.revision) ? payload.revision : 0;
      if (previous && requestedRevision < previous.revision) {
        safeAck(ack, {
          ok: false,
          error: "revision_conflict",
          revision: previous.revision,
          updatedAt: previous.updatedAt,
        });
        return;
      }

      const next = {
        data,
        revision: previous ? previous.revision + 1 : Math.max(1, requestedRevision + 1),
        updatedAt: Date.now(),
      };
      sessions.set(sessionId, next);
      pruneSessions();

      socket.to(roomName(sessionId)).emit("save:updated", {
        revision: next.revision,
        updatedAt: next.updatedAt,
      });

      safeAck(ack, {
        ok: true,
        revision: next.revision,
        updatedAt: next.updatedAt,
      });
    });

    socket.on("save:pull", (ack) => {
      const sessionId = socket.data.sessionId;
      if (!sessionId) {
        safeAck(ack, { ok: false, error: "not_joined" });
        return;
      }

      const save = sessions.get(sessionId);
      safeAck(ack, save
        ? { ok: true, ...save }
        : { ok: true, data: null, revision: 0, updatedAt: null });
    });

    socket.on("disconnect", () => {
      releaseClientSession(socket.data.sessionId);
      broadcastPresence();
    });
  });

  return {
    getPresence,
    close() {
      clearInterval(cleanupTimer);
    },
  };
}
