import { Loader2 } from 'lucide-react';

interface PreviewPanelProps {
  previewUrl: string | null;
  loading: boolean;
  error: string | null;
  status: string | null;
  hasFiles: boolean;
  previewReady: boolean;
}

export function PreviewPanel({
  previewUrl,
  loading,
  error,
  status,
  hasFiles,
  previewReady,
}: PreviewPanelProps) {
  if (!hasFiles) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Generate a project to see the preview
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!previewReady && hasFiles) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        <p>Waiting for generation to finish...</p>
        <p className="text-xs text-zinc-600">
          Preview starts once all files are ready
        </p>
      </div>
    );
  }

  if (loading || !previewUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        <p>{status ?? 'Starting dev server...'}</p>
        <p className="text-xs text-zinc-600">
          This can take a minute on first run while npm installs packages
        </p>
      </div>
    );
  }

  return (
    <iframe
      title="Website preview"
      src={previewUrl}
      className="h-full w-full border-0 bg-white"
    />
  );
}
