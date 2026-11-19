import type { ActivityEntry, Member, NewProject, Project, Settings } from '../model';

export interface AuthUser {
  email: string;
}

/** Gemeinsame Schnittstelle für Firebase und den lokalen Demo-Modus */
export interface Backend {
  mode: 'firebase' | 'demo';
  onAuth(cb: (user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;

  subscribeProjects(cb: (projects: Project[]) => void, onError: (e: Error) => void): () => void;
  subscribeMembers(cb: (members: Member[]) => void, onError: (e: Error) => void): () => void;
  /** Synchronitäts-Status (ausstehende Änderungen, die noch nicht beim Server sind) */
  subscribeSync(cb: (pendingWrites: boolean) => void): () => void;

  /** Legt ein Projekt an und gibt sofort die ID zurück (funktioniert auch offline) */
  createProject(data: NewProject, by: string): string;
  /** Feldweise Änderung, z. B. { 'steps.abgabe.done': true } – so überschreiben wir uns nicht gegenseitig */
  updateProject(id: string, patch: Record<string, unknown>, by: string): void;
  deleteProject(id: string): void;

  /** Gemeinsame Einstellungen: Checklisten-Vorlagen und Geräteliste */
  subscribeSettings(cb: (s: Settings) => void, onError: (e: Error) => void): () => void;
  saveSettings(patch: Partial<Settings>): void;

  /** Verlauf & Kommentare eines Projekts (neueste zuerst) */
  subscribeActivity(projectId: string, cb: (entries: ActivityEntry[]) => void, onError: (e: Error) => void): () => void;
  addActivity(projectId: string, entry: Omit<ActivityEntry, 'id' | 'at'>): void;
  deleteActivity(projectId: string, entryId: string): void;
}
