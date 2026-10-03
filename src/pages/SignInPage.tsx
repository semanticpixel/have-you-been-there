import { useState, type FormEvent } from 'react';
import { supabase, errorMessage } from '../lib/supabase';
import { getPendingInvite } from '../lib/session';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const invite = getPendingInvite();

  async function sendEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    // Send the link back to the invite if there is one, so it survives opening in a different browser.
    const redirect = `${window.location.origin}${invite ? `/join/${invite}` : '/'}`;
    const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (error) setError(error.message);
    else setSentTo(email.trim());
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      const { error } = await supabase!.auth.verifyOtp({ email: sentTo!, token: code.trim(), type: 'email' });
      if (error) throw error;
      // onAuthStateChange takes it from here.
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="page form narrow">
      <header className="hero">
        <h1>Have You Been There? 🍸</h1>
        <p className="muted">
          {invite ? "You've been invited to a crew. Sign in to join." : 'Sign in to see your crew’s bartenders.'}
        </p>
      </header>

      {!sentTo ? (
        <form onSubmit={sendEmail}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" />
          </label>
          <button type="submit" className="primary block" disabled={busy || !email.trim()}>
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <p className="muted small">No password. We'll email you a link and a code.</p>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <p>
            Check <strong>{sentTo}</strong>. Tap the link in the email, or type the code here:
          </p>
          <label>
            Code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={10}
              autoFocus
            />
          </label>
          <button type="submit" className="primary block" disabled={busy || code.length < 6}>
            {busy ? 'Checking…' : 'Sign in'}
          </button>
          <button type="button" className="link" onClick={() => (setSentTo(undefined), setCode(''), setError(undefined))}>
            Use a different email
          </button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
