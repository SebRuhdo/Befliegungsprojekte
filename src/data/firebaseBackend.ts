import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { firebaseConfig } from '../firebase-config';
import { EMPTY_SETTINGS, emptySteps, normalizeProject, type ActivityEntry, type Member, type Settings } from '../model';
import type { Backend } from './types';

export function createFirebaseBackend(): Backend {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  // Lokaler Offline-Speicher (IndexedDB): Daten sind ohne Netz lesbar,
  // Änderungen werden zwischengespeichert und beim nächsten Netzkontakt hochgeladen.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const projectsCol = collection(db, 'projects');
  const settingsDoc = doc(db, 'settings', 'app');

  const logError = (e: unknown) => console.error('Firestore-Schreibfehler', e);

  return {
    mode: 'firebase',

    onAuth(cb) {
      return onAuthStateChanged(auth, (u) => cb(u?.email ? { email: u.email.toLowerCase() } : null));
    },
    async signIn(email, password) {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    async resetPassword(email) {
      await sendPasswordResetEmail(auth, email.trim());
    },
    async signOut() {
      await fbSignOut(auth);
    },

    subscribeProjects(cb, onError) {
      return onSnapshot(
        projectsCol,
        (snap) => cb(snap.docs.map((d) => normalizeProject(d.id, d.data()))),
        onError,
      );
    },
    subscribeMembers(cb, onError) {
      return onSnapshot(
        collection(db, 'members'),
        (snap) =>
          cb(
            snap.docs.map(
              (d): Member => ({ email: d.id.toLowerCase(), name: String(d.data().name ?? d.id) }),
            ),
          ),
        onError,
      );
    },
    subscribeSync(cb) {
      return onSnapshot(
        projectsCol,
        { includeMetadataChanges: true },
        (snap) => cb(snap.metadata.hasPendingWrites),
        () => {},
      );
    },

    createProject(data, by) {
      const ref = doc(projectsCol);
      const now = Date.now();
      // Nicht awaiten: offline würde das Promise erst nach dem Hochladen erfüllt
      setDoc(ref, {
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
      }).catch(logError);
      return ref.id;
    },
    updateProject(id, patch, by) {
      updateDoc(doc(projectsCol, id), { ...patch, updatedAt: Date.now(), updatedBy: by }).catch(logError);
    },
    deleteProject(id) {
      // Verlauf mitlöschen (Firestore löscht Unter-Sammlungen nicht automatisch)
      const activity = collection(db, 'projects', id, 'activity');
      getDocs(activity)
        .then((snap) => {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          batch.delete(doc(projectsCol, id));
          return batch.commit();
        })
        .catch(logError);
    },

    subscribeSettings(cb, onError) {
      return onSnapshot(
        settingsDoc,
        (snap) => {
          const d = (snap.data() ?? {}) as Partial<Settings>;
          cb({
            templates: d.templates ?? EMPTY_SETTINGS.templates,
            equipment: Array.isArray(d.equipment) ? d.equipment : [],
            windGustLimit: typeof d.windGustLimit === 'number' ? d.windGustLimit : null,
          });
        },
        onError,
      );
    },
    saveSettings(patch) {
      setDoc(settingsDoc, patch, { merge: true }).catch(logError);
    },

    subscribeActivity(projectId, cb, onError) {
      return onSnapshot(
        query(collection(db, 'projects', projectId, 'activity'), orderBy('at', 'desc')),
        (snap) =>
          cb(
            snap.docs.map((d): ActivityEntry => {
              const x = d.data();
              return {
                id: d.id,
                type: x.type === 'comment' ? 'comment' : 'event',
                text: String(x.text ?? ''),
                by: String(x.by ?? ''),
                at: Number(x.at ?? 0),
              };
            }),
          ),
        onError,
      );
    },
    addActivity(projectId, entry) {
      addDoc(collection(db, 'projects', projectId, 'activity'), { ...entry, at: Date.now() }).catch(logError);
    },
    deleteActivity(projectId, entryId) {
      deleteDoc(doc(db, 'projects', projectId, 'activity', entryId)).catch(logError);
    },
  };
}
