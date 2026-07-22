'use client'
import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Sparkles, CheckCircle, Loader2, Code2, Globe, Monitor, Download } from 'lucide-react'
import { useActions } from '@/hooks/useActions'
import { usePrompts } from '@/hooks/usePrompts'
import { api } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'

type Tab = 'editor' | 'preview'

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const [followUp, setFollowUp] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('editor')
  const actionsEndRef = useRef<HTMLDivElement>(null)

  const { actions, isDone } = useActions(projectId)
  const { prompts, machineIp } = usePrompts(projectId)

  useEffect(() => {
    if (!isAuthenticated()) router.push('/signin')
  }, [router])

  useEffect(() => {
    actionsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [actions])

  async function handleFollowUp(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = followUp.trim()
    if (!trimmed || sending) return
    setSending(true)
    setFollowUp('')
    try {
      if (machineIp) {
        await api.sendPromptToMachine(projectId, trimmed, machineIp)
      } else {
        await api.sendPrompt(projectId, trimmed)
      }
    } finally {
      setSending(false)
    }
  }

  const userPrompts = prompts.filter(p => p.type === 'USER')

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <header className="flex shrink-0 items-center gap-4 border-b border-zinc-800 px-4 py-2.5">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-600">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-semibold">Spark</span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-3">
          {machineIp && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Monitor className="h-3.5 w-3.5" />
              {machineIp}
            </span>
          )}
          {isDone ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle className="h-3.5 w-3.5" />
              Done
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating...
            </span>
          )}
          {isDone && machineIp && (
            <a
              href={`http://${machineIp}:3001/v1/files/${projectId}/download`}
              download="project.zip"
              className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left panel — chat + actions */}
        <div className="flex w-80 shrink-0 flex-col border-r border-zinc-800">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">Chat</p>
              <div className="space-y-2">
                {userPrompts.map(p => (
                  <div key={p.id} className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                    {p.content}
                  </div>
                ))}
              </div>
            </div>

            {actions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">Actions</p>
                <div className="space-y-1">
                  {actions.map(a => (
                    <div key={a.id} className={`flex items-start gap-2 text-xs ${a.content === 'Done!' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {a.content === 'Done!'
                        ? <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        : <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                      }
                      {a.content}
                    </div>
                  ))}
                  <div ref={actionsEndRef} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-800 p-3">
            <form onSubmit={handleFollowUp} className="flex gap-2">
              <input
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                placeholder="Ask a follow-up..."
                disabled={sending}
                className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!followUp.trim() || sending}
                className="flex items-center justify-center rounded-lg bg-violet-600 p-2 text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right panel — iframes */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Tab bar */}
          <div className="flex shrink-0 items-center gap-1 border-b border-zinc-800 bg-zinc-900/50 px-3 py-1.5">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'editor'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Code Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'preview'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>

          {/* iframe area */}
          <div className="relative flex-1">
            {!machineIp ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-zinc-700" />
                  <p className="text-sm text-zinc-500">Waiting for machine to be assigned...</p>
                </div>
              </div>
            ) : (
              <>
                <iframe
                  key={`editor-${machineIp}`}
                  src={`https://editor-${machineIp.replace(/\./g, '-')}.spark.subhajitdev.site`}
                  className="absolute inset-0 h-full w-full border-0"
                  style={{ zIndex: activeTab === 'editor' ? 1 : 0 }}
                  title="Code Editor"
                />
                <iframe
                  key={`preview-${machineIp}-${isDone}`}
                  src={`https://preview-${machineIp.replace(/\./g, '-')}.spark.subhajitdev.site`}
                  className="absolute inset-0 h-full w-full border-0"
                  style={{ zIndex: activeTab === 'preview' ? 1 : 0 }}
                  title="Live Preview"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
