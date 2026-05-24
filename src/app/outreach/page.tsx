import Sidebar from '@/components/Sidebar'
import OutreachClient from './OutreachClient'

export default function OutreachPage() {
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <OutreachClient />
      </main>
    </div>
  )
}
