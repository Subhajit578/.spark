'use client'
import { useEffect, useState } from 'react'
import { Code } from 'lucide-react'

interface Props {
  filePath: string | null
  getContent: (path: string) => Promise<string>
}

export function CodeViewer({ filePath, getContent }: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!filePath) return
    setLoading(true)
    getContent(filePath)
      .then(c => { setContent(c); setLoading(false) })
      .catch(() => { setContent('Error loading file'); setLoading(false) })
  }, [filePath])

  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-full text-center">
        <Code className="h-8 w-8 text-zinc-700" />
        <p className="text-sm text-zinc-600">Select a file to view its contents</p>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-sm text-zinc-500">Loading...</div>
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
        <Code className="h-3.5 w-3.5" />
        {filePath}
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed text-zinc-300">
        <code>{content}</code>
      </pre>
    </div>
  )
}
