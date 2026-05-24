'use client'
import { useState, useEffect } from 'react'

const LS_KEY = 'anthropic_api_key'

type Props = {
  onReady: (key: string) => void
}

export default function ApiKeyInput({ onReady }: Props) {
  const [key, setKey] = useState('')
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Check if server already has the key configured
    fetch('/api/config')
      .then(r => r.json())
      .then(({ hasServerKey }) => {
        if (hasServerKey) {
          setHasServerKey(true)
          onReady('')  // server will use env var
        } else {
          setHasServerKey(false)
          // Load from localStorage
          const stored = localStorage.getItem(LS_KEY)
          if (stored) {
            setKey(stored)
            setSaved(true)
            onReady(stored)
          }
        }
      })
  }, [])

  function save() {
    if (!key.trim()) return
    localStorage.setItem(LS_KEY, key.trim())
    setSaved(true)
    onReady(key.trim())
  }

  function clear() {
    localStorage.removeItem(LS_KEY)
    setKey('')
    setSaved(false)
    onReady('')
  }

  if (hasServerKey === null) return (
    <div style={{ color: '#444', fontSize: 13 }}>Načítám...</div>
  )

  if (hasServerKey) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', background: '#0f2a1a', border: '1px solid #1a4a2a',
      borderRadius: 8, fontSize: 12, color: '#4ade80'
    }}>
      <span>●</span> API klíč nastaven jako proměnná prostředí
    </div>
  )

  if (saved) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', background: '#0f2a1a', border: '1px solid #1a4a2a',
        borderRadius: 8, fontSize: 12, color: '#4ade80'
      }}>
        <span>●</span> API klíč uložen v prohlížeči
      </div>
      <button onClick={clear} style={{
        background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 6,
        padding: '6px 12px', color: '#555', fontSize: 12, cursor: 'pointer'
      }}>Změnit</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="password"
        placeholder="sk-ant-..."
        value={key}
        onChange={e => setKey(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        autoFocus
        style={{
          background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8,
          padding: '9px 14px', color: '#e8e8e8', fontSize: 13, outline: 'none', width: 280
        }}
      />
      <button onClick={save} disabled={!key.trim()} style={{
        background: key.trim() ? '#22c55e' : '#1a2a1a',
        color: key.trim() ? '#000' : '#333',
        border: 'none', borderRadius: 8, padding: '10px 20px',
        fontWeight: 600, fontSize: 13, cursor: key.trim() ? 'pointer' : 'default'
      }}>
        Uložit klíč
      </button>
      <div style={{ fontSize: 11, color: '#444', width: '100%' }}>
        Klíč se uloží jen do tohoto prohlížeče. Nikdy ho neodesíláme nikam jinam.
      </div>
    </div>
  )
}
