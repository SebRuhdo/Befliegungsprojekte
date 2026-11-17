import { useState } from 'react';
import type { Backend } from '../data/types';

export function Login({ backend }: { backend: Backend }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await backend.signIn(email, password);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setMsg(
        code.includes('network')
          ? 'Keine Verbindung. Für die erste Anmeldung wird Internet benötigt.'
          : 'Anmeldung fehlgeschlagen. E-Mail oder Passwort prüfen.',
      );
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email) return setMsg('Bitte zuerst die E-Mail-Adresse eingeben.');
    try {
      await backend.resetPassword(email);
      setMsg('Falls die Adresse bekannt ist, wurde eine E-Mail zum Zurücksetzen verschickt.');
    } catch {
      setMsg('Zurücksetzen fehlgeschlagen.');
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={64} height={64} />
        <h1>Befliegungen</h1>
        <label className="field">
          <span className="field-label">E-Mail</span>
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field-label">Passwort</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {msg && <p className="login-msg">{msg}</p>}
        <button className="btn btn-primary wide" disabled={busy}>
          {busy ? 'Anmelden …' : 'Anmelden'}
        </button>
        <button type="button" className="link-btn" onClick={reset}>
          Passwort vergessen?
        </button>
      </form>
    </div>
  );
}
