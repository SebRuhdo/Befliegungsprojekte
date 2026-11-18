import { useEffect, useState } from 'react';
import { useApp } from '../AppContext';
import { STEPS, newId, type ChecklistItem, type Equipment, type StepKey } from '../model';

/** Bearbeitbare Liste (Text-Einträge) mit Hinzufügen, Umbenennen, Verschieben, Entfernen */
function EditableList<T extends { id: string }>({
  items,
  getText,
  makeItem,
  setText,
  onChange,
  placeholder,
  addLabel,
}: {
  items: T[];
  getText: (i: T) => string;
  makeItem: (text: string) => T;
  setText: (i: T, text: string) => T;
  onChange: (items: T[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  const [draft, setDraft] = useState('');
  const [local, setLocal] = useState(items);
  useEffect(() => setLocal(items), [items]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    onChange([...items, makeItem(t)]);
    setDraft('');
  };
  const move = (i: number, dir: -1 | 1) => {
    const next = [...items];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="edit-list">
      {local.length > 0 && (
        <ul>
          {local.map((it, i) => (
            <li key={it.id}>
              <input
                className="input input-small"
                value={getText(it)}
                onChange={(e) => setLocal(local.map((x) => (x.id === it.id ? setText(x, e.target.value) : x)))}
                onBlur={() => {
                  const t = getText(local[i]).trim();
                  if (t && t !== getText(items[i])) onChange(items.map((x) => (x.id === it.id ? setText(x, t) : x)));
                }}
                aria-label="Eintrag bearbeiten"
              />
              <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben">
                ↑
              </button>
              <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === local.length - 1} aria-label="Nach unten">
                ↓
              </button>
              <button className="icon-btn btn-danger-text" onClick={() => onChange(items.filter((x) => x.id !== it.id))} aria-label="Entfernen">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="edit-list-add" onSubmit={add}>
        <input className="input input-small" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
        <button className="btn btn-small" type="submit" disabled={!draft.trim()}>
          {addLabel}
        </button>
      </form>
    </div>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { settings, backend } = useApp();
  const [limitDraft, setLimitDraft] = useState(settings.windGustLimit != null ? String(settings.windGustLimit) : '');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const saveTemplate = (key: StepKey, items: ChecklistItem[]) =>
    backend.saveSettings({ templates: { ...settings.templates, [key]: items } });
  const saveEquipment = (items: Equipment[]) => backend.saveSettings({ equipment: items });

  const commitLimit = () => {
    const v = limitDraft.trim().replace(',', '.');
    const n = v === '' ? null : Number(v);
    if (n !== null && (!Number.isFinite(n) || n <= 0)) return setLimitDraft(settings.windGustLimit != null ? String(settings.windGustLimit) : '');
    if (n !== (settings.windGustLimit ?? null)) backend.saveSettings({ windGustLimit: n });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Einstellungen" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button className="link-btn" onClick={onClose}>
            ‹ Zurück
          </button>
          <strong>Einstellungen</strong>
          <span />
        </div>
        <div className="sheet-body">
          <p className="muted small">Diese Einstellungen gelten für alle – Änderungen sehen alle Mitglieder sofort.</p>

          <h3 className="section-title">Geräte & Drohnen</h3>
          <p className="muted small">Im Projekt auswählbar. Die App weist darauf hin, wenn ein Gerät am selben Außendienst-Tag mehrfach eingeplant ist.</p>
          <EditableList<Equipment>
            items={settings.equipment}
            getText={(i) => i.name}
            setText={(i, name) => ({ ...i, name })}
            makeItem={(name) => ({ id: newId(), name })}
            onChange={saveEquipment}
            placeholder="z. B. Drohne, Sensor, GNSS-Empfänger"
            addLabel="Hinzufügen"
          />

          <h3 className="section-title">Wind-Warnschwelle</h3>
          <div className="field-row">
            <label className="field-label" htmlFor="gust-limit">
              Böen ab (m/s) rot markieren
            </label>
            <input
              id="gust-limit"
              className="input input-small gust-input"
              inputMode="decimal"
              value={limitDraft}
              onChange={(e) => setLimitDraft(e.target.value)}
              onBlur={commitLimit}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="leer = aus"
            />
          </div>

          <h3 className="section-title">Checklisten-Vorlagen</h3>
          <p className="muted small">Unterpunkte je Arbeitsschritt. Sie erscheinen in jedem Projekt und lassen sich dort abhaken.</p>
          {STEPS.map((s) => (
            <section key={s.key} className="template-step">
              <h4>{s.label}</h4>
              <EditableList<ChecklistItem>
                items={settings.templates[s.key] ?? []}
                getText={(i) => i.text}
                setText={(i, text) => ({ ...i, text })}
                makeItem={(text) => ({ id: newId(), text })}
                onChange={(items) => saveTemplate(s.key, items)}
                placeholder="Neuer Unterpunkt"
                addLabel="Hinzufügen"
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
