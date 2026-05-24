import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Restaurant Research Agent',
  description: 'Market research dashboard pro restaurace v ČR',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className="h-full">
      <body className="min-h-full flex">{children}</body>
    </html>
  )
}
