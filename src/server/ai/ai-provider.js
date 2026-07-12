import { readFileSync } from 'node:fs';
import OpenAI from 'openai';
import { getUserApiKey, hasUserApiKey, publicAiConfig, maskApiKey } from './ai-key-store.js';

const PROVIDER = 'openai';
const DEFAULT_MODEL = 'gpt-5.5';
const PLACEHOLDER_KEYS = new Set(['dein_api_key_hier', 'dein_standard_key', '']);

function modelName() {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

function cleanKey(value) {
  return String(value || '').trim();
}

function isUsableKey(value) {
  const key = cleanKey(value);
  return key.length >= 20 && !PLACEHOLDER_KEYS.has(key);
}

function readDefaultFileKey() {
  const filePath = String(process.env.DEFAULT_OPENAI_API_KEY_FILE || '').trim();
  if (!filePath) return null;
  try {
    const key = readFileSync(filePath, 'utf8').trim();
    if (!isUsableKey(key)) return null;
    return {
      apiKey: key,
      keySource: 'default_file'
    };
  } catch {
    return null;
  }
}

export function resolveDefaultApiKey() {
  const fileKey = readDefaultFileKey();
  if (fileKey) return fileKey;

  if (isUsableKey(process.env.API_KEY_DOKU_TOOL)) {
    return {
      apiKey: cleanKey(process.env.API_KEY_DOKU_TOOL),
      keySource: 'api_key_doku_tool'
    };
  }

  if (isUsableKey(process.env.OPENAI_API_KEY)) {
    return {
      apiKey: cleanKey(process.env.OPENAI_API_KEY),
      keySource: 'openai_env'
    };
  }

  return null;
}

function userKeyConfig(user) {
  if (!hasUserApiKey(user)) return null;
  try {
    const apiKey = getUserApiKey(user);
    if (!isUsableKey(apiKey)) return null;
    return {
      apiKey,
      keySource: 'user'
    };
  } catch (error) {
    return {
      apiKey: null,
      keySource: 'none',
      userKeyError: error?.message || 'Gespeicherter API-Key konnte nicht entschluesselt werden.'
    };
  }
}

export function getEffectiveAiConfig(user) {
  const defaultKey = resolveDefaultApiKey();
  const ownKey = userKeyConfig(user);
  const selected = ownKey?.apiKey ? ownKey : defaultKey;
  const publicConfig = publicAiConfig(user?.aiConfig);

  return {
    provider: PROVIDER,
    model: modelName(),
    apiKey: selected?.apiKey || null,
    keySource: selected?.keySource || 'none',
    effectiveKeySource: selected?.keySource || 'none',
    hasOwnKey: publicConfig.hasOwnKey,
    keyMask: publicConfig.keyMask || (selected?.apiKey ? maskApiKey(selected.apiKey) : ''),
    updatedAt: publicConfig.updatedAt,
    usingDefaultKey: Boolean(selected?.apiKey && selected.keySource !== 'user'),
    defaultKeyAvailable: Boolean(defaultKey?.apiKey),
    userKeyError: ownKey?.userKeyError || null
  };
}

export function createAiClientForUser(user) {
  const config = getEffectiveAiConfig(user);
  if (!config.apiKey) {
    throw new Error('KI-Pruefung konnte nicht ausgefuehrt werden, da kein API-Key verfuegbar ist.');
  }
  return new OpenAI({ apiKey: config.apiKey });
}

export function hasEffectiveAiKey(user) {
  return Boolean(getEffectiveAiConfig(user).apiKey);
}

export function getAiProviderInfo(user) {
  const config = getEffectiveAiConfig(user);
  return {
    provider: config.provider,
    model: config.model,
    hasOwnKey: config.hasOwnKey,
    keyMask: config.hasOwnKey ? config.keyMask : '',
    usingDefaultKey: config.usingDefaultKey,
    defaultKeyAvailable: config.defaultKeyAvailable,
    effectiveKeySource: config.effectiveKeySource,
    updatedAt: config.updatedAt,
    userKeyError: config.userKeyError
  };
}
