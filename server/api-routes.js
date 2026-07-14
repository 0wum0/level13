import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { databaseErrorMessage, normalizeDatabaseConfig } from './database.js';
import { clientIp, hashPassword, safeJson, sha256, verifyPassword } from './security.js';

const MAX_SAVE_BYTES = 2 * 1024 * 1024;
const USERNAME_PATTERN = /^[\p{L}\p{N}_.-]{3,64}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ITEM_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,120}$/;
const COMMAND_TYPES = new Set(['grant_item', 'grant_resource', 'message', 'force_save']);

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === '1' || value === 'true';
}

function languageValue(value) {
  return value === 'EN_GB' ? 'EN_GB' : 'DE_DE';
}

function validateGuardianInput(input = {}) {
  const username = String(input.username || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error('Der Wächtername muss 3 bis 64 Zeichen lang sein und darf Buchstaben, Zahlen, Punkt, Unterstrich und Bindestrich enthalten.');
  }
  if (!EMAIL_PATTERN.test(email) || email.length > 190) {
    throw new Error('Die E-Mail-Adresse ist ungültig.');
  }
  if (password.length < 10) {
    throw new Error('Das Passwort muss mindestens 10 Zeichen lang sein.');
  }
  return { username, email, password, language: languageValue(input.language) };
}

function serializeUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    role: row.role,
    language: row.language,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    hasSave: Boolean(row.has_save),
    saveUpdatedAt: row.save_updated_at || null,
  };
}

function createRateLimiter({ windowMs = 60_000, limit = 10 } = {}) {
  const attempts = new Map();
  return (request, response, next) => {
    const key = sha256(`${clientIp(request)}:${request.path}`);
    const now = Date.now();
    let entry = attempts.get(key);
    if (!entry || now - entry.startedAt > windowMs) {
      entry = { startedAt: now, count: 0 };
      attempts.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > limit) {
      response.status(429).json({ ok: false, error: 'rate_limited' });
      return;
    }
    if (attempts.size > 1000) {
      for (const [entryKey, value] of attempts) {
        if (now - value.startedAt > windowMs) attempts.delete(entryKey);
      }
    }
    next();
  };
}

export function registerApiRoutes(app, {
  rootDirectory,
  runtimeConfig,
  runtimeState,
  database,
  auth,
}) {
  const installerLimiter = createRateLimiter({ windowMs: 60_000, limit: 12 });
  const loginLimiter = createRateLimiter({ windowMs: 5 * 60_000, limit: 20 });

  async function audit(request, action, entityType = null, entityId = null, details = null) {
    if (!database.isReady) return;
    await database.execute(
      `INSERT INTO sublevel_audit_log
        (actor_user_id, action, entity_type, entity_id, details_json, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        request.auth?.user?.id || null,
        action,
        entityType,
        entityId === null ? null : String(entityId),
        details === null ? null : JSON.stringify(details),
        sha256(clientIp(request)),
      ],
    ).catch(() => {});
  }

  app.get('/api/install/status', asyncRoute(async (_request, response) => {
    response.json({
      ok: true,
      installed: Boolean(runtimeState.installation),
      databaseConnected: database.isReady,
      databaseError: runtimeState.databaseError ? databaseErrorMessage(runtimeState.databaseError) : null,
      product: 'Sublevel',
      supportedLanguages: ['DE_DE', 'EN_GB'],
    });
  }));

  app.post('/api/install/test-database', installerLimiter, asyncRoute(async (request, response) => {
    if (runtimeState.installation) {
      response.status(409).json({ ok: false, error: 'already_installed' });
      return;
    }
    try {
      const config = normalizeDatabaseConfig(request.body?.database || request.body || {});
      const result = await database.test(config);
      response.json({ ok: true, database: result.database, version: result.version });
    } catch (error) {
      response.status(400).json({ ok: false, error: 'database_connection_failed', message: databaseErrorMessage(error) });
    }
  }));

  app.post('/api/install/complete', installerLimiter, asyncRoute(async (request, response) => {
    if (runtimeState.installation) {
      response.status(409).json({ ok: false, error: 'already_installed' });
      return;
    }

    let databaseConfig;
    let guardian;
    try {
      databaseConfig = normalizeDatabaseConfig(request.body?.database || {});
      guardian = validateGuardianInput(request.body?.guardian || {});
    } catch (error) {
      response.status(400).json({ ok: false, error: 'validation_failed', message: error.message });
      return;
    }

    try {
      await database.connect(databaseConfig);
      await database.migrate();
      const passwordHash = await hashPassword(guardian.password);

      const user = await database.transaction(async connection => {
        const [existingRows] = await connection.execute(
          `SELECT id FROM sublevel_users
           WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
           LIMIT 1`,
          [guardian.username, guardian.email],
        );

        let userId;
        if (existingRows[0]) {
          userId = existingRows[0].id;
          await connection.execute(
            `UPDATE sublevel_users
             SET username = ?, email = ?, password_hash = ?, role = 'guardian', language = ?, enabled = 1
             WHERE id = ?`,
            [guardian.username, guardian.email, passwordHash, guardian.language, userId],
          );
        } else {
          const [insertResult] = await connection.execute(
            `INSERT INTO sublevel_users
              (username, email, password_hash, role, language, enabled)
             VALUES (?, ?, ?, 'guardian', ?, 1)`,
            [guardian.username, guardian.email, passwordHash, guardian.language],
          );
          userId = insertResult.insertId;
        }

        const [rows] = await connection.execute(
          `SELECT id, username, email, role, language, enabled, created_at, last_login_at
           FROM sublevel_users WHERE id = ?`,
          [userId],
        );
        return rows[0];
      });

      const installation = {
        installedAt: new Date().toISOString(),
        database: databaseConfig,
      };
      await runtimeConfig.saveInstallation(installation);
      runtimeState.installation = installation;
      runtimeState.databaseError = null;

      await auth.createSession(user, request, response);
      request.auth = { user: auth.publicUser(user), csrfToken: null };
      await audit(request, 'installation.completed', 'installation', '1', {
        databaseHost: databaseConfig.host,
        databaseName: databaseConfig.database,
      });

      response.status(201).json({
        ok: true,
        redirect: '/',
        user: auth.publicUser(user),
      });
    } catch (error) {
      runtimeState.databaseError = error;
      await database.disconnect().catch(() => {});
      response.status(400).json({
        ok: false,
        error: 'installation_failed',
        message: databaseErrorMessage(error),
      });
    }
  }));

  app.post('/api/auth/login', loginLimiter, asyncRoute(async (request, response) => {
    if (!runtimeState.installation) {
      response.status(409).json({ ok: false, error: 'installation_required' });
      return;
    }
    if (!database.isReady) {
      response.status(503).json({ ok: false, error: 'database_unavailable', message: databaseErrorMessage(runtimeState.databaseError) });
      return;
    }

    const identifier = String(request.body?.identifier || '').trim();
    const password = String(request.body?.password || '');
    if (!identifier || !password) {
      response.status(400).json({ ok: false, error: 'credentials_required' });
      return;
    }

    const [rows] = await database.execute(
      `SELECT id, username, email, password_hash, role, language, enabled, created_at, last_login_at
       FROM sublevel_users
       WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
       LIMIT 1`,
      [identifier, identifier],
    );
    const user = rows[0];
    const valid = user && user.enabled && await verifyPassword(password, user.password_hash);
    if (!valid) {
      await audit(request, 'auth.login_failed', 'user', user?.id || null, { identifier: identifier.slice(0, 120) });
      response.status(401).json({ ok: false, error: 'invalid_credentials' });
      return;
    }

    await database.execute('UPDATE sublevel_users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [user.id]);
    const session = await auth.createSession(user, request, response);
    request.auth = { user: auth.publicUser(user), csrfToken: session.csrfToken };
    await audit(request, 'auth.login', 'user', user.id);
    response.json({ ok: true, redirect: '/', user: auth.publicUser(user), csrfToken: session.csrfToken });
  }));

  app.post('/api/auth/logout', auth.requireAuth, auth.requireCsrf, asyncRoute(async (request, response) => {
    await audit(request, 'auth.logout', 'user', request.auth.user.id);
    await auth.destroySession(request, response);
    response.json({ ok: true, redirect: '/login' });
  }));

  app.get('/api/auth/me', auth.requireAuth, asyncRoute(async (request, response) => {
    response.json({ ok: true, user: request.auth.user, csrfToken: request.auth.csrfToken });
  }));

  app.get('/api/game/bootstrap', auth.requireAuth, asyncRoute(async (request, response) => {
    const userId = request.auth.user.id;
    const [[saveRows], [announcementRows], [commandRows], [settingsRows]] = await Promise.all([
      database.execute(
        'SELECT save_data, revision, client_version, updated_at FROM sublevel_saves WHERE user_id = ? LIMIT 1',
        [userId],
      ),
      database.execute(
        `SELECT id, title_de, title_en, body_de, body_en, starts_at, ends_at
         FROM sublevel_announcements
         WHERE active = 1
           AND (starts_at IS NULL OR starts_at <= UTC_TIMESTAMP())
           AND (ends_at IS NULL OR ends_at >= UTC_TIMESTAMP())
         ORDER BY created_at DESC
         LIMIT 10`,
      ),
      database.execute(
        `SELECT id, command_type, payload_json, created_at
         FROM sublevel_guardian_commands
         WHERE target_user_id = ? AND status = 'pending'
         ORDER BY created_at ASC
         LIMIT 100`,
        [userId],
      ),
      database.execute(
        `SELECT setting_key, value_json FROM sublevel_settings
         WHERE setting_key IN ('game.maintenance','game.default_language')`,
      ),
    ]);

    const settings = {};
    for (const row of settingsRows) settings[row.setting_key] = safeJson(row.value_json, {});

    response.json({
      ok: true,
      user: request.auth.user,
      csrfToken: request.auth.csrfToken,
      save: saveRows[0] ? {
        data: saveRows[0].save_data,
        revision: Number(saveRows[0].revision),
        clientVersion: saveRows[0].client_version,
        updatedAt: saveRows[0].updated_at,
      } : null,
      announcements: announcementRows.map(row => ({
        id: Number(row.id),
        titleDe: row.title_de,
        titleEn: row.title_en,
        bodyDe: row.body_de,
        bodyEn: row.body_en,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      })),
      commands: commandRows.map(row => ({
        id: Number(row.id),
        type: row.command_type,
        payload: safeJson(row.payload_json, {}),
        createdAt: row.created_at,
      })),
      settings,
    });
  }));

  app.put('/api/game/save', auth.requireAuth, auth.requireCsrf, asyncRoute(async (request, response) => {
    const data = request.body?.data;
    const clientVersion = String(request.body?.clientVersion || '').slice(0, 64) || null;
    if (typeof data !== 'string' || data.length === 0) {
      response.status(400).json({ ok: false, error: 'invalid_save' });
      return;
    }
    if (Buffer.byteLength(data, 'utf8') > MAX_SAVE_BYTES) {
      response.status(413).json({ ok: false, error: 'save_too_large', maxBytes: MAX_SAVE_BYTES });
      return;
    }

    await database.execute(
      `INSERT INTO sublevel_saves (user_id, save_data, revision, client_version)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         save_data = VALUES(save_data),
         revision = revision + 1,
         client_version = VALUES(client_version),
         updated_at = CURRENT_TIMESTAMP`,
      [request.auth.user.id, data, clientVersion],
    );
    const [rows] = await database.execute(
      'SELECT revision, updated_at FROM sublevel_saves WHERE user_id = ?',
      [request.auth.user.id],
    );
    response.json({ ok: true, revision: Number(rows[0].revision), updatedAt: rows[0].updated_at });
  }));

  app.delete('/api/game/save', auth.requireAuth, auth.requireCsrf, asyncRoute(async (request, response) => {
    await database.execute('DELETE FROM sublevel_saves WHERE user_id = ?', [request.auth.user.id]);
    await audit(request, 'game.save_deleted', 'user', request.auth.user.id);
    response.json({ ok: true });
  }));

  app.post('/api/game/commands/:id/complete', auth.requireAuth, auth.requireCsrf, asyncRoute(async (request, response) => {
    const commandId = Number.parseInt(request.params.id, 10);
    const success = request.body?.success !== false;
    const message = String(request.body?.message || '').slice(0, 500) || null;
    const [result] = await database.execute(
      `UPDATE sublevel_guardian_commands
       SET status = ?, result_message = ?, processed_at = UTC_TIMESTAMP()
       WHERE id = ? AND target_user_id = ? AND status = 'pending'`,
      [success ? 'completed' : 'failed', message, commandId, request.auth.user.id],
    );
    response.json({ ok: true, updated: result.affectedRows > 0 });
  }));

  app.get('/api/guardian/dashboard', auth.requireGuardian, asyncRoute(async (_request, response) => {
    const [[userCounts], [saveCounts], [sessionCounts], [commandCounts], [recentUsers]] = await Promise.all([
      database.query(`SELECT COUNT(*) AS total, SUM(role = 'guardian') AS guardians, SUM(enabled = 1) AS enabled FROM sublevel_users`),
      database.query(`SELECT COUNT(*) AS total, MAX(updated_at) AS latest FROM sublevel_saves`),
      database.query(`SELECT COUNT(*) AS active FROM sublevel_sessions WHERE expires_at > UTC_TIMESTAMP()`),
      database.query(`SELECT COUNT(*) AS pending FROM sublevel_guardian_commands WHERE status = 'pending'`),
      database.query(`SELECT id, username, email, role, language, enabled, created_at, updated_at, last_login_at FROM sublevel_users ORDER BY created_at DESC LIMIT 8`),
    ]);

    response.json({
      ok: true,
      metrics: {
        users: Number(userCounts[0].total || 0),
        guardians: Number(userCounts[0].guardians || 0),
        enabledUsers: Number(userCounts[0].enabled || 0),
        saves: Number(saveCounts[0].total || 0),
        latestSaveAt: saveCounts[0].latest || null,
        activeSessions: Number(sessionCounts[0].active || 0),
        pendingCommands: Number(commandCounts[0].pending || 0),
      },
      recentUsers: recentUsers.map(serializeUser),
    });
  }));

  app.get('/api/guardian/users', auth.requireGuardian, asyncRoute(async (request, response) => {
    const search = String(request.query.search || '').trim();
    const params = [];
    let where = '';
    if (search) {
      where = 'WHERE u.username LIKE ? OR u.email LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    const [rows] = await database.execute(
      `SELECT u.id, u.username, u.email, u.role, u.language, u.enabled, u.created_at, u.updated_at, u.last_login_at,
              s.user_id IS NOT NULL AS has_save, s.updated_at AS save_updated_at
       FROM sublevel_users u
       LEFT JOIN sublevel_saves s ON s.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT 500`,
      params,
    );
    response.json({ ok: true, users: rows.map(serializeUser) });
  }));

  app.post('/api/guardian/users', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const guardian = validateGuardianInput(request.body || {});
    const role = request.body?.role === 'guardian' ? 'guardian' : 'player';
    const passwordHash = await hashPassword(guardian.password);
    const [result] = await database.execute(
      `INSERT INTO sublevel_users (username, email, password_hash, role, language, enabled)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [guardian.username, guardian.email, passwordHash, role, guardian.language],
    );
    await audit(request, 'guardian.user_created', 'user', result.insertId, { role });
    response.status(201).json({ ok: true, id: Number(result.insertId) });
  }));

  app.patch('/api/guardian/users/:id', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const userId = Number.parseInt(request.params.id, 10);
    const [rows] = await database.execute('SELECT id, role, enabled FROM sublevel_users WHERE id = ?', [userId]);
    const target = rows[0];
    if (!target) {
      response.status(404).json({ ok: false, error: 'user_not_found' });
      return;
    }

    const updates = [];
    const params = [];
    if (request.body.username !== undefined) {
      const username = String(request.body.username || '').trim();
      if (!USERNAME_PATTERN.test(username)) throw new Error('Ungültiger Benutzername.');
      updates.push('username = ?'); params.push(username);
    }
    if (request.body.email !== undefined) {
      const email = String(request.body.email || '').trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) throw new Error('Ungültige E-Mail-Adresse.');
      updates.push('email = ?'); params.push(email);
    }
    if (request.body.language !== undefined) {
      updates.push('language = ?'); params.push(languageValue(request.body.language));
    }
    if (request.body.role !== undefined) {
      const role = request.body.role === 'guardian' ? 'guardian' : 'player';
      if (target.role === 'guardian' && role !== 'guardian') {
        const [countRows] = await database.query(`SELECT COUNT(*) AS total FROM sublevel_users WHERE role = 'guardian' AND enabled = 1 AND id <> ?`, [userId]);
        if (Number(countRows[0].total) < 1) throw new Error('Der letzte aktive Wächter kann nicht herabgestuft werden.');
      }
      updates.push('role = ?'); params.push(role);
    }
    if (request.body.enabled !== undefined) {
      const enabled = booleanValue(request.body.enabled);
      if (target.role === 'guardian' && !enabled) {
        const [countRows] = await database.query(`SELECT COUNT(*) AS total FROM sublevel_users WHERE role = 'guardian' AND enabled = 1 AND id <> ?`, [userId]);
        if (Number(countRows[0].total) < 1) throw new Error('Der letzte aktive Wächter kann nicht deaktiviert werden.');
      }
      updates.push('enabled = ?'); params.push(enabled ? 1 : 0);
    }

    if (updates.length === 0) {
      response.json({ ok: true, updated: false });
      return;
    }
    params.push(userId);
    await database.execute(`UPDATE sublevel_users SET ${updates.join(', ')} WHERE id = ?`, params);
    await audit(request, 'guardian.user_updated', 'user', userId, request.body);
    response.json({ ok: true, updated: true });
  }));

  app.post('/api/guardian/users/:id/password', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const userId = Number.parseInt(request.params.id, 10);
    const passwordHash = await hashPassword(String(request.body?.password || ''));
    const [result] = await database.execute('UPDATE sublevel_users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    if (!result.affectedRows) {
      response.status(404).json({ ok: false, error: 'user_not_found' });
      return;
    }
    await database.execute('DELETE FROM sublevel_sessions WHERE user_id = ? AND user_id <> ?', [userId, request.auth.user.id]).catch(() => {});
    await audit(request, 'guardian.password_reset', 'user', userId);
    response.json({ ok: true });
  }));

  app.get('/api/guardian/item-definitions', auth.requireGuardian, asyncRoute(async (_request, response) => {
    const itemPath = path.join(rootDirectory, 'src', 'game', 'data', 'ItemData.json');
    const raw = await readFile(itemPath, 'utf8');
    const itemData = JSON.parse(raw);
    const items = Object.entries(itemData).map(([id, item]) => ({
      id,
      type: item.type || 'other',
      level: item.level || null,
      craftable: Boolean(item.isCraftable),
      equippable: Boolean(item.isEquippable),
      useable: Boolean(item.isUseable),
    }));
    response.json({ ok: true, items });
  }));

  app.get('/api/guardian/items', auth.requireGuardian, asyncRoute(async (_request, response) => {
    const [rows] = await database.query('SELECT * FROM sublevel_items ORDER BY updated_at DESC LIMIT 1000');
    response.json({ ok: true, items: rows.map(row => ({
      id: Number(row.id),
      gameItemId: row.game_item_id,
      nameDe: row.name_de,
      nameEn: row.name_en,
      descriptionDe: row.description_de,
      descriptionEn: row.description_en,
      category: row.category,
      enabled: Boolean(row.enabled),
      metadata: safeJson(row.metadata_json, {}),
      updatedAt: row.updated_at,
    })) });
  }));

  app.post('/api/guardian/items', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const gameItemId = String(request.body?.gameItemId || '').trim();
    if (!ITEM_ID_PATTERN.test(gameItemId)) throw new Error('Ungültige Gegenstands-ID.');
    const nameDe = String(request.body?.nameDe || gameItemId).trim().slice(0, 255);
    const nameEn = String(request.body?.nameEn || gameItemId).trim().slice(0, 255);
    const [result] = await database.execute(
      `INSERT INTO sublevel_items
        (game_item_id, name_de, name_en, description_de, description_en, category, enabled, metadata_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name_de = VALUES(name_de), name_en = VALUES(name_en),
         description_de = VALUES(description_de), description_en = VALUES(description_en),
         category = VALUES(category), enabled = VALUES(enabled), metadata_json = VALUES(metadata_json)`,
      [
        gameItemId,
        nameDe,
        nameEn,
        String(request.body?.descriptionDe || '').slice(0, 10_000) || null,
        String(request.body?.descriptionEn || '').slice(0, 10_000) || null,
        String(request.body?.category || 'other').slice(0, 80),
        booleanValue(request.body?.enabled, true) ? 1 : 0,
        JSON.stringify(request.body?.metadata || {}),
        request.auth.user.id,
      ],
    );
    await audit(request, 'guardian.item_saved', 'item', gameItemId);
    response.status(201).json({ ok: true, id: Number(result.insertId || 0), gameItemId });
  }));

  app.patch('/api/guardian/items/:id', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const itemId = Number.parseInt(request.params.id, 10);
    const fields = {
      nameDe: 'name_de', nameEn: 'name_en', descriptionDe: 'description_de', descriptionEn: 'description_en', category: 'category', enabled: 'enabled', metadata: 'metadata_json',
    };
    const updates = [];
    const params = [];
    for (const [key, column] of Object.entries(fields)) {
      if (request.body[key] === undefined) continue;
      let value = request.body[key];
      if (key === 'enabled') value = booleanValue(value) ? 1 : 0;
      else if (key === 'metadata') value = JSON.stringify(value || {});
      else value = String(value || '');
      updates.push(`${column} = ?`); params.push(value);
    }
    if (!updates.length) return response.json({ ok: true, updated: false });
    params.push(itemId);
    const [result] = await database.execute(`UPDATE sublevel_items SET ${updates.join(', ')} WHERE id = ?`, params);
    await audit(request, 'guardian.item_updated', 'item', itemId, request.body);
    response.json({ ok: true, updated: result.affectedRows > 0 });
  }));

  app.delete('/api/guardian/items/:id', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const itemId = Number.parseInt(request.params.id, 10);
    const [result] = await database.execute('DELETE FROM sublevel_items WHERE id = ?', [itemId]);
    await audit(request, 'guardian.item_deleted', 'item', itemId);
    response.json({ ok: true, deleted: result.affectedRows > 0 });
  }));

  app.get('/api/guardian/announcements', auth.requireGuardian, asyncRoute(async (_request, response) => {
    const [rows] = await database.query('SELECT * FROM sublevel_announcements ORDER BY created_at DESC LIMIT 500');
    response.json({ ok: true, announcements: rows.map(row => ({
      id: Number(row.id), titleDe: row.title_de, titleEn: row.title_en, bodyDe: row.body_de, bodyEn: row.body_en,
      active: Boolean(row.active), startsAt: row.starts_at, endsAt: row.ends_at, createdAt: row.created_at, updatedAt: row.updated_at,
    })) });
  }));

  app.post('/api/guardian/announcements', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const [result] = await database.execute(
      `INSERT INTO sublevel_announcements
        (title_de, title_en, body_de, body_en, active, starts_at, ends_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(request.body?.titleDe || '').slice(0, 255),
        String(request.body?.titleEn || '').slice(0, 255),
        String(request.body?.bodyDe || '').slice(0, 50_000),
        String(request.body?.bodyEn || '').slice(0, 50_000),
        booleanValue(request.body?.active, true) ? 1 : 0,
        request.body?.startsAt || null,
        request.body?.endsAt || null,
        request.auth.user.id,
      ],
    );
    await audit(request, 'guardian.announcement_created', 'announcement', result.insertId);
    response.status(201).json({ ok: true, id: Number(result.insertId) });
  }));

  app.patch('/api/guardian/announcements/:id', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const id = Number.parseInt(request.params.id, 10);
    const mapping = { titleDe: 'title_de', titleEn: 'title_en', bodyDe: 'body_de', bodyEn: 'body_en', active: 'active', startsAt: 'starts_at', endsAt: 'ends_at' };
    const updates = [];
    const params = [];
    for (const [key, column] of Object.entries(mapping)) {
      if (request.body[key] === undefined) continue;
      let value = request.body[key];
      if (key === 'active') value = booleanValue(value) ? 1 : 0;
      else if (key === 'startsAt' || key === 'endsAt') value = value || null;
      else value = String(value || '');
      updates.push(`${column} = ?`); params.push(value);
    }
    if (!updates.length) return response.json({ ok: true, updated: false });
    params.push(id);
    const [result] = await database.execute(`UPDATE sublevel_announcements SET ${updates.join(', ')} WHERE id = ?`, params);
    await audit(request, 'guardian.announcement_updated', 'announcement', id, request.body);
    response.json({ ok: true, updated: result.affectedRows > 0 });
  }));

  app.get('/api/guardian/commands', auth.requireGuardian, asyncRoute(async (_request, response) => {
    const [rows] = await database.query(
      `SELECT c.*, u.username AS target_username, creator.username AS creator_username
       FROM sublevel_guardian_commands c
       LEFT JOIN sublevel_users u ON u.id = c.target_user_id
       LEFT JOIN sublevel_users creator ON creator.id = c.created_by
       ORDER BY c.created_at DESC LIMIT 1000`,
    );
    response.json({ ok: true, commands: rows.map(row => ({
      id: Number(row.id), targetUserId: row.target_user_id ? Number(row.target_user_id) : null,
      targetUsername: row.target_username, type: row.command_type, payload: safeJson(row.payload_json, {}),
      status: row.status, resultMessage: row.result_message, creatorUsername: row.creator_username,
      createdAt: row.created_at, processedAt: row.processed_at,
    })) });
  }));

  app.post('/api/guardian/commands', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const targetUserId = Number.parseInt(request.body?.targetUserId, 10);
    const type = String(request.body?.type || '');
    const payload = request.body?.payload || {};
    if (!Number.isInteger(targetUserId) || targetUserId < 1) throw new Error('Ein Zielspieler muss ausgewählt werden.');
    if (!COMMAND_TYPES.has(type)) throw new Error('Dieser Wächterbefehl wird nicht unterstützt.');
    const [result] = await database.execute(
      `INSERT INTO sublevel_guardian_commands (target_user_id, command_type, payload_json, created_by)
       VALUES (?, ?, ?, ?)`,
      [targetUserId, type, JSON.stringify(payload), request.auth.user.id],
    );
    await audit(request, 'guardian.command_created', 'command', result.insertId, { targetUserId, type, payload });
    response.status(201).json({ ok: true, id: Number(result.insertId) });
  }));

  app.patch('/api/guardian/commands/:id', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const id = Number.parseInt(request.params.id, 10);
    const status = request.body?.status === 'cancelled' ? 'cancelled' : null;
    if (!status) throw new Error('Nur das Abbrechen eines Befehls ist hier erlaubt.');
    const [result] = await database.execute(
      `UPDATE sublevel_guardian_commands SET status = ?, processed_at = UTC_TIMESTAMP()
       WHERE id = ? AND status = 'pending'`,
      [status, id],
    );
    await audit(request, 'guardian.command_cancelled', 'command', id);
    response.json({ ok: true, updated: result.affectedRows > 0 });
  }));

  app.get('/api/guardian/settings', auth.requireGuardian, asyncRoute(async (_request, response) => {
    const [rows] = await database.query('SELECT setting_key, value_json, updated_at FROM sublevel_settings ORDER BY setting_key');
    response.json({ ok: true, settings: rows.map(row => ({ key: row.setting_key, value: safeJson(row.value_json, {}), updatedAt: row.updated_at })) });
  }));

  app.put('/api/guardian/settings/:key', auth.requireGuardian, auth.requireCsrf, asyncRoute(async (request, response) => {
    const key = String(request.params.key || '').slice(0, 120);
    if (!/^[A-Za-z0-9_.-]+$/.test(key)) throw new Error('Ungültiger Einstellungsschlüssel.');
    await database.execute(
      `INSERT INTO sublevel_settings (setting_key, value_json, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_by = VALUES(updated_by)`,
      [key, JSON.stringify(request.body?.value ?? {}), request.auth.user.id],
    );
    await audit(request, 'guardian.setting_updated', 'setting', key, request.body?.value ?? {});
    response.json({ ok: true });
  }));

  app.get('/api/guardian/audit', auth.requireGuardian, asyncRoute(async (request, response) => {
    const limit = Math.min(1000, Math.max(1, Number.parseInt(request.query.limit || '250', 10)));
    const [rows] = await database.execute(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details_json, a.created_at, u.username AS actor_username
       FROM sublevel_audit_log a
       LEFT JOIN sublevel_users u ON u.id = a.actor_user_id
       ORDER BY a.created_at DESC LIMIT ${limit}`,
    );
    response.json({ ok: true, entries: rows.map(row => ({
      id: Number(row.id), action: row.action, entityType: row.entity_type, entityId: row.entity_id,
      details: safeJson(row.details_json, null), createdAt: row.created_at, actorUsername: row.actor_username || 'System',
    })) });
  }));
}
