import { useEffect, useState, type CSSProperties } from 'react';
import { Icon } from './Icons';
import {
  focusDurations,
  focusKey,
  freshSession,
  readFocus,
  readScratchpad,
  remainingSeconds,
  saveTool,
  scratchpadKey,
  scratchpadLimit,
  toggleSession,
  wordCount,
  type FocusSession,
} from '../lib/tools';

export function Tools({ visible }: { visible: boolean }) {
  const [session, setSession] = useState(readFocus);
  const [now, setNow] = useState(Date.now);
  const [note, setNote] = useState(readScratchpad);
  const [noteStatus, setNoteStatus] = useState('Stored only on this device.');
  const [timerStatus, setTimerStatus] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const remaining = remainingSeconds(session, now);
  const running = session.endsAt !== null && remaining > 0;

  useEffect(() => {
    if (session.endsAt === null) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (remainingSeconds(session, time) > 0) return;
      const next = { ...session, remaining: 0, endsAt: null };
      setSession(next);
      setTimerStatus(
        saveTool(focusKey, JSON.stringify(next))
          ? 'Session complete. Take a breath, then take a break.'
          : 'Session complete. Timer changes could not be saved on this device.',
      );
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [session]);

  function updateSession(next: FocusSession) {
    setSession(next);
    setTimerStatus(
      saveTool(focusKey, JSON.stringify(next))
        ? ''
        : 'Timer works for this visit; changes could not be saved on this device.',
    );
  }

  function updateNote(value: string) {
    const next = value.slice(0, scratchpadLimit);
    setNote(next);
    setNoteStatus(
      saveTool(scratchpadKey, next)
        ? 'Saved on this device.'
        : 'For this visit only. This device could not save your note.',
    );
  }

  async function copyNote() {
    try {
      await navigator.clipboard.writeText(note);
      setNoteStatus('Note copied to clipboard.');
    } catch {
      setNoteStatus('Could not copy. Select the text and copy it manually.');
    }
  }

  function downloadNote() {
    const url = URL.createObjectURL(new Blob([note], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hush-note.txt';
    link.click();
    URL.revokeObjectURL(url);
    setNoteStatus('Note downloaded as hush-note.txt.');
  }

  return (
    <section
      className="tools-page"
      aria-labelledby="tools-title"
      hidden={!visible}
    >
      <div className="tools-heading">
        <p className="eyebrow">A LITTLE ROOM TO THINK</p>
        <h1 id="tools-title">
          Make space for <em>yourself.</em>
        </h1>
        <p>One thing at a time. A few simple tools to help you along.</p>
        <span className="local-badge">
          <Icon name="check" /> On-device tools · No account needed
        </span>
      </div>
      <div className="tools-grid">
        <article className="tool-card focus-card" aria-labelledby="focus-title">
          <div className="tool-card-heading">
            <span className="tool-symbol">
              <Icon name="timer" />
            </span>
            <span className="eyebrow">FIND YOUR FLOW</span>
          </div>
          <h2 id="focus-title">A moment of focus</h2>
          <p>Choose a little time for what matters.</p>
          <div
            className="duration-options"
            role="group"
            aria-label="Focus duration"
          >
            {focusDurations.map((minutes) => (
              <button
                key={minutes}
                aria-pressed={session.minutes === minutes}
                disabled={running}
                onClick={() => updateSession(freshSession(minutes))}
              >
                {minutes} min
              </button>
            ))}
          </div>
          <div
            className="timer-ring"
            style={
              {
                '--progress': `${(1 - remaining / (session.minutes * 60)) * 100}%`,
              } as CSSProperties
            }
          >
            <div>
              <span
                className="timer-digits"
                role="timer"
                aria-label="Time remaining"
              >
                {String(Math.floor(remaining / 60)).padStart(2, '0')}:
                {String(remaining % 60).padStart(2, '0')}
              </span>
              <span>
                {running
                  ? 'You have this.'
                  : remaining === 0
                    ? 'Well done.'
                    : 'Your time. Your pace.'}
              </span>
            </div>
          </div>
          <div className="tool-actions">
            <button
              className="tool-primary"
              onClick={() => updateSession(toggleSession(session))}
            >
              <Icon name={running ? 'pause' : 'play'} />
              {running
                ? 'Pause focus'
                : remaining === 0
                  ? 'Start again'
                  : remaining < session.minutes * 60
                    ? 'Resume focus'
                    : 'Start focus'}
            </button>
            <button
              className="tool-secondary"
              onClick={() => updateSession(freshSession(session.minutes))}
            >
              Reset
            </button>
          </div>
          <p className="tool-status" role="status">
            {timerStatus}
          </p>
          <p className="tool-footnote">
            Keeps time when you leave. Check back here when you’re ready; no
            background alarm.
          </p>
        </article>
        <article
          className="tool-card scratchpad-card"
          aria-labelledby="scratchpad-title"
        >
          <div className="tool-card-heading">
            <span className="tool-symbol">
              <Icon name="note" />
            </span>
            <span className="eyebrow">CATCH A THOUGHT</span>
          </div>
          <h2 id="scratchpad-title">Your scratchpad</h2>
          <p>A thought, a list, a tiny next step. Make it yours.</p>
          <label className="sr-only" htmlFor="scratchpad">
            Your private note
          </label>
          <textarea
            id="scratchpad"
            value={note}
            maxLength={scratchpadLimit}
            placeholder="What’s on your mind?"
            onChange={(event) => updateNote(event.target.value)}
          />
          <div className="scratchpad-meta">
            <span>
              {wordCount(note).toLocaleString()} words ·{' '}
              {note.length.toLocaleString()} /{' '}
              {scratchpadLimit.toLocaleString()}
            </span>
            <button
              className="tool-secondary"
              disabled={!note}
              onClick={() => void copyNote()}
            >
              Copy
            </button>
            <button
              className="tool-secondary"
              disabled={!note}
              onClick={downloadNote}
            >
              Download
            </button>
            <button
              className="tool-secondary"
              disabled={!note}
              onClick={() => setConfirmClear(true)}
            >
              Clear note
            </button>
          </div>
          {confirmClear && (
            <div
              className="clear-note-prompt"
              role="group"
              aria-label="Confirm clearing note"
            >
              <p>Clear this note? This cannot be undone.</p>
              <button
                className="tool-secondary"
                onClick={() => setConfirmClear(false)}
              >
                Keep note
              </button>
              <button
                className="tool-secondary"
                onClick={() => {
                  updateNote('');
                  setConfirmClear(false);
                }}
              >
                Yes, clear note
              </button>
            </div>
          )}
          <p className="tool-status" role="status">
            {noteStatus}
          </p>
          <p className="tool-footnote">
            Autosaves as you type. Stored in this app’s local storage; clearing
            app data removes it. Avoid storing sensitive information.
          </p>
        </article>
      </div>
      <p className="tools-closing">
        <Icon name="spark" /> Less noise. A little more headspace.
      </p>
    </section>
  );
}
