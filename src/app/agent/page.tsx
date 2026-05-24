import Sidebar from '@/components/Sidebar'
import AgentClient from './AgentClient'

export default function AgentPage() {
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <AgentClient />
      </main>
    </div>
  )
}
