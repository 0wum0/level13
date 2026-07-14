import {
  clearSessionCookie,
  clientIp,
  parseCookies,
  randomToken,
  setSessionCookie,
  sha256,
} from './security.js';

const SESSION_DAYS = Math.max(1, Number.parseInt(process.env.SESSION_DAYS || '30', 10));
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

function publicUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    role: row.role,
    language: row.language || 'DE_DE',
    enabled: Boolean(row.enabled),
    createdAt: row.created_at || null,
    lastLoginAt: row.last_login_at || null,
  };
}

export function createAuthService(database) {
  async function cleanupExpiredSessions() {
    if (!database.isReady) return;
    await database.execute('DELETE FROM sublevel_sessions WHERE expires_at <= UTC_TIMESTAMP()').catch(() => {});
  }

  async function createSession(user, request, response) {
    await cleanupExpiredSessions();
    const token = randomToken(48);
    const csrfToken = randomToken(32);
    const tokenHash = sha256(token);
    const ipHash = sha256(clientIp(request));
    const userAgent = String(request.headers['user-agent'] || '').slice(0, 255);
    const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);

    await database.execute(
      `INSERT INTO sublevel_sessions
        (token_hash, user_id, csrf_token, expires_at, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tokenHash, user.id, csrfToken, expiresAt, ipHash, userAgent],
    );

    setSessionCookie(response, request, token, SESSION_SECONDS);
    return { token, csrfToken };
  }

  async function destroySession(request, response) {
    const token = parseCookies(request.headers.cookie).sublevel_session;
    if (token && database.isReady) {
      await database.execute('DELETE FROM sublevel_sessions WHERE token_hash = ?', [sha256(token)]).catch(() => {});
    }
    clearSessionCookie(response, request);
  }

  async function loadSession(request, _response, next) {
    request.auth = null;
    if (!database.isReady) {
      next();
      return;
    }

    const token = parseCookies(request.headers.cookie).sublevel_session;
    if (!token) {
      next();
      return;
    }

    try {
      const [rows] = await database.execute(
        `SELECT
           s.token_hash, s.csrf_token, s.expires_at,
           u.id, u.username, u.email, u.role, u.language, u.enabled, u.created_at, u.last_login_at
         FROM sublevel_sessions s
         INNER JOIN sublevel_users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
         LIMIT 1`,
        [sha256(token)],
      );

      const row = rows[0];
      if (!row || !row.enabled) {
        request.auth = null;
        next();
        return;
      }

      request.auth = {
        user: publicUser(row),
        csrfToken: row.csrf_token,
        tokenHash: row.token_hash,
      };

      database.execute(
        'UPDATE sublevel_sessions SET last_seen_at = UTC_TIMESTAMP() WHERE token_hash = ?',
        [row.token_hash],
      ).catch(() => {});
    } catch {
      request.auth = null;
    }
    next();
  }

  function requireAuth(request, response, next) {
    if (!request.auth?.user) {
      response.status(401).json({ ok: false, error: 'authentication_required' });
      return;
    }
    next();
  }

  function requireGuardian(request, response, next) {
    if (!request.auth?.user) {
      response.status(401).json({ ok: false, error: 'authentication_required' });
      return;
    }
    if (request.auth.user.role !== 'guardian') {
      response.status(403).json({ ok: false, error: 'guardian_required' });
      return;
    }
    next();
  }

  function requireCsrf(request, response, next) {
    const supplied = String(request.headers['x-sublevel-csrf'] || '');
    if (!request.auth?.csrfToken || supplied !== request.auth.csrfToken) {
      response.status(403).json({ ok: false, error: 'invalid_csrf_token' });
      return;
    }
    next();
  }

  return {
    publicUser,
    createSession,
    destroySession,
    loadSession,
    requireAuth,
    requireGuardian,
    requireCsrf,
  };
}
