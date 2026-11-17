import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../AppContext';
import {
  STATUS_LABEL,
  STEPS,
  phaseOf,
  statusOf,
  type Phase,
  type Project,
  type Status,
} from '../model';
import { ProjectCard } from './ProjectCard';

type Grouping = 'phase' | 'status';

const GROUP_KEY = 'befliegungen-grouping';

function readGrouping(): Grouping {
  try {
    return localStorage.getItem(GROUP_KEY) === 'status' ? 'status' : 'phase';
  } catch {
    return 'phase';
  }
}

/** Nächstes relevantes Datum (Abgabefrist oder offener Außendienst) – für die Sortierung */
function nextDate(p: Project): string {
  const dates = [p.deadline, !p.steps.aussendienst.done ? p.steps.aussendienst.date : null].filter(
    Boolean,
  ) as string[];
  return dates.sort()[0] ?? '9999-99-99';
}

function sortProjects(list: Project[]): Project[] {
  return [...list].sort(
    (a, b) =>
      b.priority - a.priority ||
      nextDate(a).localeCompare(nextDate(b)) ||
      a.number.localeCompare(b.number, 'de', { numeric: true }),
  );
}

export function Board() {
  const { projects, me } = useApp();
  const [grouping, setGrouping] = useState<Grouping>(readGrouping);
  const [onlyMine, setOnlyMine] = useState(false);
  const [query, setQuery] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeCol, setActiveCol] = useState(0);

  // Aktive Spalte für die Sprungleiste (Handy) mitführen
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onScroll = () => {
      const first = el.querySelector<HTMLElement>('.column');
      if (!first) return;
      setActiveCol(Math.round(el.scrollLeft / (first.offsetWidth + 12)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const jumpTo = (i: number) => {
    const el = boardRef.current;
    const col = el?.querySelectorAll<HTMLElement>('.column')[i];
    if (el && col) el.scrollTo({ left: col.offsetLeft - 16, behavior: 'smooth' });
  };

  const setGroupingPersist = (g: Grouping) => {
    setGrouping(g);
    try {
      localStorage.setItem(GROUP_KEY, g);
    } catch {
      /* ignorieren */
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !`${p.number} ${p.name}`.toLowerCase().includes(q)) return false;
      if (onlyMine && !STEPS.some((s) => !p.steps[s.key].done && p.steps[s.key].assignee === me))
        return false;
      return true;
    });
  }, [projects, query, onlyMine, me]);

  const archivedCount = filtered.filter((p) => p.archived).length;
  const visible = filtered.filter((p) => showArchive || !p.archived);

  const columns: { key: string; title: string; hint?: string; items: Project[] }[] =
    grouping === 'phase'
      ? [
          ...STEPS.map((s) => ({
            key: s.key as Phase,
            title: s.label,
            hint: 'hint' in s ? s.hint : undefined,
            items: [] as Project[],
          })),
          { key: 'fertig', title: 'Fertig', hint: undefined, items: [] as Project[] },
        ]
      : (['neu', 'inBearbeitung', 'fertig'] as Status[]).map((s) => ({
          key: s,
          title: STATUS_LABEL[s],
          hint: undefined,
          items: [] as Project[],
        }));

  for (const p of visible) {
    const key = grouping === 'phase' ? phaseOf(p) : statusOf(p);
    columns.find((c) => c.key === key)?.items.push(p);
  }

  return (
    <div className="board-wrap">
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Spalten">
          <button className={grouping === 'phase' ? 'active' : ''} onClick={() => setGroupingPersist('phase')}>
            Arbeitsschritte
          </button>
          <button className={grouping === 'status' ? 'active' : ''} onClick={() => setGroupingPersist('status')}>
            Status
          </button>
        </div>
        <label className="chip-toggle">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
          Nur meine
        </label>
        <input
          className="search"
          type="search"
          placeholder="Suchen …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <nav className="col-nav" aria-label="Zu Spalte springen">
        {columns.map((col, i) => (
          <button
            key={col.key}
            className={`col-chip ${i === activeCol ? 'active' : ''} ${col.items.length === 0 ? 'col-chip-empty' : ''}`}
            onClick={() => jumpTo(i)}
          >
            {col.title} <span className="count">{col.items.length}</span>
          </button>
        ))}
      </nav>

      <div className="board" ref={boardRef}>
        {columns.map((col) => (
          <section key={col.key} className={`column column-${col.key}`}>
            <h2 className="column-title" title={col.hint}>
              <span>{col.title}</span>
              <span className="count">{col.items.length}</span>
            </h2>
            <div className="column-body">
              {sortProjects(col.items).map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
              {col.items.length === 0 && <div className="empty">–</div>}
              {col.key === 'fertig' && archivedCount > 0 && (
                <button className="link-btn archive-toggle" onClick={() => setShowArchive((v) => !v)}>
                  {showArchive ? 'Archiv ausblenden' : `Archiv anzeigen (${archivedCount})`}
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
