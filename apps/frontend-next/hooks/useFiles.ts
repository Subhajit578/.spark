'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export function useFiles(projectId: string, isDone: boolean) {
  const [files, setFiles] = useState<FileNode[]>([])

  useEffect(() => {
    if (!isDone) return
    api.getFiles(projectId)
      .then(res => setFiles(res.data.files))
      .catch(() => {})
  }, [projectId, isDone])

  async function getContent(filePath: string): Promise<string> {
    const res = await api.getFileContent(projectId, filePath)
    return res.data.content
  }

  return { files, getContent }
}
