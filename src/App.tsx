import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppContext, type AppCtx } from './AppContext';
import { Board } from './components/Board';
import { Login } from './components/Login';
import { MapView } from './components/MapView';
import { NewProjectDialog } from './components/NewProjectDialog';
import { ProjectDetail } from './components/ProjectDetail';
import { Termine } from './components/Termine';
import type { AuthUser, Backend } from './data/types';
import type { Member, Project } from './model';

type View = 'board' | 'termine' | 'karte';

const VIEW_KEY = 'befliegungen-view';

function readView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === 'board' || v === 'termine' || v === 'karte') return v;
  } catch {
    /* ignorieren */
  }
  return 'board';
}

export function App({ backend }: { backend: Backend }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => backend.onAuth(setUser), [backend]);

  if (user === undefined) return <div className="splash">Lädt …</div>;
  if (user === null) return <Login backend={backend} />;
  return <Main backend={backend} user={user} />;
}

function Main({ backend, user }: { backend: Backend; user: AuthUser }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [view, setView] = useState<View>(readView);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const onErr = (e: Error) =>
      setError(
        /permission/i.test(e.message)
          ? `Kein Zugriff: ${user.email} ist (noch) nicht als Mitglied eingetragen.`
          : `Fehler beim Laden: ${e.message}`,
      );
    const u1 = backend.subscribeProjects(setProjects, onErr);
    const u2 = backend.subscribeMembers(setMembers, onErr);
    const u3 = backend.subscribeSync(setPending);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [backend, user.email]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* ignorieren */
    }
  }, [view]);

  const update = useCallback(
    (id: string, patch: Record<string, unknown>) => backend.updateProject(id, patch, user.email),
    [backend, user.email],
  );

  const ctx: AppCtx | null = useMemo(
    () =>
      projects && {
        backend,
        me: user.email,
        members,
        projects,
        update,
        openProject: setOpenId,
      },
    [backend, user.email, members, projects, update],
  );

  if (error) {
    return (
      <div className="splash">
        <p>{error}</p>
        <button className="btn" onClick={() => backend.signOut()}>
          Abmelden
        </button>
      </div>
    );
  }
  if (!ctx) return <div className="splash">Projekte werden geladen …</div>;

  const openProject = openId ? ctx.projects.find((p) => p.id === openId) : undefined;

  return (
    <AppContext.Provider value={ctx}>
      <div className="app">
        <header className="topbar">
          <div className="topbar-row">
            <h1>Befliegungen</h1>
            <SyncBadge online={online} pending={pending} demo={backend.mode === 'demo'} />
            <button className="btn btn-primary add-btn" onClick={() => setCreating(true)} aria-label="Neues Projekt">
              <span aria-hidden>＋</span> <span className="add-label">Projekt</span>
            </button>
          </div>
          <nav className="tabs" role="tablist">
            {(
              [
                ['board', 'Board'],
                ['termine', 'Termine'],
                ['karte', 'Karte'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                className={view === v ? 'tab active' : 'tab'}
                onClick={() => setView(v)}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <main className={`content content-${view}`}>
          {view === 'board' && <Board />}
          {view === 'termine' && <Termine />}
          {view === 'karte' && <MapView />}
        </main>

        <footer className="footer">
          {backend.mode === 'demo' ? (
            <span>Demo-Modus · Daten nur in diesem Browser</span>
          ) : (
            <>
              <span>{user.email}</span>
              <button className="link-btn" onClick={() => backend.signOut()}>
                Abmelden
              </button>
            </>
          )}
        </footer>
      </div>

      {openProject && <ProjectDetail project={openProject} onClose={() => setOpenId(null)} />}
      {creating && (
        <NewProjectDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setOpenId(id);
          }}
        />
      )}
    </AppContext.Provider>
  );
}

function SyncBadge({ online, pending, demo }: { online: boolean; pending: boolean; demo: boolean }) {
  if (demo) return <span className="sync sync-demo">Demo</span>;
  if (!online) return <span className="sync sync-offline">Offline{pending ? ' · Änderungen warten' : ''}</span>;
  if (pending) return <span className="sync sync-pending">Synchronisiert …</span>;
  return <span className="sync sync-ok">Synchron</span>;
}
