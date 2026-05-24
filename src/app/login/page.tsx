'use client'
import { useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const params = useSearchParams()
  const from = params.get('from') || '/'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Read directly from DOM to catch browser autofill
    const actualPassword = inputRef.current?.value || password

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: actualPassword }),
    })

    if (res.ok) {
      router.push(from)
      router.refresh()
    } else {
      setError('Špatné heslo')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%', background: '#0d0d0d',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#161616', border: '1px solid #222', borderRadius: 16,
        padding: '40px 48px', width: 360,
      }}>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
          Research
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#e8e8e8', marginBottom: 32 }}>
          Restaurant Agent
        </div>

        <form onSubmit={submit}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8 }}>
            Heslo
          </label>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
            style={{
              width: '100%', background: '#0d0d0d', border: `1px solid ${error ? '#ef4444' : '#2a2a2a'}`,
              borderRadius: 8, padding: '10px 14px', color: '#e8e8e8', fontSize: 14,
              outline: 'none', marginBottom: error ? 8 : 20,
            }}
          />
          {error && (
            <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 16 }}>{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: loading ? '#1a2a1a' : '#22c55e',
              color: loading ? '#333' : '#000',
              border: 'none', borderRadius: 8, padding: '11px',
              fontWeight: 700, fontSize: 14, cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Přihlašuji...' : 'Vstoupit'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
