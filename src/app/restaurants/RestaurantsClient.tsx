'use client'
import { useEffect, useState } from 'react'
import type { Restaurant } from '@/lib/db'

const STATUS_COLORS: Record<string, string> = {
  pending:     '#444',
  sent:        '#f97316',
  followed_up: '#a855f7',
  responded:   '#22c55e',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'čeká', sent: 'odesláno', followed_up: 'follow-up', responded: 'odpovědělo'
}

export default function RestaurantsClient() {
  const [data, setData] = useState<Restaurant[]>([])
  const [filter, setFilter] = useState({ city: '', category: '', search: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/restaurants').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  const cities = [...new Set(data.map(r => r.city))].sort()
  const filtered = data.filter(r =>
    (!filter.city || r.city === filter.city) &&
    (!filter.category || r.category === filter.category) &&
    (!filter.search || r.name.toLowerCase().includes(filter.search.toLowerCase()))
  )

  const sel = (k: keyof typeof filter, v: string) => setFilter(f => ({ ...f, [k]: f[k] === v ? '' : v }))

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Restaurace</h1>
        <p style={{ color: '#555', fontSize: 13 }}>{data.length} kontaktů celkem</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          placeholder="Hledat název..."
          value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
          style={{
            background: '#161616', border: '1px solid #222', borderRadius: 8,
            padding: '8px 14px', color: '#e8e8e8', fontSize: 13, outline: 'none', width: 200
          }}
        />
        {cities.map(city => (
          <button key={city} onClick={() => sel('city', city)} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: 'none',
            background: filter.city === city ? '#3b82f6' : '#1a1a1a',
            color: filter.city === city ? '#fff' : '#888'
          }}>{city}</button>
        ))}
        {['casual', 'premium'].map(cat => (
          <button key={cat} onClick={() => sel('category', cat)} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: 'none',
            background: filter.category === cat ? (cat === 'casual' ? '#f97316' : '#a855f7') : '#1a1a1a',
            color: filter.category === cat ? '#fff' : '#888'
          }}>{cat}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#444', fontSize: 13 }}>Načítám...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#444', textAlign: 'center', padding: 48 }}>Žádné výsledky</div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                {['Název', 'Město', 'Typ', 'Email', 'Sociální sítě', 'Stav'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, color: '#444', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #161616' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                    {r.website && (
                      <a href={r.website} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: '#444', textDecoration: 'none' }}>
                        {r.website.replace(/^https?:\/\//, '').slice(0, 30)}
                      </a>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#888' }}>{r.city}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 4,
                      background: r.category === 'premium' ? '#1a1028' : '#1a1208',
                      color: r.category === 'premium' ? '#a855f7' : '#ca8a04'
                    }}>{r.category}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: r.email ? '#3b82f6' : '#333' }}>
                    {r.email || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {r.instagram && <a href={r.instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#e1306c', textDecoration: 'none' }}>IG</a>}
                      {r.facebook && <a href={r.facebook} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1877f2', textDecoration: 'none' }}>FB</a>}
                      {!r.instagram && !r.facebook && <span style={{ color: '#333', fontSize: 11 }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 4,
                      background: STATUS_COLORS[r.status ?? 'pending'] + '22',
                      color: STATUS_COLORS[r.status ?? 'pending']
                    }}>{STATUS_LABELS[r.status ?? 'pending'] ?? r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
