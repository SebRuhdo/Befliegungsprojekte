import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { firebaseConfig } from '../firebase-config';
import { emptySteps, normalizeProject, type Member } from '../model';
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
      deleteDoc(doc(projectsCol, id)).catch(logError);
    },
  };
}
