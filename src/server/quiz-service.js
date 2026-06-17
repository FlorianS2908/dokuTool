export const quizSourceRepo = 'FlorianSchaffer2908/IHK_APP';

export const quizFachrichtungen = {
  FIAE: {
    label: 'Fachinformatiker/in Anwendungsentwicklung',
    info: 'Softwareentwicklung, Testing, DevOps.'
  },
  FISI: {
    label: 'Fachinformatiker/in Systemintegration',
    info: 'Netzwerke, Server, Betrieb und Support.'
  },
  KaBue: {
    label: 'Kaufmann/-frau fuer Bueromanagement',
    info: 'Organisation, Verwaltung, Kommunikation.'
  },
  Kits: {
    label: 'Kaufleute fuer IT-Systemmanagement',
    info: 'IT-Vertrieb, Beratung, Prozesse.'
  }
};

export const quizRoleTemplates = [
  {
    key: 'user',
    name: 'Lernender',
    description: 'Kann Fragen lesen und Quizdurchlaeufe bearbeiten.',
    builtIn: true,
    permissions: {
      canReadQuestions: true,
      canWriteQuestions: false,
      canDeleteQuestions: false,
      canManageRoles: false,
      canManageUsers: false
    }
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Kann Fragen, Rollen und Benutzer spaeter verwalten.',
    builtIn: true,
    permissions: {
      canReadQuestions: true,
      canWriteQuestions: true,
      canDeleteQuestions: true,
      canManageRoles: true,
      canManageUsers: true
    }
  }
];

export const quizQuestionSchema = {
  firestorePath: 'fragenpools/{poolId}/questions/{questionId}',
  fields: ['topic', 'question', 'type', 'options', 'solution', 'explanation', 'questionIndex']
};

const quizQuestionPoolRoot = 'fragenpools';

function splitDisplayName(displayName = '') {
  const parts = String(displayName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ')
  };
}

export function quizProfileForUser(user) {
  const fallback = splitDisplayName(user?.displayName);
  return {
    firstName: user?.quizProfile?.firstName ?? user?.firstName ?? fallback.firstName,
    lastName: user?.quizProfile?.lastName ?? user?.lastName ?? fallback.lastName,
    fach: user?.quizProfile?.fach ?? user?.fach ?? '',
    role: user?.role || 'user'
  };
}

function isFirestoreQuizEnabled() {
  return process.env.FIRESTORE_ENABLED === 'true';
}

async function getQuizFirestore() {
  if (!isFirestoreQuizEnabled()) {
    const error = new Error('Firestore ist noch nicht aktiviert. Bitte FIRESTORE_ENABLED=true und Service-Account konfigurieren.');
    error.status = 503;
    throw error;
  }

  const { getFirestore } = await import('firebase-admin/firestore');
  return getFirestore();
}

function normalizeQuizPoolId(poolId) {
  const value = String(poolId || '').trim();
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(value)) {
    const error = new Error('Bitte einen gueltigen Fragenpool waehlen.');
    error.status = 400;
    throw error;
  }
  return value;
}

export async function loadQuizQuestionPools() {
  if (!isFirestoreQuizEnabled()) {
    return {
      connected: false,
      root: quizQuestionPoolRoot,
      status: 'Firestore ist noch nicht verbunden. Nach der Verbindung erscheinen hier die Fragenpools.',
      pools: []
    };
  }

  try {
    const db = await getQuizFirestore();
    const snapshot = await db.collection(quizQuestionPoolRoot).get();
    const pools = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data() || {};
      let topics = [];
      let previewCount = 0;

      try {
        const questionSnapshot = await doc.ref
          .collection('questions')
          .orderBy('questionIndex', 'asc')
          .limit(200)
          .get();
        previewCount = questionSnapshot.size;
        topics = Array.from(new Set(
          questionSnapshot.docs
            .map((questionDoc) => String(questionDoc.data()?.topic || '').trim())
            .filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, 'de'));
      } catch {
        topics = [];
      }

      return {
        id: doc.id,
        label: data.label || data.name || data.title || doc.id,
        description: data.description || data.info || '',
        topics,
        previewCount
      };
    }));

    pools.sort((a, b) => String(a.label).localeCompare(String(b.label), 'de'));

    return {
      connected: true,
      root: quizQuestionPoolRoot,
      status: pools.length
        ? `${pools.length} Fragenpool${pools.length === 1 ? '' : 's'} gefunden.`
        : 'Firestore ist verbunden, aber es wurden noch keine Fragenpools gefunden.',
      pools
    };
  } catch (error) {
    return {
      connected: false,
      root: quizQuestionPoolRoot,
      status: `Firestore-Fragenpools konnten nicht geladen werden: ${error.message}`,
      pools: []
    };
  }
}

export async function loadQuizQuestions({ poolId, topic, max }) {
  const db = await getQuizFirestore();
  const normalizedPoolId = normalizeQuizPoolId(poolId);
  const normalizedTopic = String(topic || '').trim();
  const limitValue = Math.min(Math.max(Number(max) || 20, 1), 50);

  const ref = db.collection(quizQuestionPoolRoot).doc(normalizedPoolId).collection('questions');
  let query = ref.orderBy('questionIndex', 'asc').limit(limitValue);
  if (normalizedTopic) {
    query = ref
      .where('topic', '==', normalizedTopic)
      .orderBy('questionIndex', 'asc')
      .limit(limitValue);
  }

  const snapshot = await query.get();
  return {
    poolId: normalizedPoolId,
    topic: normalizedTopic,
    max: limitValue,
    questions: snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
  };
}
