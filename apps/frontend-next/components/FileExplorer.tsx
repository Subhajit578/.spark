'use client'
import { useState } from 'react'
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react'
import type { FileNode } from '@/hooks/useFiles'

interface Props {
  files: FileNode[]
  onSelect: (path: string) => void
  selectedPath: string | null
}

function FileTree({ nodes, onSelect, selectedPath, depth = 0 }: {
  nodes: FileNode[]
  onSelect: (path: string) => void
  selectedPath: string | null
  depth?: number
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({})

  return (
    <>
      {nodes.map(node => (
        <div key={node.path}>
          {node.type === 'directory' ? (
            <>
              <button
                onClick={() => setOpen(o => ({ ...o, [node.path]: !o[node.path] }))}
                className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                style={{ paddingLeft: `${8 + depth * 12}px` }}
              >
                {open[node.path] ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                <Folder className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                {node.name}
              </button>
              {open[node.path] && node.children && (
                <FileTree nodes={node.children} onSelect={onSelect} selectedPath={selectedPath} depth={depth + 1} />
              )}
            </>
          ) : (
            <button
              onClick={() => onSelect(node.path)}
              className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm transition-colors ${
                selectedPath === node.path
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              style={{ paddingLeft: `${8 + depth * 12}px` }}
            >
              <File className="h-3.5 w-3.5 shrink-0" />
              {node.name}
            </button>
          )}
        </div>
      ))}
    </>
  )
}

export function FileExplorer({ files, onSelect, selectedPath }: Props) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Folder className="h-8 w-8 text-zinc-700" />
        <p className="text-sm text-zinc-600">Files will appear here once generation is complete</p>
      </div>
    )
  }

  return (
    <div className="py-2">
      <FileTree nodes={files} onSelect={onSelect} selectedPath={selectedPath} />
    </div>
  )
}
