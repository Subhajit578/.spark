'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface Action {
  id: string
  content: string
  createdAt: string
}

export function useActions(projectId: string) {
  const [actions, setActions] = useState<Action[]>([])

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.getActions(projectId)
        setActions(res.data.actions)
      } catch {}
    }
    fetch()
    const interval = setInterval(fetch, 1000)
    return () => clearInterval(interval)
  }, [projectId])

  const isDone = actions.some(a => a.content === 'Done!')
  return { actions, isDone }
}
