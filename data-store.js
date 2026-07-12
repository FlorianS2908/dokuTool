import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { publicAiConfig } from './src/server/ai/ai-key-store.js';

const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';

function now() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function stripJsonBom(raw) {
  return String(raw || '').replace(/^\uFEFF/, '');
}

function withoutPassword(user) {
  if (!user) return null;
  const {
    passwordHash,
    passwordSalt,
    passwordIterations,
    aiConfig,
    ...publicUser
  } = user;
  return {
    ...publicUser,
    aiConfig: publicAiConfig(aiConfig)
  };
}

function compactReportEntry(entry) {
  const report = entry.report || {};
  return {
    id: entry.id,
    userId: entry.userId,
    createdAt: entry.createdAt,
    projectTitle: entry.projectTitle || '',
    documentFileName: entry.documentFileName || '',
    applicationFileName: entry.applicationFileName || '',
    ihkProfile: entry.ihkProfile || 'allgemein',
    score: report.summary?.score ?? null,
    grade: report.summary?.grade ?? '',
    redCount: report.summary?.redCount ?? 0,
    yellowCount: report.summary?.yellowCount ?? 0,
    grayCount: report.summary?.grayCount ?? 0,
    aiUsed: Boolean(report.ai?.used)
  };
}

function isExpired(expiresAt) {
  return !expiresAt || Date.now() > new Date(expiresAt).getTime();
}

export function toPublicUser(user) {
  return withoutPassword(user);
}

class LocalJsonStore {
  constructor() {
    const dataDir = process.env.LOCAL_DATA_DIR || '.data';
    this.filePath = path.resolve(process.cwd(), dataDir, 'store.json');
    this.kind = 'local-json';
  }

  async read() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const data = JSON.parse(stripJsonBom(raw));
      return {
        users: Array.isArray(data.users) ? data.users : [],
        reports: Array.isArray(data.reports) ? data.reports : [],
        sessions: Array.isArray(data.sessions) ? data.sessions : []
      };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { users: [], reports: [], sessions: [] };
    }
  }

  async write(data) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  async findUserByEmail(email) {
    const data = await this.read();
    const emailLower = normalizeEmail(email);
    return data.users.find((user) => user.emailLower === emailLower) || null;
  }

  async getUser(userId) {
    const data = await this.read();
    return data.users.find((user) => user.id === userId) || null;
  }

  async createUser(user) {
    const data = await this.read();
    const emailLower = normalizeEmail(user.email);
    if (data.users.some((existing) => existing.emailLower === emailLower)) {
      const error = new Error('Diese E-Mail-Adresse ist bereits registriert.');
      error.code = 'EMAIL_EXISTS';
      throw error;
    }

    const storedUser = {
      ...user,
      id: randomUUID(),
      emailLower,
      createdAt: now(),
      updatedAt: now()
    };
    data.users.push(storedUser);
    await this.write(data);
    return storedUser;
  }

  async updateUserProfile(userId, patch) {
    const data = await this.read();
    const index = data.users.findIndex((user) => user.id === userId);
    if (index === -1) return null;

    data.users[index] = {
      ...data.users[index],
      ...patch,
      updatedAt: now()
    };
    await this.write(data);
    return data.users[index];
  }

  async updateUserAiConfig(userId, aiConfigPatch) {
    const data = await this.read();
    const index = data.users.findIndex((user) => user.id === userId);
    if (index === -1) return null;

    data.users[index] = {
      ...data.users[index],
      aiConfig: {
        ...(data.users[index].aiConfig || {}),
        ...aiConfigPatch
      },
      updatedAt: now()
    };
    await this.write(data);
    return data.users[index];
  }

  async clearUserAiConfig(userId) {
    const data = await this.read();
    const index = data.users.findIndex((user) => user.id === userId);
    if (index === -1) return null;

    data.users[index] = {
      ...data.users[index],
      aiConfig: null,
      updatedAt: now()
    };
    await this.write(data);
    return data.users[index];
  }

  async createReport(userId, entry) {
    const data = await this.read();
    const storedEntry = {
      ...entry,
      id: randomUUID(),
      userId,
      createdAt: now()
    };
    data.reports.push(storedEntry);
    await this.write(data);
    return compactReportEntry(storedEntry);
  }

  async listReports(userId) {
    const data = await this.read();
    return data.reports
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map(compactReportEntry);
  }

  async getReport(userId, reportId) {
    const data = await this.read();
    const entry = data.reports.find((item) => item.userId === userId && item.id === reportId);
    return entry || null;
  }

  async createSession(session) {
    const data = await this.read();
    data.sessions = data.sessions
      .filter((entry) => !isExpired(entry.expiresAt) && entry.id !== session.id);
    const storedSession = {
      ...session,
      createdAt: session.createdAt || now(),
      lastSeenAt: session.lastSeenAt || now()
    };
    data.sessions.push(storedSession);
    await this.write(data);
    return storedSession;
  }

  async getSession(sessionId) {
    const data = await this.read();
    const session = data.sessions.find((entry) => entry.id === sessionId) || null;
    if (!session) return null;
    if (!isExpired(session.expiresAt)) return session;

    data.sessions = data.sessions.filter((entry) => entry.id !== sessionId);
    await this.write(data);
    return null;
  }

  async touchSession(sessionId) {
    const data = await this.read();
    const index = data.sessions.findIndex((entry) => entry.id === sessionId);
    if (index === -1 || isExpired(data.sessions[index].expiresAt)) return null;

    data.sessions[index] = {
      ...data.sessions[index],
      lastSeenAt: now()
    };
    await this.write(data);
    return data.sessions[index];
  }

  async deleteSession(sessionId) {
    const data = await this.read();
    data.sessions = data.sessions.filter((entry) => entry.id !== sessionId);
    await this.write(data);
  }
}

class FirestoreStore {
  constructor(db) {
    this.db = db;
    this.kind = 'firestore';
  }

  users() {
    return this.db.collection(USERS_COLLECTION);
  }

  reports(userId) {
    return this.users().doc(userId).collection('reports');
  }

  sessions() {
    return this.db.collection(SESSIONS_COLLECTION);
  }

  docToUser(doc) {
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async findUserByEmail(email) {
    const snapshot = await this.users()
      .where('emailLower', '==', normalizeEmail(email))
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return this.docToUser(snapshot.docs[0]);
  }

  async getUser(userId) {
    const doc = await this.users().doc(userId).get();
    return this.docToUser(doc);
  }

  async createUser(user) {
    const emailLower = normalizeEmail(user.email);
    const existing = await this.findUserByEmail(emailLower);
    if (existing) {
      const error = new Error('Diese E-Mail-Adresse ist bereits registriert.');
      error.code = 'EMAIL_EXISTS';
      throw error;
    }

    const id = randomUUID();
    const storedUser = {
      ...user,
      emailLower,
      createdAt: now(),
      updatedAt: now()
    };
    await this.users().doc(id).set(storedUser);
    return { id, ...storedUser };
  }

  async updateUserProfile(userId, patch) {
    const ref = this.users().doc(userId);
    await ref.set({ ...patch, updatedAt: now() }, { merge: true });
    return this.getUser(userId);
  }

  async updateUserAiConfig(userId, aiConfigPatch) {
    const ref = this.users().doc(userId);
    await ref.set({
      aiConfig: aiConfigPatch,
      updatedAt: now()
    }, { merge: true });
    return this.getUser(userId);
  }

  async clearUserAiConfig(userId) {
    const ref = this.users().doc(userId);
    await ref.set({
      aiConfig: null,
      updatedAt: now()
    }, { merge: true });
    return this.getUser(userId);
  }

  async createReport(userId, entry) {
    const id = randomUUID();
    const storedEntry = {
      ...entry,
      userId,
      createdAt: now()
    };
    await this.reports(userId).doc(id).set(storedEntry);
    return compactReportEntry({ id, ...storedEntry });
  }

  async listReports(userId) {
    const snapshot = await this.reports(userId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return snapshot.docs.map((doc) => compactReportEntry({ id: doc.id, ...doc.data() }));
  }

  async getReport(userId, reportId) {
    const doc = await this.reports(userId).doc(reportId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async createSession(session) {
    const storedSession = {
      ...session,
      createdAt: session.createdAt || now(),
      lastSeenAt: session.lastSeenAt || now()
    };
    await this.sessions().doc(session.id).set(storedSession);
    return storedSession;
  }

  async getSession(sessionId) {
    const doc = await this.sessions().doc(sessionId).get();
    if (!doc.exists) return null;
    const session = { id: doc.id, ...doc.data() };
    if (!isExpired(session.expiresAt)) return session;

    await this.deleteSession(sessionId);
    return null;
  }

  async touchSession(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) return null;
    await this.sessions().doc(sessionId).set({ lastSeenAt: now() }, { merge: true });
    return { ...session, lastSeenAt: now() };
  }

  async deleteSession(sessionId) {
    await this.sessions().doc(sessionId).delete();
  }
}

async function createFirestoreStore() {
  const appModule = await import('firebase-admin/app');
  const firestoreModule = await import('firebase-admin/firestore');
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const appOptions = {};

  if (process.env.FIRESTORE_PROJECT_ID) {
    appOptions.projectId = process.env.FIRESTORE_PROJECT_ID;
  }

  if (serviceAccountBase64) {
    const json = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
    appOptions.credential = appModule.cert(JSON.parse(stripJsonBom(json)));
  } else {
    appOptions.credential = appModule.applicationDefault();
  }

  const app = appModule.getApps().length
    ? appModule.getApps()[0]
    : appModule.initializeApp(appOptions);

  return new FirestoreStore(firestoreModule.getFirestore(app));
}

export async function createDataStore() {
  if (process.env.FIRESTORE_ENABLED === 'true') {
    return createFirestoreStore();
  }
  return new LocalJsonStore();
}
