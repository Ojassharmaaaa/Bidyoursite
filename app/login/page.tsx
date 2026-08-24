export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;

  return (
    <main className="wrap auth-wrap">
      <h1 style={{ fontSize: '1.9rem', letterSpacing: '-.03em', marginBottom: 8 }}>Sign in to bid</h1>
      <p style={{ color: 'var(--ink-2)', marginBottom: 22 }}>
        Bids are binding, so they need a name attached. Nothing else is required — no card, no KYC until a
        lot actually sells.
      </p>

      {e && <div className="err">{e}</div>}

      <div className="panel">
        <form method="post" action="/api/auth">
          <input type="hidden" name="action" value="login" />
          <div className="form-grid">
            <div>
              <label className="lb" htmlFor="email">Email</label>
              <input className="fld" id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <label className="lb" htmlFor="password">Password</label>
              <input className="fld" id="password" name="password" type="password" required
                minLength={12} autoComplete="current-password" />
            </div>
            <button className="btn btn-p btn-block" type="submit">Sign in</button>
          </div>
        </form>
      </div>

      <div className="panel" style={{ marginTop: 18 }}>
        <h3>New here?</h3>
        <form method="post" action="/api/auth">
          <input type="hidden" name="action" value="signup" />
          <div className="form-grid">
            <div>
              <label className="lb" htmlFor="handle">
                Handle <small>· shown masked on bids, e.g. n****a</small>
              </label>
              <input className="fld" id="handle" name="handle" required pattern="[a-z0-9._\-]{3,20}"
                placeholder="novaklein" />
            </div>
            <div>
              <label className="lb" htmlFor="email2">Email</label>
              <input className="fld" id="email2" name="email" type="email" required autoComplete="email" />
            </div>
            <div>
              <label className="lb" htmlFor="password2">
                Password <small>· at least 12 characters</small>
              </label>
              <input className="fld" id="password2" name="password" type="password" required
                minLength={12} autoComplete="new-password" />
            </div>
            <button className="btn btn-g btn-block" type="submit">Create account</button>
          </div>
        </form>
      </div>
    </main>
  );
}
