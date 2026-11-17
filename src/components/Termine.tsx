import { memberName, useApp } from '../AppContext';
import { addToCalendar } from '../ics';
import { daysUntil, formatDate, statusOf } from '../model';

interface Entry {
  key: string;
  projectId: string;
  date: string;
  kind: 'Außendienst' | 'Abgabe';
  title: string;
  who: string;
  location: { lat: number; lng: number } | null;
  url: string;
}

const WEEKDAY = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function weekday(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()];
}

export function Termine() {
  const { projects, members, openProject } = useApp();

  const entries: Entry[] = [];
  for (const p of projects) {
    if (p.archived) continue;
    const title = `${p.number} ${p.name}`.trim();
    const ad = p.steps.aussendienst;
    if (ad.date && !ad.done)
      entries.push({
        key: `${p.id}-ad`,
        projectId: p.id,
        date: ad.date,
        kind: 'Außendienst',
        title,
        who: memberName(members, ad.assignee),
        location: p.location,
        url: p.kumoplanUrl,
      });
    if (p.deadline && statusOf(p) !== 'fertig')
      entries.push({
        key: `${p.id}-ab`,
        projectId: p.id,
        date: p.deadline,
        kind: 'Abgabe',
        title,
        who: memberName(members, p.steps.abgabe.assignee),
        location: p.location,
        url: p.kumoplanUrl,
      });
  }
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));

  const groups: { label: string; items: Entry[] }[] = [
    { label: 'Überfällig', items: entries.filter((e) => daysUntil(e.date) < 0) },
    { label: 'Nächste 7 Tage', items: entries.filter((e) => daysUntil(e.date) >= 0 && daysUntil(e.date) <= 7) },
    { label: 'Später', items: entries.filter((e) => daysUntil(e.date) > 7) },
  ];

  if (entries.length === 0)
    return (
      <div className="termine">
        <p className="muted">Keine offenen Termine. Außendienst-Datum und Abgabefrist werden im Projekt eingetragen.</p>
      </div>
    );

  return (
    <div className="termine">
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <section key={g.label}>
            <h2 className={`termine-group ${g.label === 'Überfällig' ? 'tone-overdue' : ''}`}>{g.label}</h2>
            <ul className="termine-list">
              {g.items.map((e) => {
                const d = daysUntil(e.date);
                return (
                  <li key={e.key} className="termin">
                    <button className="termin-main" onClick={() => openProject(e.projectId)}>
                      <span className="termin-date">
                        <strong>{formatDate(e.date, false)}</strong>
                        <small>{weekday(e.date)}</small>
                      </span>
                      <span className="termin-text">
                        <span className={`kind kind-${e.kind === 'Abgabe' ? 'abgabe' : 'ad'}`}>{e.kind}</span>
                        <span className="termin-title">{e.title}</span>
                        <small className="muted">
                          {d === 0 ? 'heute' : d === 1 ? 'morgen' : d < 0 ? `seit ${-d} Tagen` : `in ${d} Tagen`}
                          {e.who ? ` · ${e.who}` : ''}
                        </small>
                      </span>
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() =>
                        addToCalendar({
                          uid: e.key,
                          date: e.date,
                          title: `${e.kind} ${e.title}`,
                          location: e.location,
                          url: e.url || undefined,
                        })
                      }
                    >
                      In Kalender
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </div>
  );
}
