const appShell = document.querySelector('#appShell');
const authView = document.querySelector('#authView');
const workspaceView = document.querySelector('#workspaceView');
const quizView = document.querySelector('#quizView');
const timerQuizView = document.querySelector('#timerQuizView');
const workspaceGreeting = document.querySelector('#workspaceGreeting');
const openDokuToolButton = document.querySelector('#openDokuToolButton');
const openQuizToolButton = document.querySelector('#openQuizToolButton');
const openSoftwareQuizButton = document.querySelector('#openSoftwareQuizButton');
const openSqlQuizButton = document.querySelector('#openSqlQuizButton');
const openPythonQuizButton = document.querySelector('#openPythonQuizButton');
const backToWorkspaceButton = document.querySelector('#backToWorkspaceButton');
const backToWorkspaceFromDokuButton = document.querySelector('#backToWorkspaceFromDokuButton');
const backToWorkspaceFromTimerButton = document.querySelector('#backToWorkspaceFromTimerButton');
const workspaceTrackButtons = document.querySelectorAll('[data-workspace-track]');
const workspaceTrackPanels = document.querySelectorAll('[data-workspace-panel]');
const timerQuizRoot = document.querySelector('#timerQuizRoot');
const timerQuizViewTitle = document.querySelector('#timerQuizViewTitle');
const timerQuizViewSubtitle = document.querySelector('#timerQuizViewSubtitle');
const timerQuizHintTitle = document.querySelector('#timerQuizHintTitle');
const timerQuizHintText = document.querySelector('#timerQuizHintText');
const quizStatus = document.querySelector('#quizStatus');
const quizFirestorePath = document.querySelector('#quizFirestorePath');
const quizFirstNameInput = document.querySelector('#quizFirstNameInput');
const quizLastNameInput = document.querySelector('#quizLastNameInput');
const quizFachSelect = document.querySelector('#quizFachSelect');
const quizFachInfo = document.querySelector('#quizFachInfo');
const saveQuizProfileButton = document.querySelector('#saveQuizProfileButton');
const quizProfileStatus = document.querySelector('#quizProfileStatus');
const quizRolesList = document.querySelector('#quizRolesList');
const quizQuestionFields = document.querySelector('#quizQuestionFields');
const quizPoolSelect = document.querySelector('#quizPoolSelect');
const quizTopicSelect = document.querySelector('#quizTopicSelect');
const quizQuestionLimitInput = document.querySelector('#quizQuestionLimitInput');
const loadQuizQuestionsButton = document.querySelector('#loadQuizQuestionsButton');
const quizPoolStatus = document.querySelector('#quizPoolStatus');
const quizPoolMeta = document.querySelector('#quizPoolMeta');
const quizResolvedPath = document.querySelector('#quizResolvedPath');
const quizQuestionPreview = document.querySelector('#quizQuestionPreview');
const authForm = document.querySelector('#authForm');
const authTitle = document.querySelector('#authTitle');
const authSubtitle = document.querySelector('#authSubtitle');
const authStatus = document.querySelector('#authStatus');
const authSubmitButton = document.querySelector('#authSubmitButton');
const authToggleButton = document.querySelector('#authToggleButton');
const displayNameLabel = document.querySelector('#displayNameLabel');
const displayNameInputAuth = document.querySelector('#displayNameInputAuth');
const emailInput = document.querySelector('#emailInput');
const passwordInput = document.querySelector('#passwordInput');

const setupWidget = document.querySelector('#setupWidget');
const setupButton = document.querySelector('#setupButton');
const setupDropdown = document.querySelector('#setupDropdown');
const setupTitle = document.querySelector('#setupTitle');
const setupSubtitle = document.querySelector('#setupSubtitle');
const dokuSettingsContent = document.querySelector('#dokuSettingsContent');
const quizSettingsContent = document.querySelector('#quizSettingsContent');
const showHistoryToggle = document.querySelector('#showHistoryToggle');
const showChatToggle = document.querySelector('#showChatToggle');
const dokuSettingsStatus = document.querySelector('#dokuSettingsStatus');
const referenceLibrarySummary = document.querySelector('#referenceLibrarySummary');
const referenceLibraryStatus = document.querySelector('#referenceLibraryStatus');
const scanReferencesButton = document.querySelector('#scanReferencesButton');
const showQuizDashboardToggle = document.querySelector('#showQuizDashboardToggle');
const showQuizPoolToggle = document.querySelector('#showQuizPoolToggle');
const showQuizHistoryToggle = document.querySelector('#showQuizHistoryToggle');
const showQuizChatToggle = document.querySelector('#showQuizChatToggle');
const quizSettingsStatus = document.querySelector('#quizSettingsStatus');

const profileWidget = document.querySelector('#profileWidget');
const profileButton = document.querySelector('#profileButton');
const profileDropdown = document.querySelector('#profileDropdown');
const profileAvatarImage = document.querySelector('#profileAvatarImage');
const profileInitials = document.querySelector('#profileInitials');
const profileName = document.querySelector('#profileName');
const profileEmail = document.querySelector('#profileEmail');
const profileDisplayNameInput = document.querySelector('#profileDisplayNameInput');
const profilePhotoInput = document.querySelector('#profilePhotoInput');
const profileStatus = document.querySelector('#profileStatus');
const saveProfileButton = document.querySelector('#saveProfileButton');
const logoutButton = document.querySelector('#logoutButton');
const aiConfigStatus = document.querySelector('#aiConfigStatus');
const aiConfigMessage = document.querySelector('#aiConfigMessage');
const aiApiKeyInput = document.querySelector('#aiApiKeyInput');
const saveAiKeyButton = document.querySelector('#saveAiKeyButton');
const testAiKeyButton = document.querySelector('#testAiKeyButton');
const removeAiKeyButton = document.querySelector('#removeAiKeyButton');

const panels = {
  checker: document.querySelector('#checkerPanel'),
  history: document.querySelector('#historyPanel'),
  chat: document.querySelector('#chatPanel')
};
const tabs = document.querySelectorAll('.tab[data-tab]');
const quizNavButtons = document.querySelectorAll('.quiz-sidebar [data-quiz-target]');
const historyTabButton = document.querySelector('#historyTabButton');
const chatTabButton = document.querySelector('#chatTabButton');
const quizDashboardTabButton = document.querySelector('#quizDashboardTabButton');
const quizPoolTabButton = document.querySelector('#quizPoolTabButton');
const quizHistoryTabButton = document.querySelector('#quizHistoryTabButton');
const quizChatTabButton = document.querySelector('#quizChatTabButton');
const quizDashboardCard = document.querySelector('#quizDashboardCard');
const quizPoolCard = document.querySelector('#quizPoolCard');
const quizHistoryCard = document.querySelector('#quizHistoryCard');
const quizChatCard = document.querySelector('#quizChatCard');
const quizHistoryList = document.querySelector('#quizHistoryList');
const quizChatForm = document.querySelector('#quizChatForm');
const quizMessageInput = document.querySelector('#quizMessageInput');
const quizMessages = document.querySelector('#quizMessages');
const quizSendButton = document.querySelector('#quizSendButton');
const quizClearButton = document.querySelector('#quizClearButton');
const quizChatStatus = document.querySelector('#quizChatStatus');

const analyzeForm = document.querySelector('#analyzeForm');
const analyzeButton = document.querySelector('#analyzeButton');
const analyzeStatus = document.querySelector('#analyzeStatus');
const summaryElement = document.querySelector('#summary');
const resultTableBody = document.querySelector('#resultTable tbody');
const downloadExcelButton = document.querySelector('#downloadExcelButton');
const downloadJsonButton = document.querySelector('#downloadJsonButton');
const ihkProfileSelect = document.querySelector('#ihkProfile');
const aiReviewModeSelect = document.querySelector('#aiReviewMode');

const historyStatus = document.querySelector('#historyStatus');
const historyList = document.querySelector('#historyList');
const historyDetail = document.querySelector('#historyDetail');
const refreshHistoryButton = document.querySelector('#refreshHistoryButton');

const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const messages = document.querySelector('#messages');
const sendButton = document.querySelector('#sendButton');
const clearButton = document.querySelector('#clearButton');
const statusElement = document.querySelector('#status');
const modeElement = document.querySelector('#mode');
const contextElement = document.querySelector('#context');

let currentUser = null;
let authMode = 'login';
let currentReport = null;
let history = [];
let quizHistory = [];
let quizChatHistory = [];
let quizConfig = null;
let aiConfig = null;
let ihkProfilesLoaded = false;
let dokuSettings = { history: true, chat: true };
let quizSettings = { dashboard: true, pool: true, history: true, chat: true };
let activeWorkspaceTrack = 'fiae';
const workspaceTracks = new Set(['fiae', 'fisi', 'kits', 'kabue']);
const timerQuizAreas = {
  software: {
    title: 'Software Entwicklung Allgemein',
    subtitle: 'Grundlagen, Prozesse und allgemeine Fragen',
    hintTitle: 'Allgemein:',
    hintText: 'Trainiere Softwareprozess, Datenanalyse, Projektmanagement und Entwicklungsgrundlagen.'
  },
  sql: {
    title: 'SQL',
    subtitle: 'SELECT, Datenbanken und Reihenfolgeaufgaben',
    hintTitle: 'SQL:',
    hintText: 'Trainiere SQL-Fragen und Drag-and-Drop-Aufgaben zu SELECT-Abfragen.'
  },
  python: {
    title: 'Python',
    subtitle: 'Codefragen und JSON-Fragenpools',
    hintTitle: 'Python:',
    hintText: 'Lade Python-Fragenpools als JSON. Python-Code wird im Quiz formatiert angezeigt.'
  }
};

function statusLabel(status) {
  return {
    gruen: 'Gruen',
    gelb: 'Gelb',
    rot: 'Rot',
    grau: 'Grau'
  }[status] || status;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

async function readJson(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return {};
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options
  });
  const data = await readJson(response);
  if (response.status === 401 && !url.startsWith('/api/auth/')) {
    showAuth('Bitte einloggen, um weiterzuarbeiten.');
  }
  if (!response.ok) throw new Error(data.error || 'Anfrage fehlgeschlagen.');
  return data;
}

function initialsFor(user) {
  const value = user?.displayName || user?.email || '?';
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
}

function renderUser(user) {
  currentUser = user;
  profileName.textContent = user.displayName || 'Profil';
  profileEmail.textContent = user.email || '';
  profileDisplayNameInput.value = user.displayName || '';
  profileInitials.textContent = initialsFor(user);

  if (user.photo?.dataUrl) {
    profileAvatarImage.src = user.photo.dataUrl;
    profileAvatarImage.classList.remove('hidden');
    profileInitials.classList.add('hidden');
  } else {
    profileAvatarImage.removeAttribute('src');
    profileAvatarImage.classList.add('hidden');
    profileInitials.classList.remove('hidden');
  }
}

function aiSourceLabel(source) {
  return {
    user: 'Eigener Key',
    default_file: 'Standard-Key-Datei',
    api_key_doku_tool: 'API_KEY_DOKU_TOOL',
    openai_env: 'OPENAI_API_KEY',
    none: 'kein Key'
  }[source] || source || 'unbekannt';
}

function renderAiConfig(config = {}) {
  aiConfig = config;
  if (!aiConfigStatus) return;

  const keyMask = config.keyMask ? ` (${escapeHtml(config.keyMask)})` : '';
  if (config.hasOwnKey) {
    aiConfigStatus.innerHTML = `<strong>Eigener Key aktiv${keyMask}</strong><small>Modell: ${escapeHtml(config.model || '-')}</small>`;
  } else if (config.usingDefaultKey) {
    aiConfigStatus.innerHTML = `<strong>Standard-Key aktiv</strong><small>${escapeHtml(aiSourceLabel(config.effectiveKeySource))} - Modell: ${escapeHtml(config.model || '-')}</small>`;
  } else {
    aiConfigStatus.innerHTML = '<strong>Kein Key verfuegbar</strong><small>KI-Chat und KI-Pruefung sind erst nach Konfiguration verfuegbar.</small>';
  }

  if (config.userKeyError) {
    aiConfigMessage.textContent = config.userKeyError;
  } else {
    aiConfigMessage.textContent = '';
  }
  removeAiKeyButton.disabled = !config.hasOwnKey;
}

async function loadAiConfig() {
  if (!currentUser || !aiConfigStatus) return;
  aiConfigStatus.textContent = 'KI-Status wird geladen ...';
  try {
    const config = await apiFetch('/api/ai-config');
    renderAiConfig(config);
  } catch (error) {
    aiConfigStatus.textContent = 'KI-Status konnte nicht geladen werden.';
    aiConfigMessage.textContent = error.message;
  }
}

function setWorkspaceTrack(track) {
  activeWorkspaceTrack = workspaceTracks.has(track) ? track : 'fiae';

  workspaceTrackButtons.forEach((button) => {
    const isActive = button.dataset.workspaceTrack === activeWorkspaceTrack;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  workspaceTrackPanels.forEach((panel) => {
    panel.classList.toggle('visible', panel.dataset.workspacePanel === activeWorkspaceTrack);
  });
}

function setTimerQuizArea(area) {
  const key = timerQuizAreas[area] ? area : 'software';
  const config = timerQuizAreas[key];

  timerQuizRoot.dataset.timerQuizArea = key;
  timerQuizViewTitle.textContent = config.title;
  timerQuizViewSubtitle.textContent = config.subtitle;
  timerQuizHintTitle.textContent = config.hintTitle;
  timerQuizHintText.textContent = config.hintText;
  window.dispatchEvent(new CustomEvent('timer-quiz-area-change', { detail: { area: key } }));
}

function showAuth(message = '') {
  currentUser = null;
  authView.classList.remove('hidden');
  workspaceView.classList.add('hidden');
  quizView.classList.add('hidden');
  timerQuizView.classList.add('hidden');
  appShell.classList.add('hidden');
  setupWidget.classList.add('hidden');
  setupDropdown.classList.add('hidden');
  profileWidget.classList.add('hidden');
  profileDropdown.classList.add('hidden');
  authStatus.textContent = message;
}

function showWorkspace(user = currentUser) {
  if (user) renderUser(user);
  setWorkspaceTrack(activeWorkspaceTrack);
  workspaceGreeting.textContent = currentUser?.displayName
    ? `Willkommen, ${currentUser.displayName}`
    : 'Willkommen';
  authView.classList.add('hidden');
  workspaceView.classList.remove('hidden');
  quizView.classList.add('hidden');
  timerQuizView.classList.add('hidden');
  appShell.classList.add('hidden');
  setupWidget.classList.add('hidden');
  setupDropdown.classList.add('hidden');
  profileWidget.classList.remove('hidden');
  profileDropdown.classList.add('hidden');
}

function showDokuTool(user = currentUser) {
  renderUser(user);
  authView.classList.add('hidden');
  workspaceView.classList.add('hidden');
  quizView.classList.add('hidden');
  timerQuizView.classList.add('hidden');
  appShell.classList.remove('hidden');
  setupWidget.classList.remove('hidden');
  setupDropdown.classList.add('hidden');
  profileWidget.classList.remove('hidden');
  setSetupMode('doku');
  loadDokuSettings();
  loadLocalReferences();
  selectDokuTab('checker');
  loadIhkProfiles();
  if (dokuSettings.chat) loadChatHistory();
  if (dokuSettings.history) loadHistory();
}

function showQuizTool() {
  authView.classList.add('hidden');
  workspaceView.classList.add('hidden');
  appShell.classList.add('hidden');
  timerQuizView.classList.add('hidden');
  quizView.classList.remove('hidden');
  setupWidget.classList.remove('hidden');
  setupDropdown.classList.add('hidden');
  profileWidget.classList.remove('hidden');
  profileDropdown.classList.add('hidden');
  setSetupMode('quiz');
  loadQuizSettings();
  loadQuizHistory();
  loadQuizChatHistory();
  activateQuizNav(firstVisibleQuizTarget(), false);
  loadQuizTool();
}

function showTimerQuizTool(area = 'software') {
  setTimerQuizArea(area);
  authView.classList.add('hidden');
  workspaceView.classList.add('hidden');
  appShell.classList.add('hidden');
  quizView.classList.add('hidden');
  timerQuizView.classList.remove('hidden');
  setupWidget.classList.add('hidden');
  setupDropdown.classList.add('hidden');
  profileWidget.classList.remove('hidden');
  profileDropdown.classList.add('hidden');
}

function setAuthMode(nextMode) {
  authMode = nextMode;
  const isRegister = authMode === 'register';
  authTitle.textContent = isRegister ? 'Registrieren' : 'Einloggen';
  authSubtitle.textContent = isRegister
    ? 'Lege ein Konto mit E-Mail und Passwort an.'
    : 'Melde dich an, um fortzufahren.';
  authSubmitButton.textContent = isRegister ? 'Registrieren' : 'Einloggen';
  authToggleButton.textContent = isRegister ? 'Zum Login' : 'Neu registrieren';
  displayNameLabel.classList.toggle('hidden', !isRegister);
  passwordInput.autocomplete = isRegister ? 'new-password' : 'current-password';
  authStatus.textContent = '';
}

function setSetupMode(mode) {
  const isQuiz = mode === 'quiz';
  setupTitle.textContent = isQuiz ? 'Quiz-Setup' : 'DokuTool-Einstellungen';
  setupSubtitle.textContent = isQuiz
    ? 'Navigation und Firestore-Struktur.'
    : 'Steuere, welche Bereiche im DokuTool angezeigt werden.';
  setupButton.title = isQuiz ? 'Quiz-Setup' : 'DokuTool-Einstellungen';
  setupButton.setAttribute('aria-label', `${setupButton.title} öffnen`);
  quizSettingsContent.classList.toggle('hidden', !isQuiz);
  dokuSettingsContent.classList.toggle('hidden', isQuiz);
  dokuSettingsStatus.textContent = '';
  quizSettingsStatus.textContent = '';
}

function dokuSettingsKey() {
  return `ihk-dokutool-settings:${currentUser?.id || 'guest'}`;
}

function loadDokuSettings() {
  try {
    dokuSettings = {
      history: true,
      chat: true,
      ...JSON.parse(localStorage.getItem(dokuSettingsKey()) || '{}')
    };
  } catch {
    dokuSettings = { history: true, chat: true };
  }

  showHistoryToggle.checked = dokuSettings.history;
  showChatToggle.checked = dokuSettings.chat;
  applyDokuSettings();
}

function saveDokuSettings() {
  localStorage.setItem(dokuSettingsKey(), JSON.stringify(dokuSettings));
}

function applyDokuSettings() {
  const config = [
    { enabled: dokuSettings.history, tab: historyTabButton, panel: panels.history },
    { enabled: dokuSettings.chat, tab: chatTabButton, panel: panels.chat }
  ];

  config.forEach(({ enabled, tab, panel }) => {
    tab.classList.toggle('hidden', !enabled);
    panel.classList.toggle('hidden', !enabled);
    if (!enabled && panel.classList.contains('visible')) {
      selectDokuTab('checker');
    }
  });
}

function updateDokuSettings(nextSettings) {
  dokuSettings = { ...dokuSettings, ...nextSettings };
  saveDokuSettings();
  applyDokuSettings();
  dokuSettingsStatus.textContent = 'Einstellungen gespeichert.';
}

function renderLocalReferences(references = []) {
  if (!referenceLibrarySummary) return;
  if (!references.length) {
    referenceLibrarySummary.innerHTML = '<p class="status-line">Keine Referenzen registriert.</p>';
    return;
  }
  referenceLibrarySummary.innerHTML = references.map((reference) => `
    <article>
      <strong>${escapeHtml(reference.title || reference.id)}</strong>
      <small>${escapeHtml(reference.status || 'missing')} · ${escapeHtml((reference.topics || []).slice(0, 4).join(', ') || 'keine Topics')}</small>
    </article>
  `).join('');
}

async function loadLocalReferences() {
  if (!referenceLibrarySummary || !currentUser) return;
  referenceLibraryStatus.textContent = 'Referenzen werden geladen ...';
  try {
    const data = await apiFetch('/api/references');
    renderLocalReferences(data.references || []);
    const available = (data.references || []).filter((reference) => reference.status === 'available').length;
    referenceLibraryStatus.textContent = `${available}/${data.references?.length || 0} lokale Referenz(en) vorhanden.`;
  } catch (error) {
    referenceLibraryStatus.textContent = `Referenzen konnten nicht geladen werden: ${error.message}`;
  }
}

function selectDokuTab(tabName) {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (!tab || tab.classList.contains('hidden')) return;

  tabs.forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  Object.values(panels).forEach((panel) => panel.classList.remove('visible'));
  panels[tabName].classList.add('visible');
  if (tabName === 'history') loadHistory();
}

function quizSettingsKey() {
  return `ihk-quiztool-settings:${currentUser?.id || 'guest'}`;
}

function loadQuizSettings() {
  try {
    quizSettings = {
      dashboard: true,
      pool: true,
      history: true,
      chat: true,
      ...JSON.parse(localStorage.getItem(quizSettingsKey()) || '{}')
    };
  } catch {
    quizSettings = { dashboard: true, pool: true, history: true, chat: true };
  }

  if (!Object.values(quizSettings).some(Boolean)) {
    quizSettings.dashboard = true;
  }

  showQuizDashboardToggle.checked = quizSettings.dashboard;
  showQuizPoolToggle.checked = quizSettings.pool;
  showQuizHistoryToggle.checked = quizSettings.history;
  showQuizChatToggle.checked = quizSettings.chat;
  applyQuizSettings();
}

function saveQuizSettings() {
  localStorage.setItem(quizSettingsKey(), JSON.stringify(quizSettings));
}

function applyQuizSettings() {
  const config = [
    { enabled: quizSettings.dashboard, tab: quizDashboardTabButton, card: quizDashboardCard },
    { enabled: quizSettings.pool, tab: quizPoolTabButton, card: quizPoolCard },
    { enabled: quizSettings.history, tab: quizHistoryTabButton, card: quizHistoryCard },
    { enabled: quizSettings.chat, tab: quizChatTabButton, card: quizChatCard }
  ];

  config.forEach(({ enabled, tab, card }) => {
    tab.classList.toggle('hidden', !enabled);
    card.classList.toggle('hidden', !enabled);
  });

  const activeTarget = quizNavButtons.find((button) => button.classList.contains('active'))?.dataset.quizTarget;
  const activeIsHidden = activeTarget && document.getElementById(activeTarget)?.classList.contains('hidden');
  if (!activeTarget || activeIsHidden) {
    activateQuizNav(firstVisibleQuizTarget(), false);
  }
}

function updateQuizSettings(nextSettings) {
  const next = { ...quizSettings, ...nextSettings };
  if (!Object.values(next).some(Boolean)) {
    quizSettingsStatus.textContent = 'Mindestens ein Quiz-Bereich muss sichtbar bleiben.';
    showQuizDashboardToggle.checked = quizSettings.dashboard;
    showQuizPoolToggle.checked = quizSettings.pool;
    showQuizHistoryToggle.checked = quizSettings.history;
    showQuizChatToggle.checked = quizSettings.chat;
    return;
  }

  quizSettings = next;
  saveQuizSettings();
  applyQuizSettings();
  quizSettingsStatus.textContent = 'Einstellungen gespeichert.';
}

function firstVisibleQuizTarget() {
  if (quizSettings.dashboard) return 'quizDashboardCard';
  if (quizSettings.pool) return 'quizPoolCard';
  if (quizSettings.history) return 'quizHistoryCard';
  return 'quizChatCard';
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    selectDokuTab(tab.dataset.tab);
  });
});

function activateQuizNav(targetId, shouldScroll = true) {
  quizNavButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.quizTarget === targetId);
  });

  if (!shouldScroll) return;
  document.getElementById(targetId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

quizNavButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activateQuizNav(button.dataset.quizTarget);
  });
});

authToggleButton.addEventListener('click', () => {
  setAuthMode(authMode === 'login' ? 'register' : 'login');
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  authSubmitButton.disabled = true;
  authStatus.textContent = authMode === 'register' ? 'Konto wird erstellt ...' : 'Login wird geprueft ...';

  try {
    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const data = await apiFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailInput.value,
        password: passwordInput.value,
        displayName: displayNameInputAuth.value
      })
    });
    passwordInput.value = '';
    showWorkspace(data.user);
  } catch (error) {
    authStatus.textContent = error.message;
  } finally {
    authSubmitButton.disabled = false;
  }
});

setupButton.addEventListener('click', () => {
  setupDropdown.classList.toggle('hidden');
  profileDropdown.classList.add('hidden');
});

showHistoryToggle.addEventListener('change', () => {
  updateDokuSettings({ history: showHistoryToggle.checked });
  if (showHistoryToggle.checked) loadHistory();
});

showChatToggle.addEventListener('change', () => {
  updateDokuSettings({ chat: showChatToggle.checked });
  if (showChatToggle.checked) loadChatHistory();
});

scanReferencesButton?.addEventListener('click', async () => {
  scanReferencesButton.disabled = true;
  referenceLibraryStatus.textContent = 'Lokale Referenzen werden gescannt ...';
  try {
    const result = await apiFetch('/api/references/scan', { method: 'POST' });
    referenceLibraryStatus.textContent = `Scan abgeschlossen: ${result.filesFound} Datei(en), ${result.added} neu registriert.`;
    await loadLocalReferences();
  } catch (error) {
    referenceLibraryStatus.textContent = `Scan fehlgeschlagen: ${error.message}`;
  } finally {
    scanReferencesButton.disabled = false;
  }
});

showQuizDashboardToggle.addEventListener('change', () => {
  updateQuizSettings({ dashboard: showQuizDashboardToggle.checked });
});

showQuizPoolToggle.addEventListener('change', () => {
  updateQuizSettings({ pool: showQuizPoolToggle.checked });
});

showQuizHistoryToggle.addEventListener('change', () => {
  updateQuizSettings({ history: showQuizHistoryToggle.checked });
});

showQuizChatToggle.addEventListener('change', () => {
  updateQuizSettings({ chat: showQuizChatToggle.checked });
});

profileButton.addEventListener('click', () => {
  profileDropdown.classList.toggle('hidden');
  setupDropdown.classList.add('hidden');
  if (!profileDropdown.classList.contains('hidden')) {
    loadAiConfig();
  }
  if (!profileDropdown.classList.contains('hidden') && !quizConfig) {
    loadQuizTool();
  }
});

saveProfileButton.addEventListener('click', async () => {
  profileStatus.textContent = 'Profil wird gespeichert ...';
  saveProfileButton.disabled = true;
  try {
    const data = await apiFetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: profileDisplayNameInput.value })
    });
    renderUser(data.user);
    profileStatus.textContent = 'Profil gespeichert.';
  } catch (error) {
    profileStatus.textContent = error.message;
  } finally {
    saveProfileButton.disabled = false;
  }
});

profilePhotoInput.addEventListener('change', async () => {
  const file = profilePhotoInput.files?.[0];
  if (!file) return;

  profileStatus.textContent = 'Foto wird hochgeladen ...';
  const formData = new FormData();
  formData.set('photo', file);

  try {
    const data = await apiFetch('/api/profile/photo', {
      method: 'POST',
      body: formData
    });
    renderUser(data.user);
    profileStatus.textContent = 'Foto gespeichert.';
  } catch (error) {
    profileStatus.textContent = error.message;
  } finally {
    profilePhotoInput.value = '';
  }
});

saveAiKeyButton?.addEventListener('click', async () => {
  const apiKey = aiApiKeyInput.value;
  saveAiKeyButton.disabled = true;
  aiConfigMessage.textContent = 'API-Key wird gespeichert ...';
  try {
    const config = await apiFetch('/api/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', apiKey, useOwnKey: true })
    });
    aiApiKeyInput.value = '';
    renderAiConfig(config);
    aiConfigMessage.textContent = 'API-Key gespeichert.';
  } catch (error) {
    aiConfigMessage.textContent = error.message;
  } finally {
    saveAiKeyButton.disabled = false;
  }
});

testAiKeyButton?.addEventListener('click', async () => {
  testAiKeyButton.disabled = true;
  aiConfigMessage.textContent = 'KI-Verbindung wird getestet ...';
  try {
    const body = aiApiKeyInput.value ? { apiKey: aiApiKeyInput.value } : {};
    const result = await apiFetch('/api/ai-config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    aiConfigMessage.textContent = result.ok
      ? `${result.message} Quelle: ${aiSourceLabel(result.keySource)}.`
      : result.message;
  } catch (error) {
    aiConfigMessage.textContent = error.message;
  } finally {
    testAiKeyButton.disabled = false;
  }
});

removeAiKeyButton?.addEventListener('click', async () => {
  removeAiKeyButton.disabled = true;
  aiConfigMessage.textContent = 'Eigener API-Key wird entfernt ...';
  try {
    const config = await apiFetch('/api/ai-config', { method: 'DELETE' });
    aiApiKeyInput.value = '';
    renderAiConfig(config);
    aiConfigMessage.textContent = 'Eigener API-Key entfernt.';
  } catch (error) {
    aiConfigMessage.textContent = error.message;
  } finally {
    removeAiKeyButton.disabled = !aiConfig?.hasOwnKey;
  }
});

logoutButton.addEventListener('click', async () => {
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  currentReport = null;
  history = [];
  showAuth('Du wurdest abgemeldet.');
});

openDokuToolButton.addEventListener('click', () => {
  showDokuTool();
});

openQuizToolButton.addEventListener('click', () => {
  showQuizTool();
});

openSoftwareQuizButton.addEventListener('click', () => {
  showTimerQuizTool('software');
});

openSqlQuizButton.addEventListener('click', () => {
  showTimerQuizTool('sql');
});

openPythonQuizButton.addEventListener('click', () => {
  showTimerQuizTool('python');
});

workspaceTrackButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setWorkspaceTrack(button.dataset.workspaceTrack);
  });
});

backToWorkspaceButton.addEventListener('click', () => {
  showWorkspace();
});

backToWorkspaceFromDokuButton.addEventListener('click', () => {
  showWorkspace();
});

backToWorkspaceFromTimerButton.addEventListener('click', () => {
  showWorkspace();
});

quizFachSelect.addEventListener('change', () => {
  renderFachInfo();
});

quizPoolSelect.addEventListener('change', () => {
  renderQuizTopics();
  renderQuizPoolSelection();
});

quizTopicSelect.addEventListener('change', () => {
  renderQuizPoolSelection();
});

quizQuestionLimitInput.addEventListener('change', () => {
  renderQuizPoolSelection();
});

loadQuizQuestionsButton.addEventListener('click', async () => {
  const poolId = quizPoolSelect.value;
  if (!poolId) return;

  const params = new URLSearchParams({
    poolId,
    topic: quizTopicSelect.value,
    max: quizQuestionLimitInput.value || '20'
  });

  loadQuizQuestionsButton.disabled = true;
  quizPoolStatus.textContent = 'Fragen werden geladen ...';
  quizQuestionPreview.innerHTML = '';

  try {
    const data = await apiFetch(`/api/quiz/questions?${params.toString()}`);
    renderQuestionPreview(data.questions || []);
    recordQuizHistory({
      poolId,
      poolName: selectedQuizPool()?.label || selectedQuizPool()?.name || poolId,
      topic: quizTopicSelect.value,
      count: data.questions?.length || 0
    });
    quizPoolStatus.textContent = `${data.questions?.length || 0} Fragen geladen.`;
  } catch (error) {
    quizPoolStatus.textContent = error.message;
  } finally {
    loadQuizQuestionsButton.disabled = !quizPoolSelect.value;
  }
});

saveQuizProfileButton.addEventListener('click', async () => {
  quizProfileStatus.textContent = 'Quiz-Profil wird gespeichert ...';
  saveQuizProfileButton.disabled = true;
  try {
    const data = await apiFetch('/api/quiz/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: quizFirstNameInput.value,
        lastName: quizLastNameInput.value,
        fach: quizFachSelect.value
      })
    });
    renderUser(data.user);
    renderQuizProfile(data.profile);
    quizProfileStatus.textContent = 'Quiz-Profil gespeichert.';
  } catch (error) {
    quizProfileStatus.textContent = error.message;
  } finally {
    saveQuizProfileButton.disabled = false;
  }
});

async function loadQuizTool() {
  quizStatus.textContent = 'IHK_APP wird geladen ...';
  try {
    const data = await apiFetch('/api/quiz/config');
    quizConfig = data;
    renderQuizTool(data);
    quizStatus.textContent = `Integriert aus ${data.sourceRepo}.`;
  } catch (error) {
    quizStatus.textContent = error.message;
  }
}

function renderQuizTool(data) {
  renderFachOptions(data.fachrichtungen || {});
  renderQuizProfile(data.profile || {});
  renderRoles(data.roleTemplates || []);
  renderQuestionSchema(data.questionSchema || {});
  renderQuestionPools(data.questionPools || {});
}

function renderFachOptions(fachrichtungen) {
  quizFachSelect.innerHTML = '<option value="">Bitte wählen</option>';
  for (const [key, value] of Object.entries(fachrichtungen)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = value.label;
    quizFachSelect.appendChild(option);
  }
}

function renderQuizProfile(profile) {
  quizFirstNameInput.value = profile.firstName || '';
  quizLastNameInput.value = profile.lastName || '';
  quizFachSelect.value = profile.fach || '';
  renderFachInfo();
}

function renderFachInfo() {
  const selected = quizConfig?.fachrichtungen?.[quizFachSelect.value];
  quizFachInfo.textContent = selected?.info || 'Die Fachrichtung wird später für passende Fragenpools genutzt.';
}

function renderRoles(roles) {
  quizRolesList.innerHTML = '';
  for (const role of roles) {
    const enabled = Object.entries(role.permissions || {})
      .filter(([, value]) => value)
      .map(([key]) => key.replace(/^can/, ''))
      .join(', ');
    const article = document.createElement('article');
    article.className = 'role-card';
    article.innerHTML = `
      <div>
        <strong>${escapeHtml(role.name)}</strong>
        <small>${escapeHtml(role.key)}${role.builtIn ? ' · Systemrolle' : ''}</small>
      </div>
      <p>${escapeHtml(role.description || '')}</p>
      <span>${escapeHtml(enabled || 'Keine Rechte aktiv')}</span>
    `;
    quizRolesList.appendChild(article);
  }
}

function renderQuestionSchema(schema) {
  quizFirestorePath.textContent = schema.firestorePath || '-';
  quizQuestionFields.innerHTML = '';
  for (const field of schema.fields || []) {
    const item = document.createElement('span');
    item.textContent = field;
    quizQuestionFields.appendChild(item);
  }
}

function quizPools() {
  return Array.isArray(quizConfig?.questionPools?.pools) ? quizConfig.questionPools.pools : [];
}

function selectedQuizPool() {
  return quizPools().find((pool) => pool.id === quizPoolSelect.value) || null;
}

function renderQuestionPools(questionPools) {
  const pools = Array.isArray(questionPools.pools) ? questionPools.pools : [];
  const previousPool = quizPoolSelect.value;
  quizPoolSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = pools.length ? 'Bitte Fragenpool wählen' : 'Firestore noch nicht verbunden';
  quizPoolSelect.appendChild(placeholder);

  for (const pool of pools) {
    const option = document.createElement('option');
    option.value = pool.id;
    option.textContent = pool.label || pool.id;
    quizPoolSelect.appendChild(option);
  }

  quizPoolSelect.disabled = pools.length === 0;
  quizPoolSelect.value = pools.some((pool) => pool.id === previousPool) ? previousPool : '';
  quizPoolStatus.textContent = questionPools.status || '';
  quizQuestionPreview.innerHTML = '';

  renderQuizTopics();
  renderQuizPoolSelection();
}

function renderQuizTopics() {
  const pool = selectedQuizPool();
  const previousTopic = quizTopicSelect.value;
  quizTopicSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = pool ? 'Alle Topics' : 'Erst Pool wählen';
  quizTopicSelect.appendChild(placeholder);

  for (const topic of pool?.topics || []) {
    const option = document.createElement('option');
    option.value = topic;
    option.textContent = topic;
    quizTopicSelect.appendChild(option);
  }

  quizTopicSelect.disabled = !pool;
  quizTopicSelect.value = (pool?.topics || []).includes(previousTopic) ? previousTopic : '';
}

function renderQuizPoolSelection() {
  const pool = selectedQuizPool();
  const connected = Boolean(quizConfig?.questionPools?.connected);
  const root = quizConfig?.questionPools?.root || 'fragenpools';
  const topic = quizTopicSelect.value;
  const max = Math.min(Math.max(Number(quizQuestionLimitInput.value) || 20, 1), 50);
  quizQuestionLimitInput.value = String(max);

  if (!pool) {
    quizResolvedPath.textContent = quizConfig?.questionSchema?.firestorePath || '-';
    quizPoolMeta.innerHTML = '';
    loadQuizQuestionsButton.disabled = true;
    return;
  }

  quizResolvedPath.textContent = topic
    ? `${root}/${pool.id}/questions?topic=${topic}&limit=${max}`
    : `${root}/${pool.id}/questions?limit=${max}`;
  quizPoolMeta.innerHTML = `
    <span>${escapeHtml(pool.description || 'Fragenpool aus Firestore')}</span>
    <span>${escapeHtml(String(pool.topics?.length || 0))} Topics</span>
    <span>${escapeHtml(String(pool.previewCount || 0))} Fragen in der Vorschau</span>
  `;
  loadQuizQuestionsButton.disabled = !connected;
  quizPoolStatus.textContent = connected
    ? 'Bereit zum Laden der Fragen.'
    : (quizConfig?.questionPools?.status || 'Firestore ist noch nicht verbunden.');
}

function renderQuestionPreview(questions) {
  quizQuestionPreview.innerHTML = '';
  if (!questions.length) {
    quizQuestionPreview.innerHTML = '<p class="empty-note">Keine Fragen für diese Auswahl gefunden.</p>';
    return;
  }

  for (const question of questions.slice(0, 12)) {
    const article = document.createElement('article');
    article.className = 'question-preview-item';
    const solution = Array.isArray(question.solution)
      ? question.solution.join(', ')
      : question.solution || '';
    article.innerHTML = `
      <div>
        <strong>${escapeHtml(question.question || question.id || 'Frage')}</strong>
        <small>${escapeHtml(question.topic || 'Ohne Topic')}${question.type ? ` · ${escapeHtml(question.type)}` : ''}</small>
      </div>
      ${solution ? `<p>${escapeHtml(solution)}</p>` : ''}
    `;
    quizQuestionPreview.appendChild(article);
  }
}

function quizHistoryKey() {
  return `ihk-quiztool-load-history:${currentUser?.id || 'guest'}`;
}

function saveQuizHistory() {
  localStorage.setItem(quizHistoryKey(), JSON.stringify(quizHistory.slice(0, 20)));
}

function loadQuizHistory() {
  try {
    quizHistory = JSON.parse(localStorage.getItem(quizHistoryKey()) || '[]');
  } catch {
    quizHistory = [];
  }
  renderQuizHistory();
}

function recordQuizHistory(entry) {
  quizHistory = [
    {
      ...entry,
      createdAt: new Date().toISOString()
    },
    ...quizHistory
  ].slice(0, 20);
  saveQuizHistory();
  renderQuizHistory();
}

function renderQuizHistory() {
  quizHistoryList.innerHTML = '';
  if (!quizHistory.length) {
    quizHistoryList.innerHTML = '<p class="empty-note">Noch keine Fragen geladen.</p>';
    return;
  }

  for (const entry of quizHistory) {
    const article = document.createElement('article');
    article.className = 'question-preview-item';
    article.innerHTML = `
      <div>
        <strong>${escapeHtml(entry.poolName || entry.poolId || 'Fragenpool')}</strong>
        <small>${escapeHtml(formatDate(entry.createdAt))}</small>
      </div>
      <p>${escapeHtml(entry.topic || 'Alle Topics')} · ${escapeHtml(String(entry.count || 0))} Fragen</p>
    `;
    quizHistoryList.appendChild(article);
  }
}

function setAnalyzeLoading(isLoading) {
  analyzeButton.disabled = isLoading;
  analyzeStatus.textContent = isLoading ? 'Dokument wird geprueft ...' : 'Bereit';
}

async function loadIhkProfiles() {
  if (ihkProfilesLoaded || !ihkProfileSelect) return;
  try {
    const currentValue = ihkProfileSelect.value || 'allgemein';
    const data = await apiFetch('/api/ihk-profiles');
    const profiles = Array.isArray(data.profiles) ? data.profiles : [];
    if (!profiles.length) return;
    ihkProfileSelect.innerHTML = '';
    for (const profile of profiles) {
      const option = document.createElement('option');
      option.value = profile.key;
      option.textContent = profile.label;
      option.title = profile.summary || profile.aiPolicy || '';
      ihkProfileSelect.appendChild(option);
    }
    ihkProfileSelect.value = profiles.some((profile) => profile.key === currentValue)
      ? currentValue
      : 'allgemein';
    ihkProfilesLoaded = true;
  } catch {
    ihkProfilesLoaded = false;
  }
}

function renderSummary(report) {
  summaryElement.classList.remove('empty');
  summaryElement.innerHTML = `
    <article class="metric"><strong>${report.summary.score}%</strong><span>Gesamtscore</span></article>
    <article class="metric"><strong>${escapeHtml(report.summary.grade)}</strong><span>Bewertung</span></article>
    <article class="metric"><strong>${report.summary.redCount}</strong><span>Rote Punkte</span></article>
    <article class="metric"><strong>${report.summary.yellowCount}</strong><span>Gelbe Punkte</span></article>
    <article class="metric"><strong>${report.summary.grayCount}</strong><span>Graue Punkte</span></article>
  `;
}

function renderResults(report) {
  resultTableBody.innerHTML = '';
  for (const item of report.results) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.category)}</td>
      <td><strong>${escapeHtml(item.criterion)}</strong><br><small>Schweregrad: ${escapeHtml(item.severity)}</small></td>
      <td><span class="badge ${escapeHtml(item.status)}">${escapeHtml(statusLabel(item.status))}</span></td>
      <td>${escapeHtml(item.assessment)}</td>
      <td>${escapeHtml(item.evidence)}</td>
      <td>${escapeHtml(item.recommendation)}</td>
    `;
    resultTableBody.appendChild(tr);
  }
}

function selectReport(report) {
  currentReport = report;
  renderSummary(report);
  renderResults(report);
  downloadExcelButton.disabled = false;
  downloadJsonButton.disabled = false;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

analyzeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setAnalyzeLoading(true);
  currentReport = null;
  downloadExcelButton.disabled = true;
  downloadJsonButton.disabled = true;

  try {
    const formData = new FormData(analyzeForm);
    const aiReviewMode = aiReviewModeSelect?.value || 'disabled';
    formData.set('aiReviewMode', aiReviewMode);
    formData.set('useAi', aiReviewMode === 'disabled' ? 'false' : 'true');

    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    const data = await readJson(response);
    if (response.status === 401) showAuth('Bitte einloggen, um eine Pruefung zu starten.');
    if (!response.ok) throw new Error(data.error || 'Analyse fehlgeschlagen.');

    selectReport(data);
    await loadHistory();

    let aiText = '';
    if (data.aiConsensus?.enabled) {
      aiText = ` Multi-KI-Konsenspruefung fuer ${data.aiConsensus.reviewedRuleCount} Regel(n) ausgefuehrt.`;
    } else if (data.aiConsensus?.reason) {
      aiText = ` Multi-KI-Konsenspruefung nicht ausgefuehrt: ${data.aiConsensus.reason}`;
    } else if (data.ai?.used) {
      aiText = ` KI-Zusatzpruefung mit ${data.ai.model} ausgefuehrt.`;
    } else if (data.ai?.error) {
      aiText = ` KI-Zusatzpruefung nicht ausgefuehrt: ${data.ai.error}`;
    }
    analyzeStatus.textContent = `Bericht erstellt und in der History gespeichert.${aiText}`;
  } catch (error) {
    analyzeStatus.textContent = `Fehler: ${error.message}`;
  } finally {
    setAnalyzeLoading(false);
  }
});

downloadJsonButton.addEventListener('click', () => {
  if (!currentReport) return;
  downloadBlob(new Blob([JSON.stringify(currentReport, null, 2)], { type: 'application/json' }), 'ihk-pruefbericht.json');
});

downloadExcelButton.addEventListener('click', async () => {
  if (!currentReport) return;
  downloadExcelButton.disabled = true;
  try {
    const response = await fetch('/api/report/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(currentReport)
    });
    const err = await readJson(response);
    if (!response.ok) throw new Error(err.error || 'Excel-Bericht konnte nicht erstellt werden.');
    const blob = await response.blob();
    downloadBlob(blob, 'ihk-pruefbericht.xlsx');
  } catch (error) {
    analyzeStatus.textContent = `Fehler: ${error.message}`;
  } finally {
    downloadExcelButton.disabled = false;
  }
});

async function loadHistory() {
  if (!currentUser) return;
  historyStatus.textContent = 'History wird geladen ...';
  try {
    const data = await apiFetch('/api/reports');
    renderHistoryList(data.reports || []);
    historyStatus.textContent = data.reports?.length
      ? `${data.reports.length} Bericht(e) gespeichert.`
      : 'Noch keine Pruefberichte gespeichert.';
  } catch (error) {
    historyStatus.textContent = error.message;
  }
}

function renderHistoryList(reports) {
  historyList.innerHTML = '';
  if (!reports.length) {
    historyList.innerHTML = '<p class="empty-note">Noch keine Berichte vorhanden.</p>';
    return;
  }

  for (const report of reports) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-item';
    button.innerHTML = `
      <span>
        <strong>${escapeHtml(report.projectTitle || report.documentFileName || 'Pruefbericht')}</strong>
        <small>${escapeHtml(formatDate(report.createdAt))}</small>
      </span>
      <span class="history-score">${report.score ?? '-'}%</span>
      <span class="history-flags">${report.redCount} rot / ${report.yellowCount} gelb</span>
    `;
    button.addEventListener('click', () => openHistoryReport(report.id));
    historyList.appendChild(button);
  }
}

async function openHistoryReport(reportId) {
  historyStatus.textContent = 'Bericht wird geladen ...';
  try {
    const data = await apiFetch(`/api/reports/${encodeURIComponent(reportId)}`);
    selectReport(data.report);
    renderHistoryDetail(data.meta, data.report);
    historyStatus.textContent = 'Bericht geladen.';
  } catch (error) {
    historyStatus.textContent = error.message;
  }
}

function renderHistoryDetail(meta, report) {
  const topIssues = (report.results || [])
    .filter((item) => item.status === 'rot')
    .slice(0, 5);

  historyDetail.classList.remove('empty');
  historyDetail.innerHTML = `
    <h3>${escapeHtml(meta.projectTitle || meta.documentFileName || 'Pruefbericht')}</h3>
    <div class="summary mini">
      <article class="metric"><strong>${report.summary.score}%</strong><span>Score</span></article>
      <article class="metric"><strong>${escapeHtml(report.summary.grade)}</strong><span>Bewertung</span></article>
      <article class="metric"><strong>${report.summary.redCount}</strong><span>Rot</span></article>
    </div>
    <p><strong>Datum:</strong> ${escapeHtml(formatDate(meta.createdAt))}</p>
    <p><strong>Datei:</strong> ${escapeHtml(meta.documentFileName || '-')}</p>
    <h4>Kritische Punkte</h4>
    ${
      topIssues.length
        ? `<ul>${topIssues.map((item) => `<li>${escapeHtml(item.criterion)} - ${escapeHtml(item.recommendation)}</li>`).join('')}</ul>`
        : '<p>Keine roten Punkte im Bericht.</p>'
    }
    <button id="showSelectedReportButton" type="button">Im Pruefbereich anzeigen</button>
  `;

  document.querySelector('#showSelectedReportButton').addEventListener('click', () => {
    document.querySelector('[data-tab="checker"]').click();
  });
}

refreshHistoryButton.addEventListener('click', loadHistory);

function chatHistoryKey() {
  return `ihk-dokutool-chat-history:${currentUser?.id || 'guest'}`;
}

function saveHistory() {
  localStorage.setItem(chatHistoryKey(), JSON.stringify(history.slice(-20)));
}

function loadChatHistory() {
  history = JSON.parse(localStorage.getItem(chatHistoryKey()) || '[]');
  renderSavedHistory();
}

function addMessage(role, content) {
  const article = document.createElement('article');
  article.className = `message ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;

  article.appendChild(bubble);
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
}

function renderSavedHistory() {
  messages.innerHTML = '';
  addMessage('assistant', 'Hallo Florian, ich bin dein integrierter Assistent. Du kannst hier gezielt Fragen zu IHK-Doku, Code oder Formulierungen stellen.');
  for (const entry of history) {
    addMessage(entry.role, entry.content);
  }
}

function setLoading(isLoading) {
  sendButton.disabled = isLoading;
  input.disabled = isLoading;
  statusElement.textContent = isLoading ? 'Antwort wird erzeugt ...' : 'Bereit';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const message = input.value.trim();
  if (!message) return;

  const previousHistory = history.slice(-10);

  addMessage('user', message);
  history.push({ role: 'user', content: message });
  saveHistory();

  input.value = '';
  setLoading(true);

  try {
    const data = await apiFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        mode: modeElement.value,
        context: contextElement.value,
        history: previousHistory
      })
    });

    addMessage('assistant', data.answer);
    history.push({ role: 'assistant', content: data.answer });
    saveHistory();
  } catch (error) {
    addMessage('assistant', `Fehler: ${error.message}`);
  } finally {
    setLoading(false);
    input.focus();
  }
});

clearButton.addEventListener('click', () => {
  history = [];
  saveHistory();
  messages.innerHTML = '';
  addMessage('assistant', 'Chat wurde geleert. Wie kann ich helfen?');
});

function quizChatHistoryKey() {
  return `ihk-quiztool-chat-history:${currentUser?.id || 'guest'}`;
}

function saveQuizChatHistory() {
  localStorage.setItem(quizChatHistoryKey(), JSON.stringify(quizChatHistory.slice(-20)));
}

function loadQuizChatHistory() {
  try {
    quizChatHistory = JSON.parse(localStorage.getItem(quizChatHistoryKey()) || '[]');
  } catch {
    quizChatHistory = [];
  }
  renderSavedQuizChatHistory();
}

function addQuizMessage(role, content) {
  const article = document.createElement('article');
  article.className = `message ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;

  article.appendChild(bubble);
  quizMessages.appendChild(article);
  quizMessages.scrollTop = quizMessages.scrollHeight;
}

function renderSavedQuizChatHistory() {
  quizMessages.innerHTML = '';
  addQuizMessage('assistant', 'Hallo Florian, ich bin dein Quiz-Assistent. Frag mich zu IHK-Themen, Fragenpools oder Lernzielen.');
  for (const entry of quizChatHistory) {
    addQuizMessage(entry.role, entry.content);
  }
}

function setQuizChatLoading(isLoading) {
  quizSendButton.disabled = isLoading;
  quizMessageInput.disabled = isLoading;
  quizChatStatus.textContent = isLoading ? 'Antwort wird erzeugt ...' : 'Bereit';
}

quizChatForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const message = quizMessageInput.value.trim();
  if (!message) return;

  const previousHistory = quizChatHistory.slice(-10);
  const pool = selectedQuizPool();
  const context = [
    'Kontext: IHK QuizTool und Pruefungsvorbereitung.',
    pool ? `Aktiver Fragenpool: ${pool.label || pool.id}.` : '',
    quizTopicSelect.value ? `Aktives Topic: ${quizTopicSelect.value}.` : ''
  ].filter(Boolean).join('\n');

  addQuizMessage('user', message);
  quizChatHistory.push({ role: 'user', content: message });
  saveQuizChatHistory();

  quizMessageInput.value = '';
  setQuizChatLoading(true);

  try {
    const data = await apiFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        mode: 'unterricht',
        context,
        history: previousHistory
      })
    });

    addQuizMessage('assistant', data.answer);
    quizChatHistory.push({ role: 'assistant', content: data.answer });
    saveQuizChatHistory();
  } catch (error) {
    addQuizMessage('assistant', `Fehler: ${error.message}`);
  } finally {
    setQuizChatLoading(false);
    quizMessageInput.focus();
  }
});

quizClearButton.addEventListener('click', () => {
  quizChatHistory = [];
  saveQuizChatHistory();
  quizMessages.innerHTML = '';
  addQuizMessage('assistant', 'Chat wurde geleert. Womit starten wir?');
});

quizMessageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    quizChatForm.requestSubmit();
  }
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    form.requestSubmit();
  }
});

async function loadSession() {
  setAuthMode('login');
  try {
    const data = await apiFetch('/api/auth/me');
    showWorkspace(data.user);
  } catch {
    showAuth();
  }
}

loadSession();
