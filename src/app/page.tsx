import Sidebar from '@/components/Sidebar'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <DashboardClient />
      </main>
    </div>
  )
}
