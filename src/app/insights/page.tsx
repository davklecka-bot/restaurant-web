import Sidebar from '@/components/Sidebar'
import InsightsClient from './InsightsClient'

export default function InsightsPage() {
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <InsightsClient />
      </main>
    </div>
  )
}
