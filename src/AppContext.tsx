import { createContext, useContext } from 'react';
import type { Backend } from './data/types';
import type { Member, Project, Settings } from './model';

export interface AppCtx {
  backend: Backend;
  me: string; // E-Mail des angemeldeten Mitglieds
  members: Member[];
  projects: Project[];
  settings: Settings;
  update: (id: string, patch: Record<string, unknown>) => void;
  /** Eintrag im Verlauf des Projekts (z. B. „hat Außendienst abgehakt“) */
  log: (projectId: string, text: string) => void;
  openProject: (id: string) => void;
}

export const AppContext = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppContext fehlt');
  return ctx;
}

export function memberName(members: Member[], email: string | null | undefined): string {
  if (!email) return '';
  return members.find((m) => m.email === email)?.name ?? email;
}
