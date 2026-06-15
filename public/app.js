const panels = {
  checker: document.querySelector('#checkerPanel'),
  chat: document.querySelector('#chatPanel')
};
const tabs = document.querySelectorAll('.tab');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    Object.values(panels).forEach((panel) => panel.classList.remove('visible'));
    panels[tab.dataset.tab].classList.add('visible');
  });
});

const analyzeForm = document.querySelector('#analyzeForm');
const analyzeButton = document.querySelector('#analyzeButton');
const analyzeStatus = document.querySelector('#analyzeStatus');
const summaryElement = document.querySelector('#summary');
const resultTableBody = document.querySelector('#resultTable tbody');
const downloadExcelButton = document.querySelector('#downloadExcelButton');
const downloadJsonButton = document.querySelector('#downloadJsonButton');

let currentReport = null;

function statusLabel(status) {
  return {
    gruen: 'Grün',
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

function setAnalyzeLoading(isLoading) {
  analyzeButton.disabled = isLoading;
  analyzeStatus.textContent = isLoading ? 'Dokument wird geprüft ...' : 'Bereit';
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
    formData.set('useAi', document.querySelector('#useAi').checked ? 'true' : 'false');

    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analyse fehlgeschlagen.');

    currentReport = data;
    renderSummary(data);
    renderResults(data);
    downloadExcelButton.disabled = false;
    downloadJsonButton.disabled = false;

    const aiText = data.ai?.used ? ` KI-Zusatzprüfung mit ${data.ai.model} ausgeführt.` : data.ai?.error ? ` KI-Zusatzprüfung nicht ausgeführt: ${data.ai.error}` : '';
    analyzeStatus.textContent = `Bericht erstellt.${aiText}`;
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
      body: JSON.stringify(currentReport)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Excel-Bericht konnte nicht erstellt werden.');
    }
    const blob = await response.blob();
    downloadBlob(blob, 'ihk-pruefbericht.xlsx');
  } catch (error) {
    analyzeStatus.textContent = `Fehler: ${error.message}`;
  } finally {
    downloadExcelButton.disabled = false;
  }
});

// Chat-Bereich
const form = document.querySelector('#chatForm');
const input = document.querySelector('#messageInput');
const messages = document.querySelector('#messages');
const sendButton = document.querySelector('#sendButton');
const clearButton = document.querySelector('#clearButton');
const statusElement = document.querySelector('#status');
const modeElement = document.querySelector('#mode');
const contextElement = document.querySelector('#context');

let history = JSON.parse(localStorage.getItem('ihk-dokutool-chat-history') || '[]');

function saveHistory() {
  localStorage.setItem('ihk-dokutool-chat-history', JSON.stringify(history.slice(-20)));
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
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        mode: modeElement.value,
        context: contextElement.value,
        history: previousHistory
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Die Anfrage konnte nicht verarbeitet werden.');
    }

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

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    form.requestSubmit();
  }
});

renderSavedHistory();
