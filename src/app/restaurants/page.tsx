import Sidebar from '@/components/Sidebar'
import RestaurantsClient from './RestaurantsClient'

export default function RestaurantsPage() {
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <RestaurantsClient />
      </main>
    </div>
  )
}
