import { useState } from 'react';
import { memberName, useApp } from '../AppContext';
import { addToCalendar } from '../ics';
import { daysUntil, equipmentConflicts, formatDate, statusOf, todayIso, type Member, type Project, type Settings } from '../model';
import { WeatherBox } from './WeatherBox';

interface Entry {
  key: string;
  project: Project;
  date: string;
  kind: 'Außendienst' | 'Abgabe';
  title: string;
  who: string;
  done: boolean;
  conflict: boolean;
}

const WEEKDAY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const VIEW_KEY = 'befliegungen-termine-view';

function weekday(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()];
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function buildEntries(projects: Project[], members: Member[], settings: Settings): Entry[] {
  const entries: Entry[] = [];
  for (const p of projects) {
    if (p.archived) continue;
    const title = `${p.number} ${p.name}`.trim();
    const ad = p.steps.aussendienst;
    if (ad.date)
      entries.push({
        key: `${p.id}-ad`,
        project: p,
        date: ad.date,
        kind: 'Außendienst',
        title,
        who: memberName(members, ad.assignee),
        done: ad.done,
        conflict: equipmentConflicts(p, projects, settings.equipment).length > 0,
      });
    if (p.deadline)
      entries.push({
        key: `${p.id}-ab`,
        project: p,
        date: p.deadline,
        kind: 'Abgabe',
        title,
        who: memberName(members, p.steps.abgabe.assignee),
        done: statusOf(p) === 'fertig',
        conflict: false,
      });
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
}

function EntryRow({ e, showWeather }: { e: Entry; showWeather: boolean }) {
  const { openProject } = useApp();
  const d = daysUntil(e.date);
  return (
    <li className={`termin ${e.done ? 'termin-done' : ''}`}>
      <button className="termin-main" onClick={() => openProject(e.project.id)}>
        <span className="termin-date">
          <strong>{formatDate(e.date, false)}</strong>
          <small>{weekday(e.date)}</small>
        </span>
        <span className="termin-text">
          <span className={`kind kind-${e.kind === 'Abgabe' ? 'abgabe' : 'ad'}`}>
            {e.kind}
            {e.done ? ' · erledigt' : ''}
            {e.conflict ? <span className="tone-soon"> · ⚠ Gerät doppelt</span> : null}
          </span>
          <span className="termin-title">{e.title}</span>
          <small className="muted">
            {d === 0 ? 'heute' : d === 1 ? 'morgen' : d < 0 ? `vor ${-d} Tagen` : `in ${d} Tagen`}
            {e.who ? ` · ${e.who}` : ''}
          </small>
          {showWeather && e.kind === 'Außendienst' && !e.done && (
            <WeatherBox compact location={e.project.location} date={e.date} />
          )}
        </span>
      </button>
      <button
        className="btn btn-small"
        onClick={() =>
          addToCalendar({
            uid: e.key,
            date: e.date,
            title: `${e.kind} ${e.title}`,
            location: e.project.location,
            url: e.project.kumoplanUrl || undefined,
          })
        }
      >
        In Kalender
      </button>
    </li>
  );
}

function ListView({ entries }: { entries: Entry[] }) {
  const open = entries.filter((e) => !e.done);
  const groups: { label: string; items: Entry[] }[] = [
    { label: 'Überfällig', items: open.filter((e) => daysUntil(e.date) < 0) },
    { label: 'Nächste 7 Tage', items: open.filter((e) => daysUntil(e.date) >= 0 && daysUntil(e.date) <= 7) },
    { label: 'Später', items: open.filter((e) => daysUntil(e.date) > 7) },
  ];
  if (open.length === 0)
    return <p className="muted">Keine offenen Termine. Außendienst-Datum und Abgabefrist werden im Projekt eingetragen.</p>;
  return (
    <>
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <section key={g.label}>
            <h2 className={`termine-group ${g.label === 'Überfällig' ? 'tone-overdue' : ''}`}>{g.label}</h2>
            <ul className="termine-list">
              {g.items.map((e) => (
                <EntryRow key={e.key} e={e} showWeather />
              ))}
            </ul>
          </section>
        ))}
    </>
  );
}

function MonthView({ entries }: { entries: Entry[] }) {
  const today = todayIso();
  const [ty, tm] = today.split('-').map(Number);
  const [year, setYear] = useState(ty);
  const [month, setMonth] = useState(tm - 1);
  const [selected, setSelected] = useState<string | null>(today);

  const byDay = new Map<string, Entry[]>();
  for (const e of entries) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);

  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Montag zuerst
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const shift = (n: number) => {
    const d = new Date(year, month + n, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(null);
  };

  const selectedEntries = selected ? byDay.get(selected) ?? [] : [];

  return (
    <div className="month">
      <div className="month-nav">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Vorheriger Monat">
          ‹
        </button>
        <h2>
          {MONTHS[month]} {year}
        </h2>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Nächster Monat">
          ›
        </button>
        <button
          className="btn btn-small"
          onClick={() => {
            setYear(ty);
            setMonth(tm - 1);
            setSelected(today);
          }}
        >
          Heute
        </button>
      </div>
      <div className="month-grid" role="grid">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => (
          <div key={w} className="month-wd">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`x${i}`} className="month-cell month-empty" />;
          const key = iso(year, month, d);
          const list = byDay.get(key) ?? [];
          return (
            <button
              key={key}
              className={`month-cell ${key === today ? 'month-today' : ''} ${key === selected ? 'month-selected' : ''} ${
                i % 7 >= 5 ? 'month-weekend' : ''
              }`}
              onClick={() => setSelected(key)}
              aria-label={`${d}. ${MONTHS[month]}: ${list.length} Termine`}
            >
              <span className="month-day">{d}</span>
              <span className="month-events">
                {list.map((e) => (
                  <span
                    key={e.key}
                    className={`month-ev ${e.kind === 'Abgabe' ? 'ev-abgabe' : 'ev-ad'} ${e.done ? 'ev-done' : ''} ${e.conflict ? 'ev-conflict' : ''}`}
                    title={`${e.kind}: ${e.title}`}
                  >
                    <span className="month-ev-text">{e.project.name || e.project.number}</span>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="month-legend muted small">
        <span>
          <i className="ev-ad" /> Außendienst
        </span>
        <span>
          <i className="ev-abgabe" /> Abgabe
        </span>
        <span>blass = erledigt · ⚠ = Gerät doppelt eingeplant</span>
      </div>

      {selected && (
        <section>
          <h2 className="termine-group">
            {weekday(selected)}, {formatDate(selected)}
          </h2>
          {selectedEntries.length === 0 ? (
            <p className="muted small">Keine Termine an diesem Tag.</p>
          ) : (
            <ul className="termine-list">
              {selectedEntries.map((e) => (
                <EntryRow key={e.key} e={e} showWeather />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export function Termine() {
  const { projects, members, settings } = useApp();
  const [view, setView] = useState<'liste' | 'monat'>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'monat' ? 'monat' : 'liste';
    } catch {
      return 'liste';
    }
  });
  const choose = (v: 'liste' | 'monat') => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignorieren */
    }
  };

  const entries = buildEntries(projects, members, settings);

  return (
    <div className="termine">
      <div className="segmented termine-switch" role="group" aria-label="Ansicht">
        <button className={view === 'liste' ? 'active' : ''} onClick={() => choose('liste')}>
          Liste
        </button>
        <button className={view === 'monat' ? 'active' : ''} onClick={() => choose('monat')}>
          Monat
        </button>
      </div>
      {view === 'liste' ? <ListView entries={entries} /> : <MonthView entries={entries} />}
    </div>
  );
}
