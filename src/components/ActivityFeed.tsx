import { useEffect, useState } from 'react';
import { memberName, useApp } from '../AppContext';
import { todayIso, type ActivityEntry } from '../model';

function when(at: number) {
  const d = new Date(at);
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (iso === todayIso()) return `heute ${time}`;
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })} ${time}`;
}

const PAGE = 15;

/** Kommentare und automatischer Verlauf eines Projekts */
export function ActivityFeed({ projectId }: { projectId: string }) {
  const { backend, me, members } = useApp();
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [text, setText] = useState('');
  const [showEvents, setShowEvents] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(
    () => backend.subscribeActivity(projectId, setEntries, (e) => console.error('Verlauf', e)),
    [backend, projectId],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    backend.addActivity(projectId, { type: 'comment', text: t, by: me });
    setText('');
  };

  const visible = (entries ?? []).filter((e) => showEvents || e.type === 'comment');

  return (
    <div className="activity">
      <form className="comment-form" onSubmit={submit}>
        <textarea
          className="input"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          placeholder="Kommentar schreiben, z. B. „Polizei hat zugesagt“"
          aria-label="Kommentar"
        />
        <button className="btn btn-primary btn-small" type="submit" disabled={!text.trim()}>
          Senden
        </button>
      </form>

      <label className="chip-toggle activity-filter">
        <input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} />
        Änderungen anzeigen
      </label>

      {entries === null ? (
        <p className="muted small">Lädt …</p>
      ) : visible.length === 0 ? (
        <p className="muted small">Noch keine Einträge.</p>
      ) : (
        <ul className="activity-list">
          {visible.slice(0, limit).map((e) =>
            e.type === 'comment' ? (
              <li key={e.id} className={`comment ${e.by === me ? 'comment-mine' : ''}`}>
                <div className="comment-meta">
                  <strong>{memberName(members, e.by) || e.by}</strong>
                  <span className="muted">{when(e.at)}</span>
                  {e.by === me &&
                    (confirmId === e.id ? (
                      <span className="comment-actions">
                        <button className="link-btn small" onClick={() => setConfirmId(null)}>
                          Abbrechen
                        </button>
                        <button
                          className="link-btn small btn-danger-text"
                          onClick={() => {
                            backend.deleteActivity(projectId, e.id);
                            setConfirmId(null);
                          }}
                        >
                          Löschen
                        </button>
                      </span>
                    ) : (
                      <button className="link-btn small comment-actions muted" onClick={() => setConfirmId(e.id)} aria-label="Kommentar löschen">
                        ×
                      </button>
                    ))}
                </div>
                <div className="comment-text">{e.text}</div>
              </li>
            ) : (
              <li key={e.id} className="event">
                <span className="muted">{when(e.at)}</span> {memberName(members, e.by) || e.by} {e.text}
              </li>
            ),
          )}
        </ul>
      )}
      {visible.length > limit && (
        <button className="link-btn" onClick={() => setLimit((l) => l + PAGE)}>
          Ältere Einträge anzeigen
        </button>
      )}
    </div>
  );
}
