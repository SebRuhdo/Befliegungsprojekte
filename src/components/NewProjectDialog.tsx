import { useEffect, useRef, useState } from 'react';
import { useApp } from '../AppContext';
import { kumoplanUrlFromInput, type Priority } from '../model';

export function NewProjectDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { backend, me, projects } = useApp();
  const [number, setNumber] = useState(`${new Date().getFullYear()} `);
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<Priority>(0);
  const [deadline, setDeadline] = useState('');
  const [kumoplan, setKumoplan] = useState('');
  const numberRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = numberRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const duplicate = projects.some((p) => p.number.trim() && p.number.trim() === number.trim());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !number.trim()) return;
    const id = backend.createProject(
      { number: number.trim(), name: name.trim(), priority, deadline: deadline || null, kumoplanUrl: kumoplanUrlFromInput(kumoplan) },
      me,
    );
    onCreated(id);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet sheet-small" onSubmit={submit} onClick={(e) => e.stopPropagation()} aria-label="Neues Projekt">
        <div className="sheet-header">
          <button type="button" className="link-btn" onClick={onClose}>
            Abbrechen
          </button>
          <strong>Neues Projekt</strong>
          <button type="submit" className="link-btn strong">
            Anlegen
          </button>
        </div>
        <div className="sheet-body">
          <label className="field">
            <span className="field-label">Projektnummer</span>
            <input ref={numberRef} className="input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="2026 000" />
            {duplicate && <small className="tone-soon">Diese Nummer gibt es schon.</small>}
          </label>
          <label className="field">
            <span className="field-label">Projektname</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Sempt-Flut-Kanal" />
          </label>
          <div className="field">
            <span className="field-label">Priorität</span>
            <div className="segmented small">
              {([0, 1, 2, 3] as Priority[]).map((n) => (
                <button type="button" key={n} className={priority === n ? 'active' : ''} onClick={() => setPriority(n)}>
                  {n === 0 ? 'keine' : '!'.repeat(n)}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span className="field-label">Abgabefrist (optional)</span>
            <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Kumoplan-Karte (optional)</span>
            <input
              className="input"
              inputMode="numeric"
              value={kumoplan}
              onChange={(e) => setKumoplan(e.target.value)}
              placeholder="Nr. aus …/cards/3063 oder ganzer Link"
            />
          </label>
          <p className="muted small">Alle 7 Arbeitsschritte werden automatisch angelegt. Zuständigkeiten, Außendienst-Termin und Standort trägst du danach im Projekt ein.</p>
          <button type="submit" className="btn btn-primary wide">
            Projekt anlegen
          </button>
        </div>
      </form>
    </div>
  );
}
