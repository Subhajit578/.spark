import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
} from 'lucide-react';
import type { FileItem } from '../types';

interface FileExplorerProps {
  tree: FileItem[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileItem;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isSelected = selectedPath === node.path;
  const isFolder = node.type === 'folder';

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (isFolder) {
            setExpanded((e) => !e);
          } else {
            onSelect(node.path);
          }
        }}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm transition-colors ${
          isSelected
            ? 'bg-violet-500/20 text-violet-300'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          <>
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            )}
            {expanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-amber-400/80" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-amber-400/80" />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <File className="h-4 w-4 shrink-0 text-blue-400/80" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isFolder && expanded && node.children?.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function FileExplorer({ tree, selectedPath, onSelect }: FileExplorerProps) {
  return (
    <div className="flex h-full flex-col border-r border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Files
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <p className="px-3 py-4 text-sm text-zinc-600">No files yet</p>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
