import { useEffect, useRef, useState } from 'react';
import { memberName, useApp } from '../AppContext';
import { addToCalendar } from '../ics';
import {
  STATUS_LABEL,
  STEPS,
  doneCount,
  statusOf,
  type Priority,
  type Project,
  type StepKey,
} from '../model';
import { LocationPicker } from './LocationPicker';
import { dateTone } from './ProjectCard';

/** Textfeld, das erst beim Verlassen speichert und Änderungen der Kollegin übernimmt, solange man nicht tippt */
function EditableText({
  value,
  onCommit,
  multiline,
  ...rest
}: {
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  type?: string;
  'aria-label'?: string;
}) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);
  const commit = () => {
    focused.current = false;
    if (local !== value) onCommit(local);
  };
  const common = {
    ...rest,
    value: local,
    onFocus: () => (focused.current = true),
    onBlur: commit,
  };
  return multiline ? (
    <textarea {...common} rows={4} onChange={(e) => setLocal(e.target.value)} />
  ) : (
    <input
      {...common}
      onChange={(e) => setLocal(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

export function ProjectDetail({ project: p, onClose }: { project: Project; onClose: () => void }) {
  const { update, members, me, backend } = useApp();
  const status = statusOf(p);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Record<string, unknown>) => update(p.id, patch);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  const toggleStep = (key: StepKey, done: boolean) =>
    set({
      [`steps.${key}.done`]: done,
      [`steps.${key}.doneAt`]: done ? Date.now() : null,
      [`steps.${key}.doneBy`]: done ? me : null,
    });

  const title = `${p.number} ${p.name}`.trim();

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="link-btn" onClick={onClose}>
            ‹ Zurück
          </button>
          <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
        </div>

        <div className="sheet-body">
          <div className="title-fields">
            <EditableText
              className="input number-input"
              value={p.number}
              onCommit={(v) => set({ number: v.trim() })}
              placeholder="2026 000"
              aria-label="Projektnummer"
            />
            <EditableText
              className="input name-input"
              value={p.name}
              onCommit={(v) => set({ name: v.trim() })}
              placeholder="Projektname"
              aria-label="Projektname"
            />
          </div>

          <div className="field-row">
            <span className="field-label">Priorität</span>
            <div className="segmented small">
              {([0, 1, 2, 3] as Priority[]).map((n) => (
                <button key={n} className={p.priority === n ? 'active' : ''} onClick={() => set({ priority: n })}>
                  {n === 0 ? 'keine' : '!'.repeat(n)}
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <span className="field-label">Abgabefrist</span>
            <div className="date-group">
              <input
                type="date"
                className={`input ${dateTone(p.deadline, status === 'fertig')}`}
                value={p.deadline ?? ''}
                onChange={(e) => set({ deadline: e.target.value || null })}
              />
              {p.deadline && (
                <button
                  className="btn btn-small"
                  onClick={() =>
                    addToCalendar({
                      uid: `${p.id}-abgabe`,
                      date: p.deadline!,
                      title: `Abgabe ${title}`,
                      location: p.location,
                      url: p.kumoplanUrl || undefined,
                    })
                  }
                >
                  In Kalender
                </button>
              )}
            </div>
          </div>

          <div className="field-row">
            <span className="field-label">Kumoplan</span>
            <div className="date-group">
              <EditableText
                className="input"
                type="url"
                value={p.kumoplanUrl}
                onCommit={(v) => set({ kumoplanUrl: v.trim() })}
                placeholder="Link zum Kumoplan-Projekt einfügen"
                aria-label="Kumoplan-Link"
              />
              {/^https?:\/\//.test(p.kumoplanUrl) && (
                <a className="btn btn-small" href={p.kumoplanUrl} target="_blank" rel="noreferrer">
                  Öffnen
                </a>
              )}
            </div>
          </div>

          <h3 className="section-title">
            Arbeitsschritte <span className="muted">{doneCount(p)}/{STEPS.length}</span>
          </h3>
          <ul className="steps">
            {STEPS.map((s) => {
              const st = p.steps[s.key];
              return (
                <li key={s.key} className={`step ${st.done ? 'step-done' : ''}`}>
                  <label className="step-check">
                    <input type="checkbox" checked={st.done} onChange={(e) => toggleStep(s.key, e.target.checked)} />
                    <span className="checkmark" aria-hidden />
                    <span className="step-label">
                      {s.label}
                      {'hint' in s && <small className="step-hint">{s.hint}</small>}
                      {st.done && st.doneBy && (
                        <small className="step-hint">
                          erledigt von {memberName(members, st.doneBy)}
                          {st.doneAt ? ` am ${new Date(st.doneAt).toLocaleDateString('de-DE')}` : ''}
                        </small>
                      )}
                    </span>
                  </label>
                  <div className="step-extra">
                    {'hasDate' in s && (
                      <div className="date-group">
                        <input
                          type="date"
                          className={`input input-small ${dateTone(st.date, st.done)}`}
                          value={st.date ?? ''}
                          onChange={(e) => set({ [`steps.${s.key}.date`]: e.target.value || null })}
                          aria-label="Datum Außendienst"
                        />
                        {st.date && (
                          <button
                            className="btn btn-small"
                            onClick={() =>
                              addToCalendar({
                                uid: `${p.id}-aussendienst`,
                                date: st.date!,
                                title: `Außendienst ${title}`,
                                description: st.assignee ? `Zuständig: ${memberName(members, st.assignee)}` : undefined,
                                location: p.location,
                                url: p.kumoplanUrl || undefined,
                              })
                            }
                          >
                            In Kalender
                          </button>
                        )}
                      </div>
                    )}
                    <select
                      className="input input-small assignee"
                      value={st.assignee ?? ''}
                      onChange={(e) => set({ [`steps.${s.key}.assignee`]: e.target.value || null })}
                      aria-label={`Zuständig für ${s.label}`}
                    >
                      <option value="">– niemand –</option>
                      {members.map((m) => (
                        <option key={m.email} value={m.email}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>

          <h3 className="section-title">Standort</h3>
          <LocationPicker value={p.location} onChange={(loc) => set({ location: loc })} />

          <h3 className="section-title">Notizen</h3>
          <EditableText
            multiline
            className="input notes"
            value={p.notes}
            onCommit={(v) => set({ notes: v })}
            placeholder="Notizen, Links zu Daten (NAS, OneDrive …)"
            aria-label="Notizen"
          />

          <div className="danger-zone">
            {status === 'fertig' && (
              <button className="btn" onClick={() => set({ archived: !p.archived })}>
                {p.archived ? 'Aus Archiv holen' : 'Archivieren'}
              </button>
            )}
            {confirmDelete ? (
              <>
                <button className="btn" onClick={() => setConfirmDelete(false)}>
                  Abbrechen
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    backend.deleteProject(p.id);
                    onClose();
                  }}
                >
                  Endgültig löschen
                </button>
              </>
            ) : (
              <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                Löschen
              </button>
            )}
          </div>
          <p className="muted small">
            Zuletzt geändert {p.updatedAt ? new Date(p.updatedAt).toLocaleString('de-DE') : '–'}
            {p.updatedBy ? ` von ${memberName(members, p.updatedBy)}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
