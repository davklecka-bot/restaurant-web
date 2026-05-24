'use client'
import { useState } from 'react'
import ApiKeyInput from '@/components/ApiKeyInput'

export default function InsightsClient() {
  const [apiKey, setApiKey] = useState('')
  const [keyReady, setKeyReady] = useState(false)
  const [insights, setInsights] = useState('')
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (!keyReady) return
    setLoading(true)
    setInsights('')
    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    })
    const { insights: text } = await res.json()
    setInsights(text)
    setLoading(false)
  }

  const sections = insights ? insights.split(/^## /m).filter(Boolean) : []

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Insighty</h1>
        <p style={{ color: '#555', fontSize: 13 }}>Claude analyzuje odpovědi a generuje market insights</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28, alignItems: 'center', flexWrap: 'wrap' }}>
        <ApiKeyInput onReady={k => { setApiKey(k); setKeyReady(true) }} />
        <button onClick={generate} disabled={!keyReady || loading} style={{
          background: keyReady && !loading ? '#a855f7' : '#1a1028',
          color: keyReady && !loading ? '#fff' : '#444',
          border: 'none', borderRadius: 8, padding: '10px 22px',
          fontWeight: 600, fontSize: 13, cursor: keyReady ? 'pointer' : 'default'
        }}>
          {loading ? 'Analyzuji...' : 'Generovat insighty'}
        </button>
      </div>

      {loading && (
        <div style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: 12, padding: 32, textAlign: 'center', color: '#555' }}>
          Claude analyzuje odpovědi...
        </div>
      )}

      {sections.length > 0 && (
        <div style={{ display: 'grid', gap: 16 }}>
          {sections.map((section, i) => {
            const [title, ...lines] = section.split('\n')
            return (
              <div key={i} style={{ background: '#161616', border: '1px solid #222', borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a855f7', marginBottom: 12 }}>{title?.trim()}</div>
                <div style={{ fontSize: 13, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {lines.join('\n').trim()}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !insights && (
        <div style={{ background: '#161616', border: '1px solid #1e1e1e', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>◇</div>
          <div style={{ color: '#555', fontSize: 13 }}>
            Insighty se vygenerují z odpovědí restaurací.<br />
            Nejdřív pošli outreach emaily a počkej na odpovědi.
          </div>
        </div>
      )}
    </div>
  )
}
