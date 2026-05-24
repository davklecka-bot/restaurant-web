'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Stats = {
  total: number; withEmail: number; sent: number; responded: number
  byCity: { city: string; c: number }[]
  byStatus: { status: string; c: number }[]
}

const card = (label: string, value: number | string, color: string, sub?: string) => (
  <div key={label} style={{
    background: '#161616', border: '1px solid #222', borderRadius: 12,
    padding: '20px 24px', minWidth: 160
  }}>
    <div style={{ fontSize: 12, color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{sub}</div>}
  </div>
)

export default function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  const responseRate = stats && stats.sent > 0 ? Math.round((stats.responded / stats.sent) * 100) : 0

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: '#555', fontSize: 13 }}>Market research restaurací v ČR — rezervační systémy</p>
      </div>

      {!stats ? (
        <div style={{ color: '#444', fontSize: 13 }}>Načítám...</div>
      ) : stats.total === 0 ? (
        <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>◎</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Databáze je prázdná</div>
          <div style={{ color: '#555', marginBottom: 24 }}>Spusť agenta pro sběr dat restaurací</div>
          <Link href="/agent" style={{
            display: 'inline-block', background: '#22c55e', color: '#000',
            padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 13
          }}>
            Spustit agenta →
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
            {card('Restaurací', stats.total, '#e8e8e8', 'celkem v databázi')}
            {card('S emailem', stats.withEmail, '#3b82f6', `${Math.round((stats.withEmail / stats.total) * 100)}% pokrytí`)}
            {card('Osloveno', stats.sent, '#f97316', 'odesláno emailů')}
            {card('Odpovědi', stats.responded, '#22c55e', `${responseRate}% response rate`)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
            <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Podle měst</div>
              {stats.byCity.map(({ city, c }) => (
                <div key={city} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: '#888', width: 70 }}>{city}</div>
                  <div style={{ flex: 1, background: '#1e1e1e', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, background: '#3b82f6',
                      width: `${Math.round((c / stats.total) * 100)}%`
                    }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#555', width: 20, textAlign: 'right' }}>{c}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Stav oslovení</div>
              {[
                { s: 'pending',     label: 'Čekající',    color: '#555' },
                { s: 'sent',        label: 'Odesláno',    color: '#f97316' },
                { s: 'followed_up', label: 'Follow-up',   color: '#a855f7' },
                { s: 'responded',   label: 'Odpovědělo',  color: '#22c55e' },
              ].map(({ s, label, color }) => {
                const entry = stats.byStatus.find(x => x.status === s)
                const count = entry?.c ?? 0
                return (
                  <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/restaurants" style={{
              background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#e8e8e8',
              padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontSize: 13
            }}>Zobrazit restaurace →</Link>
            <Link href="/outreach" style={{
              background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#e8e8e8',
              padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontSize: 13
            }}>Správa emailů →</Link>
            <Link href="/insights" style={{
              background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#e8e8e8',
              padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontSize: 13
            }}>Insighty →</Link>
          </div>
        </>
      )}
    </div>
  )
}
