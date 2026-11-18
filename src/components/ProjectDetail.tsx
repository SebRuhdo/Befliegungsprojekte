import { useEffect, useRef, useState } from 'react';
import { memberName, useApp } from '../AppContext';
import { addToCalendar } from '../ics';
import {
  STATUS_LABEL,
  STEPS,
  stepLabel,
  doneCount,
  equipmentConflicts,
  formatDate,
  kumoplanDisplay,
  kumoplanUrlFromInput,
  statusOf,
  type Priority,
  type Project,
  type StepKey,
} from '../model';
import { ActivityFeed } from './ActivityFeed';
import { LocationPicker } from './LocationPicker';
import { WeatherBox } from './WeatherBox';
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
  inputMode?: 'numeric' | 'text';
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
  const { update, members, me, backend, settings, projects, log, openProject } = useApp();
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

  const toggleStep = (key: StepKey, done: boolean) => {
    set({
      [`steps.${key}.done`]: done,
      [`steps.${key}.doneAt`]: done ? Date.now() : null,
      [`steps.${key}.doneBy`]: done ? me : null,
    });
    log(p.id, `hat „${stepLabel(key)}“ ${done ? 'abgehakt' : 'wieder geöffnet'}`);
  };

  const toggleCheck = (key: StepKey, itemId: string, done: boolean) =>
    set({ [`steps.${key}.checks.${itemId}`]: { done, by: done ? me : null, at: done ? Date.now() : null } });

  const toggleEquipment = (id: string) => {
    const has = p.equipment.includes(id);
    set({ equipment: has ? p.equipment.filter((x) => x !== id) : [...p.equipment, id] });
  };

  const conflicts = equipmentConflicts(p, projects, settings.equipment);

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
                onChange={(e) => {
                  const v = e.target.value || null;
                  set({ deadline: v });
                  log(p.id, v ? `hat die Abgabefrist auf ${formatDate(v)} gesetzt` : 'hat die Abgabefrist entfernt');
                }}
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
              <span className="input-prefix muted small">cards/</span>
              <EditableText
                className="input kumoplan-input"
                value={kumoplanDisplay(p.kumoplanUrl)}
                onCommit={(v) => set({ kumoplanUrl: kumoplanUrlFromInput(v) })}
                placeholder="Nr., z. B. 3063"
                inputMode="numeric"
                aria-label="Kumoplan-Kartennummer oder Link"
              />
              {/^https?:\/\//.test(p.kumoplanUrl) && (
                <a className="btn btn-small" href={p.kumoplanUrl} target="_blank" rel="noreferrer">
                  Öffnen
                </a>
              )}
            </div>
          </div>

          <div className="field-row field-row-top">
            <span className="field-label">Geräte</span>
            <div className="equipment-chips">
              {settings.equipment.length === 0 && <span className="muted small">Noch keine Geräte angelegt (⚙ Einstellungen).</span>}
              {settings.equipment.map((eq) => (
                <button
                  key={eq.id}
                  className={`eq-chip ${p.equipment.includes(eq.id) ? 'active' : ''}`}
                  onClick={() => toggleEquipment(eq.id)}
                  aria-pressed={p.equipment.includes(eq.id)}
                >
                  {eq.name}
                </button>
              ))}
            </div>
          </div>
          {conflicts.length > 0 && (
            <div className="conflict-note" role="note">
              <strong>Hinweis Geräte:</strong> Am {formatDate(p.steps.aussendienst.date)} ebenfalls eingeplant bei{' '}
              {conflicts.map((c, i) => (
                <span key={c.project.id}>
                  {i > 0 && ', '}
                  <button className="link-btn" onClick={() => openProject(c.project.id)}>
                    {`${c.project.number} ${c.project.name}`.trim()}
                  </button>{' '}
                  ({c.shared.join(', ')})
                </span>
              ))}
            </div>
          )}

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
                      {(settings.templates[s.key]?.length ?? 0) > 0 && (
                        <small className="step-hint">
                          Unterpunkte {settings.templates[s.key]!.filter((it) => st.checks?.[it.id]?.done).length}/
                          {settings.templates[s.key]!.length}
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
                          onChange={(e) => {
                            const v = e.target.value || null;
                            set({ [`steps.${s.key}.date`]: v });
                            log(p.id, v ? `hat den Außendienst auf ${formatDate(v)} gelegt` : 'hat das Außendienst-Datum entfernt');
                          }}
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
                  {(settings.templates[s.key]?.length ?? 0) > 0 && (
                    <ul className="subchecks">
                      {settings.templates[s.key]!.map((it) => {
                        const c = st.checks?.[it.id];
                        return (
                          <li key={it.id}>
                            <label className={c?.done ? 'subcheck-done' : ''}>
                              <input type="checkbox" checked={!!c?.done} onChange={(e) => toggleCheck(s.key, it.id, e.target.checked)} />
                              <span>{it.text}</span>
                              {c?.done && c.by && <small className="muted">{memberName(members, c.by)}</small>}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {'hasDate' in s && !st.done && (
                    <div className="step-weather">
                      <WeatherBox location={p.location} date={st.date} />
                    </div>
                  )}
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

          <h3 className="section-title">Kommentare & Verlauf</h3>
          <ActivityFeed projectId={p.id} />

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
