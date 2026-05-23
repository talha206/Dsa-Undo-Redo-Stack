import { useCallback, useEffect, useRef, useState } from 'react';

const API = '/api';

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function lineCount(s) {
  if (!s) return 1;
  return s.split('\n').length;
}

function StackColumn({ title, items, accent }) {
  return (
    <div className="flex min-h-[220px] flex-1 flex-col rounded-xl border border-neutral-700 bg-neutral-900/80 p-4 shadow-inner">
      <h3 className="mb-3 text-center text-sm font-semibold tracking-wide text-neutral-300">
        {title}
      </h3>
      <div className="flex flex-1 flex-col items-stretch justify-end gap-2">
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs italic text-neutral-500">empty</p>
        ) : (
          items.map((preview, i) => (
            <div
              key={`${i}-${preview}`}
              className={`stack-card rounded-md border px-3 py-2 text-center text-xs font-mono text-neutral-100 shadow-md transition-all duration-300 ease-out ${accent}`}
              style={{ animation: `stackIn 0.4s ease-out ${i * 45}ms both` }}
            >
              {preview || '∅'}
            </div>
          ))
        )}
      </div>
      <p className="mt-3 text-center text-[10px] text-neutral-500">Showing up to 5 snapshots (newest at top)</p>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState('');
  const [undoSize, setUndoSize] = useState(0);
  const [redoSize, setRedoSize] = useState(0);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [syntaxChecked, setSyntaxChecked] = useState(false);
  const [balanced, setBalanced] = useState(null);
  const [syntaxMessage, setSyntaxMessage] = useState('');
  const [brackets, setBrackets] = useState([]);

  const typeReq = useRef(0);

  const applyBufferState = useCallback((data) => {
    if (typeof data.text === 'string') setText(data.text);
    setUndoSize(data.undoSize ?? 0);
    setRedoSize(data.redoSize ?? 0);
    setUndoStack(Array.isArray(data.undoStack) ? data.undoStack : []);
    setRedoStack(Array.isArray(data.redoStack) ? data.redoStack : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet('/state');
        if (!cancelled) applyBufferState(data);
      } catch (e) {
        if (!cancelled) setError('Could not reach backend. Start the C++ server on port 8080.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyBufferState]);

  const handleChange = async (e) => {
    const next = e.target.value;
    setText(next);
    setError(null);
    const id = ++typeReq.current;
    try {
      const data = await apiPost('/type', { text: next });
      if (id !== typeReq.current) return;
      setUndoSize(data.undoSize ?? 0);
      setRedoSize(data.redoSize ?? 0);
      setUndoStack(Array.isArray(data.undoStack) ? data.undoStack : []);
      setRedoStack(Array.isArray(data.redoStack) ? data.redoStack : []);
    } catch (err) {
      if (id === typeReq.current) setError(err.message || String(err));
    }
  };

  const doUndo = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiPost('/undo', {});
      applyBufferState(data);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const doRedo = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiPost('/redo', {});
      applyBufferState(data);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const checkSyntax = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiPost('/check', { code: text });
      setSyntaxChecked(true);
      setBalanced(!!data.balanced);
      setSyntaxMessage(data.message || '');
      setBrackets(Array.isArray(data.brackets) ? data.brackets : []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const chars = text.length;
  const lines = lineCount(text);

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/90 px-5 py-4 shadow-lg backdrop-blur">
        <h1 className="text-xl font-semibold tracking-tight text-emerald-400/95">DSA Editor</h1>
        <div className="flex items-center gap-2">
          {!syntaxChecked ? (
            <span className="rounded-full border border-neutral-600 bg-neutral-800 px-3 py-1 text-xs text-neutral-400">
              Syntax: not checked
            </span>
          ) : balanced ? (
            <span className="rounded-full border border-emerald-600/60 bg-emerald-950/80 px-3 py-1 text-xs font-medium text-emerald-300">
              Balanced
            </span>
          ) : (
            <span className="rounded-full border border-red-700/60 bg-red-950/80 px-3 py-1 text-xs font-medium text-red-300">
              Unbalanced
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-amber-800/80 bg-amber-950/50 px-4 py-2 text-sm text-amber-200">
          {error}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <label className="text-sm text-neutral-400">Editor buffer (each edit is pushed to the undo stack)</label>
        <textarea
          value={text}
          onChange={handleChange}
          spellCheck={false}
          className="min-h-[280px] w-full resize-y rounded-lg border border-neutral-700 bg-[#1e1e1e] p-4 font-mono text-sm leading-relaxed text-emerald-400 shadow-inner outline-none ring-emerald-700/40 transition-shadow focus:ring-2"
          placeholder="// Type code here… parentheses, brackets, and braces are checked."
        />
        <div className="flex gap-4 text-xs text-neutral-500">
          <span>
            Characters: <strong className="text-neutral-300">{chars}</strong>
          </span>
          <span>
            Lines: <strong className="text-neutral-300">{lines}</strong>
          </span>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
        <button
          type="button"
          disabled={undoSize === 0 || busy}
          onClick={doUndo}
          className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo
        </button>
        <span className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-400">
          Undo stack: {undoSize}
        </span>
        <button
          type="button"
          disabled={redoSize === 0 || busy}
          onClick={doRedo}
          className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Redo
        </button>
        <span className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-400">
          Redo stack: {redoSize}
        </span>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-neutral-200">Syntax checker</h2>
          <button
            type="button"
            disabled={busy}
            onClick={checkSyntax}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-600 disabled:opacity-50"
          >
            Check syntax
          </button>
        </div>
        {syntaxChecked && (
          <div
            className={`mb-4 flex items-start gap-3 rounded-lg border p-4 ${
              balanced
                ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-200'
                : 'border-red-800/60 bg-red-950/40 text-red-100'
            }`}
          >
            <span className="text-2xl leading-none">{balanced ? '✓' : '✗'}</span>
            <p className="text-sm">{syntaxMessage}</p>
          </div>
        )}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Bracket tracker
          </h3>
          <div className="max-h-48 overflow-auto rounded-lg border border-neutral-800 bg-[#1a1a1a] p-3 font-mono text-xs">
            {brackets.length === 0 ? (
              <p className="text-neutral-500">Run a syntax check to list each bracket and match status.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {brackets.map((b, idx) => (
                  <li
                    key={`${b.position}-${idx}`}
                    className={`rounded border px-2 py-1 ${
                      b.matched
                        ? 'border-emerald-800/80 bg-emerald-950/50 text-emerald-300'
                        : 'border-red-800/80 bg-red-950/50 text-red-200'
                    }`}
                    title={`pos ${b.position}`}
                  >
                    <span className="font-semibold">{b.bracket}</span>
                    <span className="text-neutral-500"> @{b.position}</span>
                    {b.matched && b.pairPosition >= 0 && (
                      <span className="text-neutral-400"> → {b.pairPosition}</span>
                    )}
                    <span className="ml-1 text-[10px] uppercase">{b.matched ? 'ok' : 'no'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border-2 border-emerald-900/50 bg-gradient-to-b from-neutral-900 to-neutral-950 p-5 shadow-xl">
        <h2 className="mb-1 text-center text-lg font-bold text-emerald-400">Stack visualizer (DSA)</h2>
        <p className="mb-6 text-center text-xs text-neutral-500">
          Two stacks drive undo/redo; each box is a saved text snapshot (truncated to 20 characters).
        </p>
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
          <StackColumn
            title="Undo stack"
            items={undoStack}
            accent="border-amber-700/50 bg-amber-950/40 ring-1 ring-amber-800/30"
          />
          <StackColumn
            title="Redo stack"
            items={redoStack}
            accent="border-sky-700/50 bg-sky-950/40 ring-1 ring-sky-800/30"
          />
        </div>
      </section>

      <style>{`
        @keyframes stackIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .stack-card {
          transition: transform 0.35s ease, opacity 0.35s ease, box-shadow 0.35s ease;
        }
      `}</style>
    </div>
  );
}
