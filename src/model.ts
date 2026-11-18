// Datenmodell der Befliegungsprojekte
// short: Kurzform mit weichen Trennstellen (\u00AD) für die Spalten-Leiste auf dem Handy

export const STEPS = [
  { key: 'vorbereitung', label: 'Vorbereitung', short: 'Vor\u00ADberei\u00ADtung' },
  { key: 'genehmigung', label: 'Genehmigung/Polizei', short: 'Geneh\u00ADmigung' },
  { key: 'aussendienst', label: 'Außendienst', short: 'Außen\u00ADdienst', hasDate: true },
  { key: 'datensicherung', label: 'Datensicherung', short: 'Daten\u00ADsiche\u00ADrung' },
  {
    key: 'stationierung',
    label: 'Stationierung',
    short: 'Statio\u00ADnierung',
    hint: 'Punktwolke berechnen & referenzieren (LiDAR: Linien zusammenführen & klassifizieren · Photogrammetrie: Bündelblockausgleichung & Rekonstruktion)',
  },
  { key: 'auswertung', label: 'Auswertung', short: 'Aus\u00ADwertung' },
  { key: 'abgabe', label: 'Abgabe' },
] as const;

export type StepKey = (typeof STEPS)[number]['key'];

export interface StepState {
  done: boolean;
  doneAt?: number | null;
  doneBy?: string | null; // E-Mail des Mitglieds
  assignee?: string | null; // E-Mail des Mitglieds
  date?: string | null; // YYYY-MM-DD (nur Außendienst)
  checks?: Record<string, CheckState>; // Unterpunkte aus der Checklisten-Vorlage (Schlüssel = Vorlagen-ID)
}

export interface CheckState {
  done: boolean;
  by?: string | null;
  at?: number | null;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export type Priority = 0 | 1 | 2 | 3;

export interface Project {
  id: string;
  number: string; // z. B. "2026 168"
  name: string;
  priority: Priority;
  kumoplanUrl: string;
  deadline: string | null; // Abgabefrist YYYY-MM-DD
  location: GeoPoint | null;
  notes: string;
  equipment: string[]; // IDs aus der Geräteliste
  steps: Record<StepKey, StepState>;
  archived: boolean;
  createdAt: number;
  createdBy: string | null;
  updatedAt: number;
  updatedBy: string | null;
}

// ---------- Gemeinsame Einstellungen (Checklisten-Vorlagen, Geräte) ----------

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface Equipment {
  id: string;
  name: string;
}

export interface Settings {
  templates: Partial<Record<StepKey, ChecklistItem[]>>;
  equipment: Equipment[];
  windGustLimit?: number | null; // eigene Warnschwelle für Böen in m/s (leer = keine Warnung)
}

export const EMPTY_SETTINGS: Settings = { templates: {}, equipment: [], windGustLimit: null };

/**
 * Hinweis auf Doppelbelegung: andere (nicht archivierte) Projekte mit gleichem Außendienst-Tag
 * und mindestens einem gemeinsamen Gerät. Nur für heutige/zukünftige Termine.
 */
export function equipmentConflicts(p: Project, all: Project[], equipment: Equipment[]) {
  const date = p.steps.aussendienst.date;
  if (!date || p.equipment.length === 0 || daysUntil(date) < 0) return [];
  const names = new Map(equipment.map((e) => [e.id, e.name]));
  return all
    .filter((o) => o.id !== p.id && !o.archived && o.steps.aussendienst.date === date)
    .map((o) => ({
      project: o,
      shared: o.equipment.filter((id) => p.equipment.includes(id) && names.has(id)).map((id) => names.get(id)!),
    }))
    .filter((c) => c.shared.length > 0);
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- Verlauf & Kommentare ----------

export interface ActivityEntry {
  id: string;
  type: 'comment' | 'event';
  text: string;
  by: string; // E-Mail
  at: number;
}

export interface Member {
  email: string; // Dokument-ID (klein geschrieben)
  name: string;
}

export type Status = 'neu' | 'inBearbeitung' | 'fertig';

export const STATUS_LABEL: Record<Status, string> = {
  neu: 'Neu',
  inBearbeitung: 'In Bearbeitung',
  fertig: 'Fertig',
};

/** Neu = noch nichts abgehakt · Fertig = „Abgabe“ abgehakt · sonst In Bearbeitung */
export function statusOf(p: Project): Status {
  if (p.steps.abgabe?.done) return 'fertig';
  if (STEPS.some((s) => p.steps[s.key]?.done)) return 'inBearbeitung';
  return 'neu';
}

/** Aktuelle Phase = erster noch offener Schritt (oder "fertig") */
export type Phase = StepKey | 'fertig';

export function phaseOf(p: Project): Phase {
  if (p.steps.abgabe?.done) return 'fertig';
  const open = STEPS.find((s) => !p.steps[s.key]?.done);
  return open ? open.key : 'fertig';
}

export function stepLabel(key: StepKey): string {
  return STEPS.find((s) => s.key === key)!.label;
}

export function doneCount(p: Project): number {
  return STEPS.filter((s) => p.steps[s.key]?.done).length;
}

export function emptySteps(): Record<StepKey, StepState> {
  const steps = {} as Record<StepKey, StepState>;
  for (const s of STEPS) steps[s.key] = { done: false, assignee: null, date: null };
  return steps;
}

/** Fehlende Felder ergänzen, damit ältere/unvollständige Dokumente nicht stören */
export function normalizeProject(id: string, d: Record<string, unknown>): Project {
  const steps = emptySteps();
  const raw = (d.steps ?? {}) as Record<string, Partial<StepState>>;
  for (const s of STEPS) steps[s.key] = { ...steps[s.key], ...(raw[s.key] ?? {}) };
  return {
    id,
    number: String(d.number ?? ''),
    name: String(d.name ?? ''),
    priority: ([0, 1, 2, 3].includes(d.priority as number) ? d.priority : 0) as Priority,
    kumoplanUrl: String(d.kumoplanUrl ?? ''),
    deadline: (d.deadline as string) || null,
    location: (d.location as GeoPoint) ?? null,
    notes: String(d.notes ?? ''),
    equipment: Array.isArray(d.equipment) ? (d.equipment as unknown[]).map(String) : [],
    steps,
    archived: Boolean(d.archived),
    createdAt: Number(d.createdAt ?? 0),
    createdBy: (d.createdBy as string) ?? null,
    updatedAt: Number(d.updatedAt ?? 0),
    updatedBy: (d.updatedBy as string) ?? null,
  };
}

export type NewProject = Pick<Project, 'number' | 'name' | 'priority' | 'kumoplanUrl' | 'deadline'>;

// ---------- Datums-Helfer ----------

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const [ty, tm, td] = todayIso().split('-').map(Number);
  const today = new Date(ty, tm - 1, td).getTime();
  return Math.round((target - today) / 86400000);
}

export function formatDate(iso: string | null | undefined, withYear = true): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return withYear ? `${d}.${m}.${y.slice(2)}` : `${d}.${m}.`;
}

export function priorityMarks(p: Priority): string {
  return '!'.repeat(p);
}

// ---------- Verschieben per Drag & Drop ----------

/** Index der Zielspalte im Arbeitsschritt-Board: 0..6 = Schritt, 7 = Fertig */
export function phaseIndex(phase: Phase): number {
  return phase === 'fertig' ? STEPS.length : STEPS.findIndex((s) => s.key === phase);
}

/** Zielindex, wenn eine Karte im Status-Board auf eine Status-Spalte gezogen wird */
export function statusTargetIndex(p: Project, target: Status): number | null {
  const current = statusOf(p);
  if (current === target) return null;
  if (target === 'neu') return 0;
  if (target === 'fertig') return STEPS.length;
  // In Bearbeitung: von Neu → Vorbereitung erledigt, von Fertig → nur Abgabe wieder offen
  return current === 'neu' ? 1 : STEPS.length - 1;
}

export interface MovePlan {
  patch: Record<string, unknown>;
  undo: Record<string, unknown>;
  checked: string[]; // neu abgehakte Schritte
  unchecked: string[]; // wieder geöffnete Schritte
}

/**
 * Alle Schritte vor dem Ziel werden abgehakt, alle ab dem Ziel geöffnet –
 * so landet das Projekt genau in der Zielspalte. Unveränderte Schritte bleiben unangetastet.
 */
export function planMove(p: Project, targetIndex: number, by: string): MovePlan {
  const plan: MovePlan = { patch: {}, undo: {}, checked: [], unchecked: [] };
  const now = Date.now();
  STEPS.forEach((s, i) => {
    const st = p.steps[s.key];
    const shouldBeDone = i < targetIndex;
    if (st.done === shouldBeDone) return;
    const base = `steps.${s.key}`;
    plan.patch[`${base}.done`] = shouldBeDone;
    plan.patch[`${base}.doneAt`] = shouldBeDone ? now : null;
    plan.patch[`${base}.doneBy`] = shouldBeDone ? by : null;
    plan.undo[`${base}.done`] = st.done;
    plan.undo[`${base}.doneAt`] = st.doneAt ?? null;
    plan.undo[`${base}.doneBy`] = st.doneBy ?? null;
    (shouldBeDone ? plan.checked : plan.unchecked).push(s.label);
  });
  return plan;
}

// ---------- Kumoplan ----------

export const KUMOPLAN_BASE = 'https://geoplus.kumoplan.de/cards/';

/** Nummer der Kumoplan-Karte aus gespeichertem Link (oder leer) */
export function kumoplanId(url: string): string {
  return url.match(/\/cards\/(\d+)/)?.[1] ?? '';
}

/**
 * Eingabe → zu speichernder Link. Akzeptiert die Kartennummer („3063“)
 * oder einen eingefügten Link („https://geoplus.kumoplan.de/cards/3063“).
 */
export function kumoplanUrlFromInput(input: string): string {
  const v = input.trim();
  if (!v) return '';
  if (/^\d+$/.test(v)) return KUMOPLAN_BASE + v;
  const id = kumoplanId(v);
  if (id) return KUMOPLAN_BASE + id;
  return /^https?:\/\//.test(v) ? v : '';
}

/** Anzeige im Eingabefeld: Kartennummer, sonst der Link selbst */
export function kumoplanDisplay(url: string): string {
  return kumoplanId(url) || url;
}
