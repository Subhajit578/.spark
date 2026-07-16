import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Spark',
  description: 'Build websites with AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
