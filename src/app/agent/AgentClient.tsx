'use client'
import { useState, useRef, useEffect } from 'react'

type Event =
  | { type: 'search'; query: string }
  | { type: 'scrape'; url: string }
  | { type: 'save'; name: string; city: string; hasEmail: boolean; count: number }
  | { type: 'text'; text: string }
  | { type: 'done'; stats: { total: number; withEmail: number } }
  | { type: 'error'; message: string }

type LogLine = { id: number; event: Event }

function EventRow({ event }: { event: Event }) {
  if (event.type === 'search') return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '5px 0' }}>
      <span style={{ color: '#3b82f6', fontFamily: 'monospace', minWidth: 20 }}>🔍</span>
      <span style={{ color: '#888', fontSize: 12 }}>{event.query}</span>
    </div>
  )
  if (event.type === 'scrape') return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '5px 0' }}>
      <span style={{ color: '#f97316', fontFamily: 'monospace', minWidth: 20 }}>🌐</span>
      <span style={{ color: '#666', fontSize: 12, wordBreak: 'break-all' }}>{event.url.slice(0, 70)}</span>
    </div>
  )
  if (event.type === 'save') return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0' }}>
      <span style={{ color: '#22c55e', fontFamily: 'monospace', minWidth: 20 }}>+</span>
      <span style={{ color: '#e8e8e8', fontSize: 13 }}>
        <span style={{ color: '#555' }}>[{event.city}]</span> {event.name}
        {event.hasEmail && <span style={{ color: '#3b82f6', marginLeft: 6, fontSize: 11 }}>✉</span>}
        <span style={{ color: '#333', marginLeft: 8, fontSize: 11 }}>#{event.count}</span>
      </span>
    </div>
  )
  if (event.type === 'text') return (
    <div style={{ padding: '5px 0', color: '#555', fontSize: 12, fontStyle: 'italic' }}>{event.text}</div>
  )
  if (event.type === 'done') return (
    <div style={{
      padding: '12px 16px', background: '#0f2a1a', border: '1px solid #1a4a2a',
      borderRadius: 8, marginTop: 8
    }}>
      <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 14 }}>✓ Výzkum dokončen</div>
      <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
        Celkem: {event.stats.total} restaurací · S emailem: {event.stats.withEmail}
      </div>
    </div>
  )
  if (event.type === 'error') return (
    <div style={{ padding: '8px 12px', background: '#1a0f0f', border: '1px solid #3a1a1a', borderRadius: 6, color: '#ef4444', fontSize: 12 }}>
      Chyba: {event.message}
    </div>
  )
  return null
}

export default function AgentClient() {
  const [apiKey, setApiKey] = useState('')
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const logRef = useRef<HTMLDivElement>(null)
  const counter = useRef(0)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  async function startAgent() {
    if (!apiKey.trim()) return
    setRunning(true)
    setDone(false)
    setLogs([])
    setSavedCount(0)
    counter.current = 0

    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    })

    if (!res.ok || !res.body) {
      setRunning(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''

    while (true) {
      const { done: d, value } = await reader.read()
      if (d) break
      buf += decoder.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''
      for (const part of parts) {
        const line = part.replace(/^data: /, '').trim()
        if (!line) continue
        try {
          const event: Event = JSON.parse(line)
          const id = ++counter.current
          setLogs(prev => [...prev, { id, event }])
          if (event.type === 'save') setSavedCount(event.count)
          if (event.type === 'done' || event.type === 'error') { setDone(true); setRunning(false) }
        } catch {}
      }
    }
    setRunning(false)
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Agent</h1>
        <p style={{ color: '#555', fontSize: 13 }}>Claude autonomně hledá restaurace, scrape kontakty a ukládá do databáze</p>
      </div>

      {!running && !done && (
        <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 12, padding: 28, maxWidth: 520 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Anthropic API Key</div>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{
              width: '100%', background: '#0d0d0d', border: '1px solid #2a2a2a',
              borderRadius: 8, padding: '10px 14px', color: '#e8e8e8', fontSize: 13,
              outline: 'none', marginBottom: 16
            }}
          />
          <div style={{ fontSize: 12, color: '#444', marginBottom: 20 }}>
            Klíč získáš na console.anthropic.com. Nikdy ho neukládáme.
          </div>
          <div style={{ background: '#0f1a10', border: '1px solid #1a2e1a', borderRadius: 8, padding: 16, marginBottom: 20, fontSize: 12, color: '#666' }}>
            <div style={{ color: '#888', marginBottom: 8, fontWeight: 600 }}>Co agent udělá:</div>
            <div>• Praha, Brno, Ostrava, Plzeň, Liberec</div>
            <div>• ~15 restaurací na město (casual + premium)</div>
            <div>• Scrape každý web pro email + sociální sítě</div>
            <div>• Uloží ~75 kontaktů do databáze</div>
            <div style={{ marginTop: 8, color: '#444' }}>Odhadovaný čas: 10–20 minut</div>
          </div>
          <button
            onClick={startAgent}
            disabled={!apiKey.trim()}
            style={{
              background: apiKey.trim() ? '#22c55e' : '#1a2a1a',
              color: apiKey.trim() ? '#000' : '#333',
              border: 'none', borderRadius: 8, padding: '11px 28px',
              fontWeight: 700, fontSize: 13, cursor: apiKey.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s'
            }}
          >
            Spustit agenta
          </button>
        </div>
      )}

      {(running || logs.length > 0) && (
        <div style={{ background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid #1a1a1a',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#111'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {running && (
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
                  animation: 'pulse 1.5s infinite'
                }} />
              )}
              <span style={{ fontSize: 13, color: '#888' }}>
                {running ? 'Agent běží...' : done ? 'Dokončeno' : 'Log'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#555' }}>{savedCount} restaurací uloženo</div>
          </div>
          <div ref={logRef} style={{ padding: '16px 20px', maxHeight: 520, overflowY: 'auto', fontFamily: 'monospace' }}>
            {logs.map(({ id, event }) => <EventRow key={id} event={event} />)}
            {running && (
              <div style={{ color: '#333', fontSize: 12, marginTop: 8 }}>▌</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  )
}
