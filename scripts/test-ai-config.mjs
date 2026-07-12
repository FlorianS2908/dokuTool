import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

process.env.AI_KEY_ENCRYPTION_SECRET = 'test-secret-with-enough-length-for-ai-key-encryption';

const {
  decryptApiKey,
  encryptApiKey,
  maskApiKey,
  publicAiConfig,
  buildEncryptedUserKeyConfig,
  clearPublicSecrets
} = await import('../src/server/ai/ai-key-store.js');
const {
  createAiClientForUser,
  getEffectiveAiConfig,
  getAiProviderInfo,
  resolveDefaultApiKey
} = await import('../src/server/ai/ai-provider.js');
const { toPublicUser } = await import('../data-store.js');

const originalEnv = {
  DEFAULT_OPENAI_API_KEY_FILE: process.env.DEFAULT_OPENAI_API_KEY_FILE,
  API_KEY_DOKU_TOOL: process.env.API_KEY_DOKU_TOOL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL
};

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
}

try {
  const fakeUserKey = 'test-user-key-abcdefghijklmnopqrstuvwxyz123456';
  const encrypted = encryptApiKey(fakeUserKey);
  assert.equal(decryptApiKey(encrypted), fakeUserKey);
  assert.equal(maskApiKey(fakeUserKey), 'tes...3456');
  const encryptedConfig = buildEncryptedUserKeyConfig(fakeUserKey);
  assert.equal(decryptApiKey(encryptedConfig), fakeUserKey);

  const publicUser = toPublicUser({
    id: 'u1',
    email: 'user@example.test',
    passwordHash: 'hidden',
    passwordSalt: 'hidden',
    passwordIterations: 1,
    aiConfig: {
      provider: 'openai',
      ...encrypted,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      keyMask: maskApiKey(fakeUserKey),
      useOwnKey: true
    }
  });
  assert.equal(publicUser.passwordHash, undefined);
  assert.equal(publicUser.aiConfig.encryptedApiKey, undefined);
  assert.equal(publicUser.aiConfig.iv, undefined);
  assert.equal(publicUser.aiConfig.authTag, undefined);
  assert.equal(publicUser.aiConfig.hasOwnKey, true);
  assert.equal(publicUser.aiConfig.keyMask, 'tes...3456');

  assert.equal(publicAiConfig(publicUser.aiConfig).hasOwnKey, false);
  assert.equal(clearPublicSecrets({ ...publicUser, aiConfig: encryptedConfig }).aiConfig.hasOwnKey, true);

  const tempDir = mkdtempSync(join(tmpdir(), 'dokutool-ai-config-'));
  const keyFile = join(tempDir, 'openai-key.txt');
  writeFileSync(keyFile, 'test-file-key-abcdefghijklmnopqrstuvwxyz123456', 'utf8');

  process.env.OPENAI_MODEL = 'gpt-5.5';
  process.env.DEFAULT_OPENAI_API_KEY_FILE = keyFile;
  process.env.API_KEY_DOKU_TOOL = 'test-doku-key-abcdefghijklmnopqrstuvwxyz123456';
  process.env.OPENAI_API_KEY = 'test-env-key-abcdefghijklmnopqrstuvwxyz123456';

  let config = getEffectiveAiConfig({});
  assert.equal(config.effectiveKeySource, 'default_file');
  assert.equal(config.defaultKeyAvailable, true);
  assert.equal(resolveDefaultApiKey().keySource, 'default_file');

  delete process.env.DEFAULT_OPENAI_API_KEY_FILE;
  config = getEffectiveAiConfig({});
  assert.equal(config.effectiveKeySource, 'api_key_doku_tool');

  delete process.env.API_KEY_DOKU_TOOL;
  config = getEffectiveAiConfig({});
  assert.equal(config.effectiveKeySource, 'openai_env');

  const userConfig = {
    aiConfig: {
      provider: 'openai',
      ...encryptApiKey(fakeUserKey),
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      keyMask: maskApiKey(fakeUserKey),
      useOwnKey: true
    }
  };
  config = getEffectiveAiConfig(userConfig);
  assert.equal(config.effectiveKeySource, 'user');
  assert.equal(getAiProviderInfo(userConfig).keyMask, 'tes...3456');
  assert.equal(getAiProviderInfo(userConfig).apiKey, undefined);

  delete process.env.OPENAI_API_KEY;
  config = getEffectiveAiConfig({});
  assert.equal(config.effectiveKeySource, 'none');
  assert.throws(() => createAiClientForUser({}), /kein API-Key verfuegbar/i);

  rmSync(tempDir, { recursive: true, force: true });
  console.log('AI config tests completed.');
} finally {
  restoreEnv();
}
