'use client'
import { useEffect, useState } from 'react'
import type { Restaurant } from '@/lib/db'
import Link from 'next/link'

export default function OutreachClient() {
  const [data, setData] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; total?: number; errors?: string[]; message?: string; error?: string } | null>(null)

  useEffect(() => {
    fetch('/api/restaurants').then(r => r.json()).then((d: Restaurant[]) => {
      setData(d); setLoading(false)
    })
  }, [])

  async function sendEmails() {
    setSending(true)
    setSendResult(null)
    const res = await fetch('/api/send-emails', { method: 'POST' })
    const json = await res.json()
    setSendResult(json)
    setSending(false)
    if (json.sent > 0) {
      const updated = await fetch('/api/restaurants').then(r => r.json())
      setData(updated)
    }
  }

  const withEmail = data.filter(r => r.email)
  const pending = withEmail.filter(r => !r.email_sent_at)
  const sent = withEmail.filter(r => r.email_sent_at && !r.followup_sent_at && r.status !== 'responded')
  const followedUp = withEmail.filter(r => r.followup_sent_at && r.status !== 'responded')
  const responded = withEmail.filter(r => r.status === 'responded')

  const Section = ({ title, items, color, emptyMsg }: { title: string; items: Restaurant[]; color: string; emptyMsg: string }) => (
    <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        </div>
        <span style={{ fontSize: 12, color: '#555' }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '20px', color: '#444', fontSize: 12, textAlign: 'center' }}>{emptyMsg}</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {items.slice(0, 10).map((r, i) => (
              <tr key={r.id} style={{ borderBottom: i < Math.min(items.length, 10) - 1 ? '1px solid #1a1a1a' : 'none' }}>
                <td style={{ padding: '10px 20px' }}>
                  <div style={{ fontSize: 13 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{r.city} · {r.category}</div>
                </td>
                <td style={{ padding: '10px 20px', fontSize: 12, color: '#3b82f6' }}>{r.email}</td>
                {r.status === 'responded' && r.response_text && (
                  <td style={{ padding: '10px 20px', fontSize: 12, color: '#888', maxWidth: 300 }}>
                    {r.response_text.slice(0, 80)}...
                  </td>
                )}
              </tr>
            ))}
            {items.length > 10 && (
              <tr><td colSpan={3} style={{ padding: '10px 20px', fontSize: 12, color: '#444', textAlign: 'center' }}>
                + {items.length - 10} dalších
              </td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Outreach</h1>
        <p style={{ color: '#555', fontSize: 13 }}>Správa emailové komunikace</p>
      </div>

      {loading ? (
        <div style={{ color: '#444' }}>Načítám...</div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>
          Nejdřív spusť agenta pro sběr kontaktů.{' '}
          <Link href="/agent" style={{ color: '#3b82f6' }}>Přejít na agenta →</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'S emailem', val: withEmail.length, color: '#888' },
              { label: 'Čeká na odeslání', val: pending.length, color: '#f97316' },
              { label: 'Odesláno', val: sent.length, color: '#3b82f6' },
              { label: 'Odpovědělo', val: responded.length, color: '#22c55e' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: '#161616', border: '1px solid #222', borderRadius: 10, padding: '14px 20px', minWidth: 140 }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color }}>{val}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <button
              onClick={sendEmails}
              disabled={sending || pending.length === 0}
              style={{
                background: pending.length > 0 && !sending ? '#3b82f6' : '#1a1a2a',
                color: pending.length > 0 && !sending ? '#fff' : '#444',
                border: 'none', borderRadius: 8, padding: '10px 22px',
                fontWeight: 600, fontSize: 13,
                cursor: pending.length > 0 && !sending ? 'pointer' : 'default',
                transition: 'all 0.15s'
              }}
            >
              {sending ? 'Odesílám...' : `Odeslat emaily (${pending.length})`}
            </button>

            {sendResult && (
              <div style={{ fontSize: 13, color: sendResult.sent > 0 ? '#22c55e' : '#f97316' }}>
                {sendResult.sent > 0
                  ? `✓ Odesláno ${sendResult.sent} z ${sendResult.total}`
                  : sendResult.errors?.[0] ?? sendResult.message ?? sendResult.error}
              </div>
            )}
          </div>

          <Section title="Čeká na odeslání" items={pending} color="#f97316" emptyMsg="Všechny emaily byly odeslány" />
          <Section title="Odesláno (čeká na odpověď)" items={sent} color="#3b82f6" emptyMsg="Žádné odeslané emaily" />
          <Section title="Follow-up odeslán" items={followedUp} color="#a855f7" emptyMsg="Žádné follow-upy" />
          <Section title="Odpovědělo" items={responded} color="#22c55e" emptyMsg="Zatím žádné odpovědi" />
        </>
      )}
    </div>
  )
}
