import { X } from 'lucide-react';
import type { FileViewerProps } from '../types';
import { CodeEditor } from './CodeEditor';

export function FileViewer({ file, onClose }: FileViewerProps) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Select a file to view its contents
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="truncate font-mono text-xs text-zinc-400">{file.path}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          aria-label="Close file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <CodeEditor path={file.path} content={file.content ?? ''} />
      </div>
    </div>
  );
}
