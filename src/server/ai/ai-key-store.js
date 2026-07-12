import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const PROVIDER = 'openai';
let warnedAboutSecret = false;
const localEphemeralSecret = randomBytes(32).toString('base64url');

function now() {
  return new Date().toISOString();
}

function warnIfUnstableSecret(source) {
  if (source === 'ai_key_secret' || warnedAboutSecret) return;
  warnedAboutSecret = true;
  console.warn('AI_KEY_ENCRYPTION_SECRET sollte gesetzt werden, damit gespeicherte User-Keys nach Neustart entschluesselbar bleiben.');
}

function encryptionSecret() {
  if (process.env.AI_KEY_ENCRYPTION_SECRET) {
    return { value: process.env.AI_KEY_ENCRYPTION_SECRET, source: 'ai_key_secret' };
  }
  if (process.env.AUTH_SESSION_SECRET) {
    return { value: process.env.AUTH_SESSION_SECRET, source: 'auth_session_secret' };
  }
  return { value: localEphemeralSecret, source: 'ephemeral_local_secret' };
}

function encryptionKey() {
  const secret = encryptionSecret();
  warnIfUnstableSecret(secret.source);
  return createHash('sha256').update(secret.value).digest();
}

function normalizeApiKey(apiKey) {
  return String(apiKey || '').trim();
}

export function maskApiKey(key) {
  const value = normalizeApiKey(key);
  if (!value) return '';
  if (value.length <= 12) return `${value.slice(0, 3)}...${value.slice(-2)}`;
  return `${value.slice(0, 3)}...${value.slice(-4)}`;
}

export function encryptApiKey(key) {
  const apiKey = normalizeApiKey(key);
  if (!apiKey) {
    throw new Error('API-Key fehlt.');
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedApiKey: encrypted.toString('base64url'),
    iv: iv.toString('base64url'),
    authTag: authTag.toString('base64url')
  };
}

export function decryptApiKey(encrypted) {
  const payload = typeof encrypted === 'string' ? { encryptedApiKey: encrypted } : encrypted;
  if (!payload?.encryptedApiKey || !payload?.iv || !payload?.authTag) {
    throw new Error('Gespeicherter API-Key ist unvollstaendig.');
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(payload.iv, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encryptedApiKey, 'base64url')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

export function publicAiConfig(aiConfig) {
  const hasOwnKey = Boolean(
    aiConfig?.useOwnKey &&
    aiConfig?.encryptedApiKey &&
    aiConfig?.iv &&
    aiConfig?.authTag
  );

  return {
    provider: aiConfig?.provider || PROVIDER,
    useOwnKey: Boolean(aiConfig?.useOwnKey),
    keyMask: aiConfig?.keyMask || '',
    updatedAt: aiConfig?.updatedAt || null,
    hasOwnKey
  };
}

export function hasUserApiKey(user) {
  return Boolean(publicAiConfig(user?.aiConfig).hasOwnKey);
}

export function getUserApiKey(user) {
  if (!hasUserApiKey(user)) return null;
  return decryptApiKey(user.aiConfig);
}

export async function setUserApiKey(userId, apiKey, options = {}) {
  const store = options.dataStore;
  if (!store?.updateUserAiConfig) {
    throw new Error('DataStore unterstuetzt keine KI-Konfiguration.');
  }

  const cleanedKey = normalizeApiKey(apiKey);
  const timestamp = now();
  const previous = options.existingConfig || {};
  const aiConfig = {
    provider: options.provider || PROVIDER,
    ...encryptApiKey(cleanedKey),
    createdAt: previous.createdAt || timestamp,
    updatedAt: timestamp,
    keyMask: maskApiKey(cleanedKey),
    useOwnKey: options.useOwnKey !== false
  };

  return store.updateUserAiConfig(userId, aiConfig);
}

export async function clearUserApiKey(userId, options = {}) {
  const store = options.dataStore;
  if (!store?.clearUserAiConfig) {
    throw new Error('DataStore unterstuetzt keine KI-Konfiguration.');
  }
  return store.clearUserAiConfig(userId);
}
