import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../AppContext';
import {
  STATUS_LABEL,
  STEPS,
  phaseIndex,
  phaseOf,
  planMove,
  statusOf,
  statusTargetIndex,
  type Phase,
  type Project,
  type Status,
} from '../model';
import { ProjectCard } from './ProjectCard';
import { useCardDrag } from './useCardDrag';

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
  const { projects, me, update } = useApp();
  const [grouping, setGrouping] = useState<Grouping>(readGrouping);
  const [onlyMine, setOnlyMine] = useState(false);
  const [query, setQuery] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeCol, setActiveCol] = useState(0);
  const [toast, setToast] = useState<{ text: string; undo: () => void } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  // Karte auf eine Spalte gezogen: Schritte so abhaken/öffnen, dass das Projekt dort landet
  const handleDrop = (id: string, key: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    let target: number | null;
    let label: string;
    if (grouping === 'phase') {
      target = key === 'fertig' ? STEPS.length : STEPS.findIndex((s) => s.key === key);
      if (target < 0 || target === phaseIndex(phaseOf(p))) return;
      label = key === 'fertig' ? 'Fertig' : STEPS[target].label;
    } else {
      target = statusTargetIndex(p, key as Status);
      if (target === null) return;
      label = STATUS_LABEL[key as Status];
    }
    const plan = planMove(p, target, me);
    if (Object.keys(plan.patch).length === 0) return;
    update(id, plan.patch);
    const parts = [
      plan.checked.length ? `abgehakt: ${plan.checked.join(', ')}` : '',
      plan.unchecked.length ? `wieder offen: ${plan.unchecked.join(', ')}` : '',
    ].filter(Boolean);
    setToast({
      text: `${p.number} ${p.name} → ${label}. ${parts.join(' · ')}`,
      undo: () => update(id, plan.undo),
    });
  };

  const { drag, cardHandlers } = useCardDrag(handleDrop, boardRef);

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

  const columns: { key: string; title: string; short?: string; hint?: string; items: Project[] }[] =
    grouping === 'phase'
      ? [
          ...STEPS.map((s) => ({
            key: s.key as Phase,
            title: s.label,
            short: 'short' in s ? s.short : undefined,
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

      <nav className={`col-nav col-nav-${columns.length}`} aria-label="Zu Spalte springen">
        {columns.map((col, i) => (
          <button
            key={col.key}
            data-drop-key={col.key}
            className={`col-chip ${i === activeCol ? 'active' : ''} ${col.items.length === 0 ? 'col-chip-empty' : ''} ${
              drag?.over === col.key ? 'drop-over' : ''
            }`}
            onClick={() => jumpTo(i)}
          >
            <span className="col-chip-label">{col.short ?? col.title}</span>
            <span className="col-chip-count">{col.items.length}</span>
          </button>
        ))}
      </nav>

      <div className={`board ${drag ? 'board-dragging' : ''}`} ref={boardRef}>
        {columns.map((col) => (
          <section
            key={col.key}
            data-drop-key={col.key}
            className={`column column-${col.key} ${drag?.over === col.key ? 'drop-over' : ''}`}
          >
            <h2 className="column-title" title={col.hint}>
              <span>{col.title}</span>
              <span className="count">{col.items.length}</span>
            </h2>
            <div className="column-body">
              {sortProjects(col.items).map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  dragHandlers={cardHandlers(p.id, `${p.number} ${p.name}`.trim())}
                  isDragSource={drag?.id === p.id}
                />
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

      {drag && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {drag.title}
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          <button
            className="link-btn strong"
            onClick={() => {
              toast.undo();
              setToast(null);
            }}
          >
            Rückgängig
          </button>
        </div>
      )}
    </div>
  );
}
