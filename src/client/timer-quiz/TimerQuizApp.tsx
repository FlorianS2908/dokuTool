import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { defaultTimerQuizPools } from './default-pools';
import type { AnswerValue, QuizPool, QuizQuestion, SqlBlock, SqlOrderQuestion, TopicResult } from './types';

type Screen = 'start' | 'quiz' | 'result';
type FinishReason = 'manual' | 'timeout';

const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

function durationMinutes(pool: QuizPool): number {
  return Math.max(1, Number(pool.timeLimitMinutes || pool.durationMinutes || 60));
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeCodeBlocks(value: string): string {
  return String(value || '').replace(/```(?:python|py)?\s*([\s\S]*?)```/gi, (_match, code) => {
    return `<pre><code>${escapeHtml(String(code).trim())}</code></pre>`;
  });
}

function sanitizeHtml(value: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${normalizeCodeBlocks(value)}</div>`, 'text/html');
  const allowedTags = new Set(['BR', 'STRONG', 'B', 'EM', 'I', 'SMALL', 'CODE', 'PRE']);

  const cleanNode = (node: Node): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (!allowedTags.has(element.tagName)) {
          element.replaceWith(document.createTextNode(element.textContent || ''));
          continue;
        }
        for (const attr of Array.from(element.attributes)) element.removeAttribute(attr.name);
      }
      cleanNode(child);
    }
  };

  cleanNode(document.body);
  return document.body.firstElementChild?.innerHTML || '';
}

function RichText({ html }: { html?: string }) {
  const safeHtml = useMemo(() => sanitizeHtml(html || ''), [html]);
  return <span dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}

function isSqlOrderQuestion(question: QuizQuestion): question is SqlOrderQuestion {
  return question.type === 'sql-order' || Array.isArray((question as SqlOrderQuestion).blocks);
}

function optionIndexFromValue(value: unknown, options: string[]): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (/^\d+$/.test(raw)) return Number(raw);
  const lettersMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 };
  if (raw.toUpperCase() in lettersMap) return lettersMap[raw.toUpperCase()];
  const textIndex = options.findIndex((option) => String(option).trim() === raw);
  return textIndex >= 0 ? textIndex : null;
}

function normalizeBlocks(rawBlocks: unknown): SqlBlock[] {
  if (!Array.isArray(rawBlocks) || !rawBlocks.length) return [];
  const used = new Set<string>();
  return rawBlocks.map((block, index) => {
    const source = block && typeof block === 'object' ? block as Record<string, unknown> : null;
    const text = typeof block === 'string'
      ? block
      : String(source?.text ?? source?.code ?? source?.label ?? source?.value ?? source?.content ?? `Baustein ${index + 1}`);
    let id = source
      ? String(source.id ?? source.key ?? source.value ?? `b${index + 1}`)
      : `b${index + 1}`;
    id = id.replace(/\s+/g, '_');
    if (used.has(id)) id = `${id}_${index + 1}`;
    used.add(id);
    return { id, text };
  });
}

function normalizeOrder(rawOrder: unknown, blocks: SqlBlock[]): string[] {
  let values: unknown[] = [];
  if (Array.isArray(rawOrder)) values = rawOrder;
  else if (typeof rawOrder === 'number') values = [rawOrder];
  else if (typeof rawOrder === 'string') values = rawOrder.split(/[;,|]/).map((value) => value.trim()).filter(Boolean);

  const result: string[] = [];
  for (const value of values) {
    let id: string | null = null;
    if (typeof value === 'number' && Number.isInteger(value) && blocks[value]) id = blocks[value].id;
    else if (value && typeof value === 'object') {
      const source = value as Record<string, unknown>;
      id = String(source.id || blocks.find((block) => block.text === source.text || block.text === source.code || block.id === source.key)?.id || '');
    } else if (typeof value === 'string') {
      const raw = value.trim();
      if (/^\d+$/.test(raw) && blocks[Number(raw)]) id = blocks[Number(raw)].id;
      id = id || blocks.find((block) => block.id === raw || block.text.trim() === raw)?.id || null;
    }
    if (id && blocks.some((block) => block.id === id) && !result.includes(id)) result.push(id);
  }
  return result;
}

function normalizeCorrect(raw: unknown, options: string[]): number[] {
  let values: unknown[] = [];
  if (Array.isArray(raw)) values = raw;
  else if (typeof raw === 'number') values = [raw];
  else if (typeof raw === 'string') values = raw.split(/[;,|]/).map((value) => value.trim()).filter(Boolean);

  const result: number[] = [];
  for (const value of values) {
    const index = optionIndexFromValue(value, options);
    if (index !== null && index >= 0 && index < options.length && !result.includes(index)) result.push(index);
  }
  return result.sort((a, b) => a - b);
}

function normalizePool(data: unknown, filename = 'Fragenpool'): QuizPool {
  const source = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  let pool: Record<string, unknown>;

  if (Array.isArray(data)) pool = { name: filename.replace(/\.json$/i, ''), questions: data, topicLabels: {}, difficultyLabels: {} };
  else if (Array.isArray(source.questions)) pool = { ...source };
  else if (Array.isArray(source.items)) pool = { ...source, questions: source.items };
  else throw new Error('Keine questions-Liste gefunden. Erwartet wird ein Objekt mit questions, items oder eine direkte Fragenliste.');

  const questions = pool.questions as unknown[];
  if (!questions.length) throw new Error('Der Fragenpool enthält keine Fragen.');

  return {
    id: `pool_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: String(pool.name || filename.replace(/\.json$/i, '') || 'Geladener Fragenpool'),
    description: String(pool.description || ''),
    durationMinutes: Number(pool.durationMinutes || pool.timeLimitMinutes || 60),
    timeLimitMinutes: Number(pool.timeLimitMinutes || pool.durationMinutes || 60),
    topicLabels: pool.topicLabels as Record<string, string> || {},
    difficultyLabels: pool.difficultyLabels as Record<string, string> || {},
    questions: questions.map((rawQuestion, index) => {
      if (!rawQuestion || typeof rawQuestion !== 'object') throw new Error(`Frage ${index + 1} ist kein gültiges Objekt.`);
      const question = rawQuestion as Record<string, unknown>;
      const base = {
        id: question.id as string | number | undefined || index + 1,
        text: String(question.text || question.question || question.frage || question.title || `Frage ${index + 1}`),
        topic: String(question.topic || question.thema || 'default'),
        difficulty: String(question.difficulty || question.schwierigkeit || 'mittel')
      };
      const explicitType = String(question.type || question.questionType || question.mode || question.kind || '').toLowerCase();
      const looksLikeDrag = explicitType.includes('drag')
        || explicitType.includes('order')
        || Array.isArray(question.blocks)
        || Array.isArray(question.correctOrder);

      if (looksLikeDrag) {
        const blocks = normalizeBlocks(question.blocks || question.bausteine || question.syntaxBlocks || question.parts || question.options || []);
        if (!blocks.length) throw new Error(`Frage ${index + 1} hat keine SQL-Bausteine in blocks.`);
        const correctOrder = normalizeOrder(
          question.correctOrder ?? question.order ?? question.solutionOrder ?? question.correctSequence ?? question.solution ?? question.correct,
          blocks
        );
        if (!correctOrder.length) throw new Error(`Frage ${index + 1} hat keine gültige Lösung in correctOrder.`);
        return {
          ...base,
          type: 'sql-order' as const,
          blocks,
          correctOrder,
          solutionSql: typeof question.solutionSql === 'string' ? question.solutionSql : undefined
        };
      }

      const options = (question.options || question.answers || question.antworten || question.choices || []) as string[];
      if (!Array.isArray(options) || !options.length) throw new Error(`Frage ${index + 1} hat keine Antwortoptionen.`);
      const correct = normalizeCorrect(question.correct ?? question.correctAnswers ?? question.correctIndices ?? question.solution ?? question.answer, options);
      if (!correct.length) throw new Error(`Frage ${index + 1} hat keine gültige Lösung in correct.`);
      return { ...base, type: String(question.type || 'choice'), options: options.map(String), correct };
    })
  };
}

function correctAnswer(question: QuizQuestion, answer: AnswerValue | undefined): boolean {
  if (isSqlOrderQuestion(question)) {
    const current = Array.isArray(answer) ? answer as string[] : [];
    return current.length === question.correctOrder.length && current.every((value, index) => value === question.correctOrder[index]);
  }
  const current = (Array.isArray(answer) ? answer as number[] : []).slice().sort((a, b) => a - b);
  const correct = question.correct.slice().sort((a, b) => a - b);
  return current.length === correct.length && current.every((value, index) => value === correct[index]);
}

function answered(question: QuizQuestion, answer: AnswerValue | undefined): boolean {
  const current = Array.isArray(answer) ? answer : [];
  if (isSqlOrderQuestion(question)) return current.length >= question.correctOrder.length;
  return current.length > 0;
}

function statsFor(pool: QuizPool, answers: AnswerValue[]): { good: number; rows: TopicResult[] } {
  let good = 0;
  const stats = new Map<string, { total: number; correct: number }>();
  for (const [index, question] of pool.questions.entries()) {
    const key = question.topic || 'default';
    const current = stats.get(key) || { total: 0, correct: 0 };
    current.total += 1;
    if (correctAnswer(question, answers[index])) {
      current.correct += 1;
      good += 1;
    }
    stats.set(key, current);
  }

  return {
    good,
    rows: Array.from(stats.entries()).map(([key, value]) => {
      const correctPct = Math.round((value.correct / value.total) * 100);
      return {
        key,
        label: pool.topicLabels?.[key] || key,
        total: value.total,
        correct: value.correct,
        wrong: value.total - value.correct,
        correctPct,
        wrongPct: 100 - correctPct
      };
    })
  };
}

function blockText(question: SqlOrderQuestion, id: string): string {
  return question.blocks.find((block) => block.id === id)?.text || id;
}

export function TimerQuizApp() {
  const [pools, setPools] = useState<QuizPool[]>(defaultTimerQuizPools);
  const [selectedPoolId, setSelectedPoolId] = useState(defaultTimerQuizPools[0]?.id || '');
  const [screen, setScreen] = useState<Screen>('start');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerValue[]>([]);
  const [seconds, setSeconds] = useState(durationMinutes(defaultTimerQuizPools[0]) * 60);
  const [finishReason, setFinishReason] = useState<FinishReason>('manual');
  const [uploadStatus, setUploadStatus] = useState('Noch kein zusätzlicher Fragenpool geladen.');

  const pool = useMemo(() => pools.find((item) => item.id === selectedPoolId) || pools[0], [pools, selectedPoolId]);
  const question = pool?.questions[index];
  const result = useMemo(() => pool ? statsFor(pool, answers) : { good: 0, rows: [] }, [pool, answers]);
  const percent = pool?.questions.length ? Math.round((result.good / pool.questions.length) * 100) : 0;
  const weakest = result.rows.reduce<TopicResult | null>((current, row) => {
    if (!current || row.wrongPct > current.wrongPct) return row;
    return current;
  }, null);

  useEffect(() => {
    if (screen !== 'quiz') return undefined;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setFinishReason('timeout');
          setScreen('result');
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [screen]);

  function resetForPool(nextPool = pool) {
    setIndex(0);
    setAnswers([]);
    setSeconds(durationMinutes(nextPool) * 60);
    setFinishReason('manual');
  }

  function startTest() {
    if (!pool?.questions.length) return;
    resetForPool(pool);
    setScreen('quiz');
  }

  function endTest(reason: FinishReason) {
    setFinishReason(reason);
    setScreen('result');
  }

  function setChoiceAnswer(optionIndex: number) {
    setAnswers((previous) => {
      const next = [...previous];
      const current = Array.isArray(next[index]) ? [...next[index] as number[]] : [];
      const position = current.indexOf(optionIndex);
      if (position >= 0) current.splice(position, 1);
      else current.push(optionIndex);
      next[index] = current;
      return next;
    });
  }

  function setSqlAnswer(order: string[]) {
    setAnswers((previous) => {
      const next = [...previous];
      next[index] = order;
      return next;
    });
  }

  function insertSqlBlock(blockId: string, targetIndex?: number) {
    if (!question || !isSqlOrderQuestion(question)) return;
    const validIds = question.blocks.map((block) => block.id);
    if (!validIds.includes(blockId)) return;
    const current = Array.isArray(answers[index]) ? answers[index] as string[] : [];
    const order = current.filter((id) => id !== blockId);
    const position = targetIndex === undefined ? order.length : Math.max(0, Math.min(targetIndex, order.length));
    order.splice(position, 0, blockId);
    setSqlAnswer(order);
  }

  function moveSqlBlock(blockId: string, delta: number) {
    const current = Array.isArray(answers[index]) ? answers[index] as string[] : [];
    const position = current.indexOf(blockId);
    if (position < 0) return;
    const nextPosition = Math.max(0, Math.min(current.length - 1, position + delta));
    const next = [...current];
    next.splice(position, 1);
    next.splice(nextPosition, 0, blockId);
    setSqlAnswer(next);
  }

  function nextUnanswered() {
    if (!pool) return;
    for (let offset = 1; offset <= pool.questions.length; offset += 1) {
      const nextIndex = (index + offset) % pool.questions.length;
      if (!answered(pool.questions[nextIndex], answers[nextIndex])) {
        setIndex(nextIndex);
        return;
      }
    }
  }

  async function loadJsonFiles(files: FileList | null) {
    const list = Array.from(files || []);
    if (!list.length) {
      setUploadStatus('Keine Datei ausgewählt.');
      return;
    }

    for (const file of list) {
      try {
        const raw = (await file.text()).replace(/^\uFEFF/, '').trim();
        if (!raw) throw new Error('Datei ist leer.');
        const nextPool = normalizePool(JSON.parse(raw), file.name);
        setPools((previous) => [...previous, nextPool]);
        setSelectedPoolId(nextPool.id || '');
        resetForPool(nextPool);
        setUploadStatus(`Geladen: ${nextPool.name} · ${nextPool.questions.length} Fragen · ${durationMinutes(nextPool)} Minuten`);
      } catch (error) {
        setUploadStatus(`JSON konnte nicht geladen werden: ${(error as Error).message}`);
      }
    }
  }

  if (!pool) return <div className="timer-quiz-empty">Kein Fragenpool vorhanden.</div>;

  return (
    <div className="timer-quiz-app">
      <header className="timer-quiz-header">
        <div>
          <span className="eyebrow">React + TypeScript</span>
          <h2>Timer-Quiz</h2>
          <p>JSON-Fragenpools laden, Python-Code anzeigen und Prüfungsfragen mit Zeitlimit bearbeiten.</p>
        </div>
        <span className={`timer-pill ${seconds <= 60 && screen === 'quiz' ? 'danger' : seconds <= 300 && screen === 'quiz' ? 'warn' : ''}`}>
          {formatTime(seconds)}
        </span>
      </header>

      {screen === 'start' && (
        <section className="timer-quiz-start">
          <article className="timer-quiz-card">
            <h3>Fragenpool</h3>
            <label>
              Aktiver Pool
              <select
                value={selectedPoolId}
                onChange={(event) => {
                  const nextPool = pools.find((item) => item.id === event.target.value) || pools[0];
                  setSelectedPoolId(nextPool.id || '');
                  resetForPool(nextPool);
                }}
              >
                {pools.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <p>{pool.description}</p>
            <div className="timer-quiz-meta">
              <span>{pool.questions.length} Fragen</span>
              <span>{durationMinutes(pool)} Minuten</span>
              <span>{Object.keys(pool.topicLabels || {}).length || 'freie'} Themen</span>
            </div>
            <label className="upload-button timer-upload">
              JSON-Fragenpool laden
              <input type="file" accept=".json,application/json" multiple onChange={(event) => loadJsonFiles(event.target.files)} />
            </label>
            <p className="status-line">{uploadStatus}</p>
            <button type="button" onClick={startTest}>Test starten</button>
          </article>

          <article className="timer-quiz-card">
            <h3>Python-Code</h3>
            <p>Fragen und Antworten können Code-Fences wie <code>```python</code> oder HTML-<code>&lt;code&gt;</code>-Abschnitte enthalten. Diese werden im Quiz und in der Auswertung als Code dargestellt.</p>
            <pre><code>{'def pruefe_import(datensaetze):\n    return [d for d in datensaetze if d.get("status") == "aktiv"]'}</code></pre>
          </article>
        </section>
      )}

      {screen === 'quiz' && question && (
        <section className="timer-quiz-play">
          <div className="timer-quiz-meta-row">
            <strong>Frage {index + 1} von {pool.questions.length}</strong>
            <span>{pool.topicLabels?.[question.topic || ''] || question.topic || 'Allgemein'}</span>
            <span>{pool.difficultyLabels?.[question.difficulty || ''] || question.difficulty}</span>
          </div>
          <div className="progressbar timer-progress"><span style={{ width: `${((index + 1) / pool.questions.length) * 100}%` }} /></div>
          <article className="timer-question">
            <div className="timer-question-text"><RichText html={question.text} /></div>
            {isSqlOrderQuestion(question) ? (
              <SqlOrderQuestionView
                question={question}
                answer={Array.isArray(answers[index]) ? answers[index] as string[] : []}
                insertBlock={insertSqlBlock}
                removeBlock={(blockId) => setSqlAnswer((answers[index] as string[] || []).filter((id) => id !== blockId))}
                moveBlock={moveSqlBlock}
              />
            ) : (
              <div className="timer-answers">
                {question.options.map((option, optionIndex) => {
                  const current = Array.isArray(answers[index]) ? answers[index] as number[] : [];
                  return (
                    <button
                      className={`timer-answer ${current.includes(optionIndex) ? 'selected' : ''}`}
                      key={`${question.id}-${optionIndex}`}
                      type="button"
                      onClick={() => setChoiceAnswer(optionIndex)}
                    >
                      <span>{letters[optionIndex] || '?'}</span>
                      <RichText html={option} />
                    </button>
                  );
                })}
              </div>
            )}
          </article>

          <div className="timer-quiz-actions">
            <button className="secondary" type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>Zurück</button>
            <button className="secondary" type="button" disabled={index === pool.questions.length - 1} onClick={() => setIndex((value) => Math.min(pool.questions.length - 1, value + 1))}>Weiter</button>
            <button className="secondary" type="button" onClick={nextUnanswered}>Nächste offene Frage</button>
            <button type="button" onClick={() => endTest('manual')}>Test beenden</button>
          </div>

          <div className="timer-overview">
            {pool.questions.map((item, itemIndex) => (
              <button
                key={`${item.id}-${itemIndex}`}
                type="button"
                className={`${itemIndex === index ? 'current' : ''} ${answered(item, answers[itemIndex]) ? 'answered' : ''}`}
                onClick={() => setIndex(itemIndex)}
              >
                {itemIndex + 1}
              </button>
            ))}
          </div>
        </section>
      )}

      {screen === 'result' && (
        <section className="timer-results">
          <div className="summary mini">
            <article className="metric"><strong>{percent}%</strong><span>Quote</span></article>
            <article className="metric"><strong>{result.good}/{pool.questions.length}</strong><span>Richtig</span></article>
            <article className="metric"><strong>{finishReason === 'timeout' ? 'Zeit abgelaufen' : 'Beendet'}</strong><span>Status</span></article>
          </div>
          {weakest && (
            <article className="timer-quiz-card">
              <h3>Größter Wiederholungsbedarf</h3>
              <p><strong>{weakest.label}</strong> · {weakest.wrong} Fehler bei {weakest.total} Fragen</p>
            </article>
          )}
          <table className="timer-topic-table">
            <thead><tr><th>Thema</th><th>Richtig</th><th>Falsch</th><th>Quote</th></tr></thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{row.correct}/{row.total}</td>
                  <td>{row.wrong}</td>
                  <td>{row.correctPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="timer-detail-list">
            {pool.questions.map((item, itemIndex) => (
              <ResultDetail key={`${item.id}-${itemIndex}`} index={itemIndex} pool={pool} question={item} answer={answers[itemIndex]} />
            ))}
          </div>
          <div className="timer-quiz-actions">
            <button type="button" onClick={startTest}>Nochmal starten</button>
            <button className="secondary" type="button" onClick={() => { resetForPool(pool); setScreen('start'); }}>Zur Startseite</button>
          </div>
        </section>
      )}
    </div>
  );
}

function SqlOrderQuestionView({
  question,
  answer,
  insertBlock,
  removeBlock,
  moveBlock
}: {
  question: SqlOrderQuestion;
  answer: string[];
  insertBlock: (blockId: string, targetIndex?: number) => void;
  removeBlock: (blockId: string) => void;
  moveBlock: (blockId: string, delta: number) => void;
}) {
  const used = new Set(answer);
  const available = question.blocks.filter((block) => !used.has(block.id));
  const selected = answer.map((id) => question.blocks.find((block) => block.id === id)).filter(Boolean) as SqlBlock[];

  return (
    <div className="sql-order-box">
      <div className="sql-zone">
        <h3>Verfügbare Bausteine</h3>
        <p>Klicke oder ziehe Bausteine in die Lösung.</p>
        <div className="sql-chip-list">
          {available.length ? available.map((block) => (
            <SqlChip key={block.id} block={block} onClick={() => insertBlock(block.id)} />
          )) : <div className="sql-empty">Keine weiteren Bausteine verfügbar.</div>}
        </div>
      </div>
      <div
        className="sql-zone solution"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          insertBlock(event.dataTransfer.getData('text/plain'));
        }}
      >
        <h3>Deine SQL-Reihenfolge</h3>
        <p>Nur benötigte Bausteine verwenden.</p>
        <div className="sql-chip-list">
          {selected.length ? selected.map((block, position) => (
            <SqlChip
              key={block.id}
              block={block}
              onClick={() => undefined}
              onDrop={(blockId) => insertBlock(blockId, position)}
            >
              <div className="sql-chip-actions">
                <button type="button" onClick={() => moveBlock(block.id, -1)}>↑</button>
                <button type="button" onClick={() => moveBlock(block.id, 1)}>↓</button>
                <button type="button" onClick={() => removeBlock(block.id)}>×</button>
              </div>
            </SqlChip>
          )) : <div className="sql-empty">Bausteine hier ablegen.</div>}
        </div>
      </div>
    </div>
  );
}

function SqlChip({
  block,
  children,
  onClick,
  onDrop
}: {
  block: SqlBlock;
  children?: React.ReactNode;
  onClick: () => void;
  onDrop?: (blockId: string) => void;
}) {
  return (
    <div
      className="sql-chip"
      draggable
      onClick={onClick}
      onDragStart={(event) => event.dataTransfer.setData('text/plain', block.id)}
      onDragOver={(event) => onDrop && event.preventDefault()}
      onDrop={(event) => {
        if (!onDrop) return;
        event.preventDefault();
        onDrop(event.dataTransfer.getData('text/plain'));
      }}
    >
      <code>{block.text}</code>
      {children}
    </div>
  );
}

function ResultDetail({
  index,
  pool,
  question,
  answer
}: {
  index: number;
  pool: QuizPool;
  question: QuizQuestion;
  answer: AnswerValue | undefined;
}) {
  const ok = correctAnswer(question, answer);

  return (
    <article className={`timer-detail ${ok ? 'correct' : 'wrong'}`}>
      <header>
        <div>
          <strong>Frage {index + 1}</strong>
          <small>{pool.topicLabels?.[question.topic || ''] || question.topic || 'Allgemein'} · {question.difficulty}</small>
        </div>
        <span>{ok ? 'Richtig' : 'Falsch'}</span>
      </header>
      <div className="timer-detail-question"><RichText html={question.text} /></div>
      {isSqlOrderQuestion(question) ? (
        <div className="sql-result">
          <div><strong>Deine Reihenfolge</strong><ol>{((answer || []) as string[]).map((id) => <li key={id}><code>{blockText(question, id)}</code></li>)}</ol></div>
          <div><strong>Richtig</strong><ol>{question.correctOrder.map((id) => <li key={id}><code>{blockText(question, id)}</code></li>)}</ol></div>
          {question.solutionSql && <pre><code>{question.solutionSql}</code></pre>}
        </div>
      ) : (
        <ul className="timer-result-options">
          {question.options.map((option, optionIndex) => {
            const selected = ((answer || []) as number[]).includes(optionIndex);
            const correct = question.correct.includes(optionIndex);
            return <li className={`${selected && correct ? 'good' : selected && !correct ? 'bad' : !selected && correct ? 'missed' : ''}`} key={optionIndex}><RichText html={option} /></li>;
          })}
        </ul>
      )}
    </article>
  );
}
