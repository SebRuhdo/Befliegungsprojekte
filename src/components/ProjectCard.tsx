import { memberName, useApp } from '../AppContext';
import {
  STEPS,
  daysUntil,
  formatDate,
  initials,
  phaseOf,
  priorityMarks,
  statusOf,
  type Project,
} from '../model';

export function dateTone(iso: string | null | undefined, done: boolean): string {
  if (!iso || done) return '';
  const d = daysUntil(iso);
  if (d < 0) return 'tone-overdue';
  if (d <= 7) return 'tone-soon';
  return '';
}

export function ProjectCard({ project: p }: { project: Project }) {
  const { members, openProject } = useApp();
  const status = statusOf(p);
  const phase = phaseOf(p);
  const fertig = status === 'fertig';
  const currentAssignee = phase !== 'fertig' ? p.steps[phase].assignee : null;
  const ad = p.steps.aussendienst;

  return (
    <button className={`card ${p.archived ? 'card-archived' : ''}`} onClick={() => openProject(p.id)}>
      <div className="card-head">
        {p.priority > 0 && <span className="prio">{priorityMarks(p.priority)}</span>}
        <span className="number">{p.number}</span>
        {status === 'neu' && <span className="badge badge-neu">Neu</span>}
        {currentAssignee && (
          <span className="avatar" title={`Zuständig: ${memberName(members, currentAssignee)}`}>
            {initials(memberName(members, currentAssignee))}
          </span>
        )}
      </div>
      <div className="card-title">{p.name || 'Ohne Namen'}</div>

      <div className="progress" aria-label={`${STEPS.filter((s) => p.steps[s.key].done).length} von ${STEPS.length} Schritten erledigt`}>
        {STEPS.map((s) => (
          <span
            key={s.key}
            className={`seg ${p.steps[s.key].done ? 'seg-done' : ''} ${phase === s.key ? 'seg-current' : ''}`}
            title={s.label}
          />
        ))}
      </div>

      {(ad.date || p.deadline) && (
        <div className="card-meta">
          {ad.date && (
            <span className={`meta ${dateTone(ad.date, ad.done)} ${ad.done ? 'meta-done' : ''}`}>
              Außendienst {formatDate(ad.date)}
            </span>
          )}
          {p.deadline && (
            <span className={`meta ${dateTone(p.deadline, fertig)}`}>Abgabe {formatDate(p.deadline)}</span>
          )}
        </div>
      )}
    </button>
  );
}
