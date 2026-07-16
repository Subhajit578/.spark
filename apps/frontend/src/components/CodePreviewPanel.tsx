import { useEffect, useMemo, useState } from 'react';
import { Code2, Eye } from 'lucide-react';
import type { useWebContainer } from '../hooks/useWebContainer';
import { buildFileTree, findFileByPath } from '../lib/fileTree';
import { stepsToFiles } from '../lib/parseArtifact';
import type { Step } from '../types';
import { FileExplorer } from './FileExplorer';
import { FileViewer } from './FileViewer';
import { PreviewPanel } from './PreviewPanel';

interface CodePreviewPanelProps {
  steps: Step[];
  preview: ReturnType<typeof useWebContainer>;
  previewReady: boolean;
}

type Tab = 'code' | 'preview';

export function CodePreviewPanel({ steps, preview, previewReady }: CodePreviewPanelProps) {
  const [tab, setTab] = useState<Tab>('code');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const files = useMemo(() => stepsToFiles(steps), [steps]);
  const tree = useMemo(() => buildFileTree(files), [files]);
  const filePaths = useMemo(() => Object.keys(files).sort(), [files]);
  const { previewUrl, loading, error, status } = preview;

  useEffect(() => {
    if (filePaths.length === 0) {
      setSelectedPath(null);
      return;
    }
    if (!selectedPath || files[selectedPath] === undefined) {
      setSelectedPath(filePaths[0]);
    }
  }, [files, filePaths, selectedPath]);

  const selectedFile = selectedPath ? findFileByPath(tree, selectedPath) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-zinc-800 bg-zinc-900/50">
        <button
          type="button"
          onClick={() => setTab('code')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'code'
              ? 'border-violet-500 text-violet-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Code2 className="h-4 w-4" />
          Code
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === 'preview'
              ? 'border-violet-500 text-violet-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Eye className="h-4 w-4" />
          Preview
          {loading && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          )}
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'code' ? (
          <div className="flex h-full">
            <div className="w-56 shrink-0">
              <FileExplorer
                tree={tree}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
              />
            </div>
            <div className="min-w-0 flex-1">
              <FileViewer
                file={selectedFile}
                onClose={() => setSelectedPath(null)}
              />
            </div>
          </div>
        ) : (
          <PreviewPanel
            previewUrl={previewUrl}
            loading={loading}
            error={error}
            status={status}
            hasFiles={filePaths.length > 0}
            previewReady={previewReady}
          />
        )}
      </div>
    </div>
  );
}
