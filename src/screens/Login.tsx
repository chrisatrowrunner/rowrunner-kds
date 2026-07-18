// Login.tsx — kitchen-staff sign-in. No sign-up — staff are provisioned.
// Laid out as a centered card so it reads well on the landscape kiosk.
import { useState, type CSSProperties } from 'react'
import { useStore } from '../store/store'
import { isMockMode } from '../lib/orders'
import { CTA } from '../components/ui'

const field: CSSProperties = {
  width: '100%',
  height: 58,
  borderRadius: 14,
  padding: '0 18px',
  fontSize: 17,
  fontWeight: 600,
  color: '#fff',
  background: 'rgba(255,255,255,.08)',
  border: '1px solid rgba(255,255,255,.16)',
  outline: 'none',
}

export function LoginScreen() {
  const s = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setErr(null)
    setBusy(true)
    try {
      await s.login(email, password)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not sign in.')
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(120% 90% at 50% 0%, #0E3F5E, #072E48 70%)',
        color: '#fff',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 460 }}>
        <img
          src="/assets/logo-lockup-white.png"
          alt="RowRunner"
          style={{ height: 44, objectFit: 'contain', alignSelf: 'flex-start', marginBottom: 8 }}
        />
        <h1 style={{ margin: '16px 0 0', fontSize: 34, fontWeight: 800, letterSpacing: -0.4 }}>
          Kitchen sign-in
        </h1>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ice)', marginTop: 6 }}>
          Confirm. Prepare. Ready.
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!busy) submit()
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}
        >
          <input
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={field}
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={field}
          />
          {err && (
            <div style={{ fontSize: 14, fontWeight: 700, color: '#FCA5A5', paddingLeft: 2 }}>
              {err}
            </div>
          )}
          <button type="submit" style={{ display: 'none' }} aria-hidden />
        </form>

        <div style={{ marginTop: 20 }}>
          <CTA
            label={busy ? 'Signing in…' : 'Sign in'}
            icon={busy ? undefined : 'arrowR'}
            disabled={busy}
            onClick={submit}
          />
          {isMockMode && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,.55)',
                textAlign: 'center',
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              Demo mode — any email + password works.
              <br />
              Try <b style={{ color: 'var(--ice)' }}>chef@venue.com</b>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
