'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/',             label: 'Dashboard',    icon: '◈' },
  { href: '/restaurants',  label: 'Restaurace',   icon: '⊞' },
  { href: '/agent',        label: 'Agent',        icon: '◎' },
  { href: '/outreach',     label: 'Outreach',     icon: '✉' },
  { href: '/insights',     label: 'Insighty',     icon: '◇' },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: '#111', borderRight: '1px solid #222',
      display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0
    }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #222' }}>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
          Research
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e8e8' }}>
          Restaurant Agent
        </div>
      </div>

      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {NAV.map(({ href, label, icon }) => {
          const active = path === href
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 6, marginBottom: 2,
              background: active ? '#1e1e1e' : 'transparent',
              color: active ? '#e8e8e8' : '#666',
              textDecoration: 'none', fontSize: 13, fontWeight: active ? 500 : 400,
              transition: 'all 0.15s'
            }}>
              <span style={{ fontSize: 14, opacity: active ? 1 : 0.6 }}>{icon}</span>
              {label}
              {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#22c55e' }} />}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #222' }}>
        <div style={{ fontSize: 11, color: '#444' }}>Powered by David Klečka</div>
        <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>tidabo</div>
      </div>
    </aside>
  )
}
