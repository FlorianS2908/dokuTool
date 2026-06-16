import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const USERS_COLLECTION = 'users';

function now() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function withoutPassword(user) {
  if (!user) return null;
  const {
    passwordHash,
    passwordSalt,
    passwordIterations,
    ...publicUser
  } = user;
  return publicUser;
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
      const data = JSON.parse(raw);
      return {
        users: Array.isArray(data.users) ? data.users : [],
        reports: Array.isArray(data.reports) ? data.reports : []
      };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { users: [], reports: [] };
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
    appOptions.credential = appModule.cert(JSON.parse(json));
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
