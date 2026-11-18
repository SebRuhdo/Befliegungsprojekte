import { emptySteps, normalizeProject, type ActivityEntry, type Member, type Project, type Settings } from '../model';
import type { AuthUser, Backend } from './types';

// Demo-Modus: alles bleibt im localStorage dieses Browsers. Kein Login, kein Abgleich.
const KEY = 'befliegungen-demo-v1';
const SETTINGS_KEY = 'befliegungen-demo-settings-v1';
const ACTIVITY_KEY = 'befliegungen-demo-activity-v1';

// Beispiel-Einstellungen nur für den Demo-Modus – in der echten App legt ihr eure eigenen an
const demoSettings: Settings = {
  templates: {
    vorbereitung: [
      { id: 'd1', text: 'Beispiel: Fluggebiet geprüft' },
      { id: 'd2', text: 'Beispiel: Akkus geladen' },
    ],
    aussendienst: [{ id: 'd3', text: 'Beispiel: Passpunkte eingemessen' }],
  },
  equipment: [
    { id: 'e1', name: 'Beispiel-Drohne A' },
    { id: 'e2', name: 'Beispiel-Sensor LiDAR' },
  ],
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* ignorieren */
  }
  return fallback;
}
function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignorieren */
  }
}
const ME = 'person.a@demo';

const members: Member[] = [
  { email: 'person.a@demo', name: 'Person A' },
  { email: 'person.b@demo', name: 'Person B' },
];

function seed(): Project[] {
  const now = Date.now();
  const base = (id: string, number: string, name: string): Project => ({
    id,
    number,
    name,
    priority: 0,
    kumoplanUrl: '',
    deadline: null,
    location: null,
    notes: '',
    equipment: [],
    steps: emptySteps(),
    archived: false,
    createdAt: now,
    createdBy: ME,
    updatedAt: now,
    updatedBy: ME,
  });

  // Beispiele angelehnt an den Screenshot aus den Erinnerungen
  const penzing = base('demo-1', '2026 023', 'Fliegerhorst Penzing');
  penzing.steps.vorbereitung.done = true;
  penzing.steps.genehmigung.done = true;
  penzing.steps.aussendienst = { done: true, date: '2026-02-27', assignee: 'person.a@demo' };
  penzing.steps.datensicherung.done = true;
  penzing.steps.stationierung.assignee = 'person.b@demo';

  const sempt = base('demo-2', '2026 168', 'Sempt-Flut-Kanal');
  sempt.steps.vorbereitung.done = true;
  sempt.steps.genehmigung.done = true;
  sempt.steps.aussendienst.assignee = 'person.a@demo';

  const test = base('demo-3', '2025 165', 'Test');
  test.priority = 3;
  test.deadline = '2026-01-05';
  for (const k of Object.keys(test.steps) as (keyof Project['steps'])[]) test.steps[k].done = true;

  const neu = base('demo-4', '2026 201', 'Beispiel – neu beauftragt');
  neu.priority = 1;

  return [penzing, sempt, test, neu];
}

function load(): Project[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw) as Project[];
      return list.map((p) => normalizeProject(p.id, p as unknown as Record<string, unknown>));
    }
  } catch {
    /* localStorage evtl. nicht verfügbar */
  }
  return seed();
}

/** Setzt einen Wert über einen Punkt-Pfad, z. B. "steps.abgabe.done" */
function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let cur = obj;
  for (const part of parts.slice(0, -1)) {
    if (typeof cur[part] !== 'object' || cur[part] === null) cur[part] = {};
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export function createDemoBackend(): Backend {
  let projects = load();
  const listeners = new Set<(p: Project[]) => void>();
  const emit = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(projects));
    } catch {
      /* ignorieren */
    }
    const copy = structuredClone(projects);
    listeners.forEach((l) => l(copy));
  };
  const user: AuthUser = { email: ME };

  let settings = loadJson<Settings>(SETTINGS_KEY, demoSettings);
  const settingsListeners = new Set<(s: Settings) => void>();
  let activity = loadJson<Record<string, ActivityEntry[]>>(ACTIVITY_KEY, {});
  const activityListeners = new Map<string, Set<(e: ActivityEntry[]) => void>>();
  const emitActivity = (projectId: string) => {
    saveJson(ACTIVITY_KEY, activity);
    const list = [...(activity[projectId] ?? [])].sort((a, b) => b.at - a.at);
    activityListeners.get(projectId)?.forEach((l) => l(list));
  };

  return {
    mode: 'demo',
    onAuth(cb) {
      cb(user);
      return () => {};
    },
    async signIn() {},
    async resetPassword() {},
    async signOut() {},

    subscribeProjects(cb) {
      listeners.add(cb);
      cb(structuredClone(projects));
      return () => listeners.delete(cb);
    },
    subscribeMembers(cb) {
      cb(members);
      return () => {};
    },
    subscribeSync(cb) {
      cb(false);
      return () => {};
    },

    createProject(data, by) {
      const id = `demo-${Date.now().toString(36)}`;
      const now = Date.now();
      projects = [
        ...projects,
        {
          id,
          ...data,
          location: null,
          notes: '',
          equipment: [],
          steps: emptySteps(),
          archived: false,
          createdAt: now,
          createdBy: by,
          updatedAt: now,
          updatedBy: by,
        },
      ];
      emit();
      return id;
    },
    updateProject(id, patch, by) {
      projects = projects.map((p) => {
        if (p.id !== id) return p;
        const next = structuredClone(p) as unknown as Record<string, unknown>;
        for (const [k, v] of Object.entries({ ...patch, updatedAt: Date.now(), updatedBy: by }))
          setPath(next, k, v);
        return next as unknown as Project;
      });
      emit();
    },
    deleteProject(id) {
      projects = projects.filter((p) => p.id !== id);
      delete activity[id];
      saveJson(ACTIVITY_KEY, activity);
      emit();
    },

    subscribeSettings(cb) {
      settingsListeners.add(cb);
      cb(settings);
      return () => settingsListeners.delete(cb);
    },
    saveSettings(patch) {
      settings = { ...settings, ...patch };
      saveJson(SETTINGS_KEY, settings);
      settingsListeners.forEach((l) => l(settings));
    },

    subscribeActivity(projectId, cb) {
      if (!activityListeners.has(projectId)) activityListeners.set(projectId, new Set());
      activityListeners.get(projectId)!.add(cb);
      cb([...(activity[projectId] ?? [])].sort((a, b) => b.at - a.at));
      return () => activityListeners.get(projectId)?.delete(cb);
    },
    addActivity(projectId, entry) {
      const e: ActivityEntry = { ...entry, id: `a-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, at: Date.now() };
      activity = { ...activity, [projectId]: [...(activity[projectId] ?? []), e] };
      emitActivity(projectId);
    },
    deleteActivity(projectId, entryId) {
      activity = { ...activity, [projectId]: (activity[projectId] ?? []).filter((e) => e.id !== entryId) };
      emitActivity(projectId);
    },
  };
}
