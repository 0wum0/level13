import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CONFIG_VERSION = 1;

function deriveKey(secret) {
  return createHash('sha256').update(secret).digest();
}

export function createRuntimeConfig(rootDirectory) {
  const stateDirectory = process.env.SUBLEVEL_DATA_DIR
    ? path.resolve(process.env.SUBLEVEL_DATA_DIR)
    : path.join(rootDirectory, '.sublevel-data');
  const secretPath = path.join(stateDirectory, 'runtime-secret.key');
  const installationPath = path.join(stateDirectory, 'installation.enc.json');

  let cachedSecret = null;
  let cachedInstallation = undefined;

  async function ensureDirectory() {
    await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
    try { await chmod(stateDirectory, 0o700); } catch {}
  }

  async function getSecret() {
    if (cachedSecret) return cachedSecret;
    await ensureDirectory();

    const envSecret = String(process.env.SUBLEVEL_APP_SECRET || '').trim();
    if (envSecret.length >= 32) {
      cachedSecret = deriveKey(envSecret);
      return cachedSecret;
    }

    try {
      const existing = await readFile(secretPath);
      if (existing.length >= 32) {
        cachedSecret = deriveKey(existing);
        return cachedSecret;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const generated = randomBytes(48);
    await writeFile(secretPath, generated, { mode: 0o600, flag: 'wx' }).catch(async error => {
      if (error.code !== 'EEXIST') throw error;
    });
    try { await chmod(secretPath, 0o600); } catch {}
    const persisted = await readFile(secretPath);
    cachedSecret = deriveKey(persisted);
    return cachedSecret;
  }

  async function encrypt(value) {
    const key = await getSecret();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
      version: CONFIG_VERSION,
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      data: encrypted.toString('base64'),
    };
  }

  async function decrypt(payload) {
    if (!payload || payload.version !== CONFIG_VERSION || payload.algorithm !== 'aes-256-gcm') {
      throw new Error('Unsupported installation configuration format.');
    }
    const key = await getSecret();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.data, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8'));
  }

  async function loadInstallation({ fresh = false } = {}) {
    if (!fresh && cachedInstallation !== undefined) return cachedInstallation;
    await ensureDirectory();
    try {
      const raw = await readFile(installationPath, 'utf8');
      cachedInstallation = await decrypt(JSON.parse(raw));
      return cachedInstallation;
    } catch (error) {
      if (error.code === 'ENOENT') {
        cachedInstallation = null;
        return null;
      }
      error.code = error.code || 'INSTALLATION_CONFIG_INVALID';
      throw error;
    }
  }

  async function saveInstallation(installation) {
    await ensureDirectory();
    const encrypted = await encrypt({
      ...installation,
      version: CONFIG_VERSION,
      savedAt: new Date().toISOString(),
    });
    const temporaryPath = `${installationPath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(encrypted, null, 2), { mode: 0o600 });
    try { await chmod(temporaryPath, 0o600); } catch {}
    await rename(temporaryPath, installationPath);
    try { await chmod(installationPath, 0o600); } catch {}
    cachedInstallation = installation;
    return installation;
  }

  return {
    stateDirectory,
    installationPath,
    loadInstallation,
    saveInstallation,
    async isInstalled() {
      return Boolean(await loadInstallation());
    },
  };
}
