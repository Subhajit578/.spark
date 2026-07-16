'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface Prompt {
  id: string
  content: string
  type: 'USER' | 'SYSTEM'
  createdAt: string
}

export function usePrompts(projectId: string) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [machineIp, setMachineIp] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      try {
        const res = await api.getPrompts(projectId)
        setPrompts(res.data.prompts)
        if (res.data.machineIp) setMachineIp(res.data.machineIp)
      } catch {}
    }
    fetch()
    const interval = setInterval(fetch, 1000)
    return () => clearInterval(interval)
  }, [projectId])

  return { prompts, machineIp }
}
