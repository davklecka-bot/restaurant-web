'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_MAIN = [
  { href: '/',            label: 'Dashboard',  icon: '◈' },
  { href: '/restaurants', label: 'Restaurace', icon: '⊞' },
  { href: '/outreach',    label: 'Outreach',   icon: '✉' },
  { href: '/insights',    label: 'Insighty',   icon: '◇' },
]

const NAV_AGENTS = [
  { href: '/agent', label: 'Research', icon: '◎', beta: true },
]

export default function Sidebar() {
  const path = usePathname()

  const renderLink = ({ href, label, icon, beta }: { href: string; label: string; icon: string; beta?: boolean }) => {
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
        {beta && (
          <span style={{
            fontSize: 9, fontWeight: 600, color: '#f97316',
            background: '#1a0f00', border: '1px solid #f9731633',
            borderRadius: 4, padding: '1px 5px', letterSpacing: 1,
            textTransform: 'uppercase'
          }}>beta</span>
        )}
        {active && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: '#22c55e' }} />}
      </Link>
    )
  }

  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: '#111', borderRight: '1px solid #222',
      display: 'flex', flexDirection: 'column', padding: '24px 0', flexShrink: 0
    }}>
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #222' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e8e8', display: 'flex', alignItems: 'center', gap: 8 }}>
          Restaurace Agent
          <span style={{
            fontSize: 9, fontWeight: 600, color: '#f97316',
            background: '#1a0f00', border: '1px solid #f9731633',
            borderRadius: 4, padding: '1px 5px', letterSpacing: 1,
            textTransform: 'uppercase'
          }}>beta</span>
        </div>
      </div>

      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {NAV_MAIN.map(renderLink)}

        <div style={{
          fontSize: 10, color: '#444', letterSpacing: 1.5,
          textTransform: 'uppercase', padding: '16px 12px 6px'
        }}>
          Agenti
        </div>
        {NAV_AGENTS.map(renderLink)}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid #222' }}>
        <div style={{ fontSize: 11, color: '#444' }}>Powered by David Klečka</div>
        <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>tidabo</div>
      </div>
    </aside>
  )
}
