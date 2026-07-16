import { useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Download, Sparkles } from 'lucide-react';
import { CodePreviewPanel } from '../components/CodePreviewPanel';
import { StepsPanel } from '../components/StepsPanel';
import { useProject } from '../context/ProjectContext';
import { useWebContainer } from '../hooks/useWebContainer';
import { downloadProjectZip } from '../lib/downloadProject';
import { sendFollowUp } from '../lib/followUp';
import { initProject } from '../lib/initProject';
import { withStreamingStatus } from '../lib/streaming';
import { countFileSteps } from '../lib/parseArtifact';

export function BuilderPage() {
  const navigate = useNavigate();
  const { state, setState } = useProject();
  const previewReady =
    state.initialized && !state.loading && !state.followUpLoading;
  const streaming = state.loading || state.followUpLoading;
  const displaySteps = withStreamingStatus(state.steps, streaming);
  const preview = useWebContainer(state.steps, previewReady);

  useEffect(() => {
    if (!state.prompt) {
      navigate('/');
      return;
    }

    if (state.initialized) {
      return;
    }

    const abortController = new AbortController();
    let cancelled = false;

    async function generate() {
      try {
        setState((s) => ({ ...s, loading: true, error: null }));

        const { title, steps, messages } = await initProject(state.prompt, {
          signal: abortController.signal,
          onStream: ({ steps: streamedSteps, title: streamedTitle }) => {
            if (cancelled) return;
            setState((s) => ({
              ...s,
              steps: streamedSteps,
              title: streamedTitle,
            }));
          },
        });

        if (cancelled) return;

        setState((s) => ({
          ...s,
          loading: false,
          initialized: true,
          title,
          steps,
          messages,
        }));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Something went wrong',
        }));
      }
    }

    generate();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [state.prompt, state.initialized, navigate, setState]);

  const handleFollowUp = useCallback(
    async (message: string) => {
      if (!state.initialized || state.loading || state.followUpLoading) {
        return;
      }

      const abortController = new AbortController();

      try {
        setState((s) => ({ ...s, followUpLoading: true, error: null }));

        const { steps, messages } = await sendFollowUp(
          state.messages,
          message,
          state.steps,
          {
            signal: abortController.signal,
            onStream: ({ steps: streamedSteps }) => {
              setState((s) => ({
                ...s,
                steps: streamedSteps,
              }));
            },
          }
        );

        setState((s) => ({
          ...s,
          followUpLoading: false,
          steps,
          messages,
        }));
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setState((s) => ({
          ...s,
          followUpLoading: false,
          error: err instanceof Error ? err.message : 'Follow-up failed',
        }));
      }
    },
    [
      state.initialized,
      state.loading,
      state.followUpLoading,
      state.messages,
      state.steps,
      setState,
    ]
  );

  const handleDownload = useCallback(async () => {
    try {
      await downloadProjectZip(state.steps, state.title);
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : 'Download failed',
      }));
    }
  }, [state.steps, state.title, setState]);

  if (!state.prompt) {
    return null;
  }

  const canDownload =
    state.initialized && !state.loading && countFileSteps(state.steps) > 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-zinc-800 bg-zinc-950 px-4 py-2.5">
        <Link
          to="/"
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
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">
          {state.title}
        </span>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!canDownload}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </header>

      {state.error && (
        <div className="flex items-center gap-2 border-b border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_1fr]">
        <StepsPanel
          steps={displaySteps}
          title={state.title}
          prompt={state.prompt}
          loading={state.loading}
          followUpLoading={state.followUpLoading}
          initialized={state.initialized}
          onFollowUp={handleFollowUp}
        />
        <CodePreviewPanel
          steps={state.steps}
          preview={preview}
          previewReady={previewReady}
        />
      </div>
    </div>
  );
}
