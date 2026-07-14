const DATABASE_NAME_PATTERN = /^[A-Za-z0-9_$-]{1,64}$/;

let mysqlModulePromise = null;

async function loadMysqlModule() {
  if (!mysqlModulePromise) {
    mysqlModulePromise = import('mysql2/promise')
      .then(module => module.default || module)
      .catch(error => {
        mysqlModulePromise = null;
        const driverError = new Error(
          'Der MySQL-Treiber mysql2 ist auf dem Server nicht installiert. Starte beim Deployment die Installation der npm-Abhängigkeiten neu.',
        );
        driverError.code = 'MYSQL_DRIVER_MISSING';
        driverError.cause = error;
        throw driverError;
      });
  }
  return mysqlModulePromise;
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function normalizeDatabaseConfig(input = {}) {
  const database = String(input.database || '').trim();
  if (!DATABASE_NAME_PATTERN.test(database)) {
    throw new Error('Der Datenbankname enthält ungültige Zeichen.');
  }

  const host = String(input.host || '').trim();
  const user = String(input.user || '').trim();
  const password = String(input.password || '');
  const port = Number.parseInt(input.port || '3306', 10);

  if (!host) throw new Error('Der Datenbank-Host fehlt.');
  if (!user) throw new Error('Der Datenbank-Benutzer fehlt.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Der Datenbank-Port ist ungültig.');
  }

  return {
    host,
    port,
    user,
    password,
    database,
    ssl: normalizeBoolean(input.ssl),
  };
}

function connectionOptions(config) {
  const normalized = normalizeDatabaseConfig(config);
  return {
    host: normalized.host,
    port: normalized.port,
    user: normalized.user,
    password: normalized.password,
    database: normalized.database,
    charset: 'utf8mb4',
    timezone: 'Z',
    connectTimeout: 12_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ssl: normalized.ssl ? { rejectUnauthorized: false } : undefined,
  };
}

export class DatabaseManager {
  constructor() {
    this.pool = null;
    this.config = null;
    this.lastError = null;
    this.driverLoaded = false;
  }

  get isReady() {
    return Boolean(this.pool);
  }

  async getDriver() {
    try {
      const mysql = await loadMysqlModule();
      this.driverLoaded = true;
      return mysql;
    } catch (error) {
      this.driverLoaded = false;
      this.lastError = error;
      throw error;
    }
  }

  async test(config) {
    const mysql = await this.getDriver();
    const connection = await mysql.createConnection(connectionOptions(config));
    try {
      const [rows] = await connection.query('SELECT VERSION() AS version, DATABASE() AS databaseName');
      return {
        ok: true,
        version: rows[0]?.version || null,
        database: rows[0]?.databaseName || normalizeDatabaseConfig(config).database,
      };
    } finally {
      await connection.end();
    }
  }

  async connect(config) {
    await this.disconnect();
    const mysql = await this.getDriver();
    const normalized = normalizeDatabaseConfig(config);
    const pool = mysql.createPool({
      ...connectionOptions(normalized),
      waitForConnections: true,
      connectionLimit: Number.parseInt(process.env.DB_POOL_SIZE || '10', 10),
      maxIdle: 10,
      idleTimeout: 60_000,
      queueLimit: 0,
      decimalNumbers: true,
    });

    try {
      await pool.query('SELECT 1');
      this.pool = pool;
      this.config = normalized;
      this.lastError = null;
      return this;
    } catch (error) {
      await pool.end().catch(() => {});
      this.lastError = error;
      throw error;
    }
  }

  async disconnect() {
    if (!this.pool) return;
    const pool = this.pool;
    this.pool = null;
    this.config = null;
    await pool.end().catch(() => {});
  }

  ensureReady() {
    if (!this.pool) {
      const error = new Error('Die Datenbank ist derzeit nicht verbunden.');
      error.statusCode = 503;
      throw error;
    }
    return this.pool;
  }

  async query(sql, params = []) {
    const pool = this.ensureReady();
    return pool.query(sql, params);
  }

  async execute(sql, params = []) {
    const pool = this.ensureReady();
    return pool.execute(sql, params);
  }

  async transaction(callback) {
    const pool = this.ensureReady();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  }

  async migrate() {
    const statements = [
      `CREATE TABLE IF NOT EXISTS sublevel_schema (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        schema_version INT UNSIGNED NOT NULL,
        installed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS sublevel_users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(64) NOT NULL,
        email VARCHAR(190) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('guardian','player') NOT NULL DEFAULT 'player',
        language VARCHAR(10) NOT NULL DEFAULT 'DE_DE',
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login_at DATETIME NULL,
        UNIQUE KEY uq_sublevel_users_username (username),
        UNIQUE KEY uq_sublevel_users_email (email),
        KEY idx_sublevel_users_role (role),
        KEY idx_sublevel_users_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS sublevel_sessions (
        token_hash CHAR(64) NOT NULL PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        csrf_token VARCHAR(96) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ip_hash CHAR(64) NULL,
        user_agent VARCHAR(255) NULL,
        CONSTRAINT fk_sublevel_sessions_user FOREIGN KEY (user_id) REFERENCES sublevel_users(id) ON DELETE CASCADE,
        KEY idx_sublevel_sessions_user (user_id),
        KEY idx_sublevel_sessions_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS sublevel_saves (
        user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        save_data MEDIUMTEXT NOT NULL,
        revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
        client_version VARCHAR(64) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sublevel_saves_user FOREIGN KEY (user_id) REFERENCES sublevel_users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS sublevel_settings (
        setting_key VARCHAR(120) NOT NULL PRIMARY KEY,
        value_json LONGTEXT NOT NULL,
        updated_by BIGINT UNSIGNED NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sublevel_settings_user FOREIGN KEY (updated_by) REFERENCES sublevel_users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS sublevel_announcements (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        title_de VARCHAR(255) NOT NULL,
        title_en VARCHAR(255) NOT NULL,
        body_de TEXT NOT NULL,
        body_en TEXT NOT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        starts_at DATETIME NULL,
        ends_at DATETIME NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sublevel_announcements_user FOREIGN KEY (created_by) REFERENCES sublevel_users(id) ON DELETE SET NULL,
        KEY idx_sublevel_announcements_active (active, starts_at, ends_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS sublevel_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        game_item_id VARCHAR(120) NOT NULL,
        name_de VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        description_de TEXT NULL,
        description_en TEXT NULL,
        category VARCHAR(80) NOT NULL DEFAULT 'other',
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        metadata_json LONGTEXT NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_sublevel_items_game_item_id (game_item_id),
        CONSTRAINT fk_sublevel_items_user FOREIGN KEY (created_by) REFERENCES sublevel_users(id) ON DELETE SET NULL,
        KEY idx_sublevel_items_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS sublevel_guardian_commands (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        target_user_id BIGINT UNSIGNED NULL,
        command_type VARCHAR(80) NOT NULL,
        payload_json LONGTEXT NOT NULL,
        status ENUM('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
        result_message VARCHAR(500) NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME NULL,
        CONSTRAINT fk_sublevel_commands_target FOREIGN KEY (target_user_id) REFERENCES sublevel_users(id) ON DELETE CASCADE,
        CONSTRAINT fk_sublevel_commands_creator FOREIGN KEY (created_by) REFERENCES sublevel_users(id) ON DELETE SET NULL,
        KEY idx_sublevel_commands_target_status (target_user_id, status),
        KEY idx_sublevel_commands_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS sublevel_audit_log (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        actor_user_id BIGINT UNSIGNED NULL,
        action VARCHAR(120) NOT NULL,
        entity_type VARCHAR(80) NULL,
        entity_id VARCHAR(120) NULL,
        details_json LONGTEXT NULL,
        ip_hash CHAR(64) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_sublevel_audit_actor FOREIGN KEY (actor_user_id) REFERENCES sublevel_users(id) ON DELETE SET NULL,
        KEY idx_sublevel_audit_created (created_at),
        KEY idx_sublevel_audit_actor (actor_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ];

    for (const statement of statements) {
      await this.query(statement);
    }

    await this.execute(
      `INSERT INTO sublevel_schema (id, schema_version) VALUES (1, 1)
       ON DUPLICATE KEY UPDATE schema_version = VALUES(schema_version)`,
    );

    await this.execute(
      `INSERT INTO sublevel_settings (setting_key, value_json)
       VALUES
         ('game.maintenance', '{"enabled":false,"message_de":"Wartungsarbeiten","message_en":"Maintenance"}'),
         ('game.registration', '{"enabled":false}'),
         ('game.default_language', '{"value":"DE_DE"}')
       ON DUPLICATE KEY UPDATE setting_key = setting_key`,
    );
  }
}

export function databaseErrorMessage(error) {
  const code = error?.code || '';
  if (code === 'MYSQL_DRIVER_MISSING' || code === 'ERR_MODULE_NOT_FOUND') {
    return 'Der MySQL-Treiber mysql2 fehlt auf dem Server. Führe beim Deployment npm install aus und starte die Node.js-Anwendung anschließend neu.';
  }
  if (code === 'ER_ACCESS_DENIED_ERROR') return 'Zugriff verweigert. Prüfe Benutzername und Passwort.';
  if (code === 'ER_BAD_DB_ERROR') return 'Die angegebene Datenbank existiert nicht oder ist nicht erreichbar.';
  if (code === 'ENOTFOUND') return 'Der Datenbank-Host wurde nicht gefunden.';
  if (code === 'ECONNREFUSED') return 'Die Datenbankverbindung wurde abgelehnt.';
  if (code === 'ETIMEDOUT' || code === 'PROTOCOL_CONNECTION_LOST') return 'Die Datenbankverbindung ist abgelaufen.';
  if (code === 'HANDSHAKE_SSL_ERROR') return 'Die SSL-Verbindung zur Datenbank konnte nicht hergestellt werden.';
  return error?.message || 'Die Datenbankverbindung ist fehlgeschlagen.';
}
