'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import { isAuthenticated, getEmail } from '@/lib/auth'
import Link from 'next/link'

const examples = [
  'A landing page for a coffee shop with menu and location',
  'A portfolio site for a photographer with a gallery grid',
  'A SaaS pricing page with three tiers and FAQ',
]

export default function LandingPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setEmail(getEmail())
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = prompt.trim()
    if (!trimmed) return

    if (!isAuthenticated()) {
      sessionStorage.setItem('pending_prompt', trimmed)
      router.push('/signin')
      return
    }

    setLoading(true)
    try {
      const res = await api.createProject(trimmed)
      const { projectId } = res.data
      api.sendPrompt(projectId, trimmed)
      router.push(`/project/${projectId}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-indigo-600/10 blur-[100px]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Spark</span>
        </div>
        <div className="flex items-center gap-3">
          {email ? (
            <span className="text-sm text-zinc-400">{email}</span>
          ) : (
            <>
              <Link href="/signin" className="text-sm text-zinc-400 transition-colors hover:text-zinc-200">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-20 pt-8">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
          <Zap className="h-3.5 w-3.5" />
          Build websites with AI
        </div>

        <h1 className="max-w-3xl text-center text-4xl font-bold tracking-tight text-zinc-50 md:text-6xl">
          What do you want to{' '}
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            create
          </span>{' '}
          today?
        </h1>

        <p className="mt-4 max-w-xl text-center text-lg text-zinc-400">
          Describe your website and Spark will generate the code, files, and run everything for you.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 w-full max-w-2xl">
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 p-2 shadow-2xl shadow-violet-950/20 backdrop-blur-sm">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) } }}
              placeholder="Describe the website you want to build..."
              rows={3}
              className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-xs text-zinc-600">Shift + Enter for new line</span>
              <button
                type="submit"
                disabled={!prompt.trim() || loading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? 'Creating...' : 'Create'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {examples.map(example => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              className="rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
            >
              {example}
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
