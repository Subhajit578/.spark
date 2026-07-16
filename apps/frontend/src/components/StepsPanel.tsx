import {
  CheckCircle2,
  Circle,
  FileCode2,
  Folder,
  Loader2,
  Terminal,
} from 'lucide-react';
import type { Step } from '../types';
import { StepType } from '../types';
import { FollowUpPanel } from './FollowUpPanel';

interface StepsPanelProps {
  steps: Step[];
  title: string;
  prompt: string;
  loading: boolean;
  followUpLoading: boolean;
  initialized: boolean;
  onFollowUp: (message: string) => void;
}

function StepIcon({ step }: { step: Step }) {
  if (step.status === 'in-progress') {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-400" />;
  }
  if (step.status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />;
  }
  return <Circle className="h-4 w-4 shrink-0 text-zinc-600" />;
}

function StepTypeIcon({ type }: { type: StepType }) {
  if (type === StepType.RunScript) {
    return <Terminal className="h-3 w-3 shrink-0 text-zinc-500" />;
  }
  if (type === StepType.CreateFolder) {
    return <Folder className="h-3 w-3 shrink-0 text-zinc-500" />;
  }
  return <FileCode2 className="h-3 w-3 shrink-0 text-zinc-500" />;
}

export function StepsPanel({
  steps,
  title,
  prompt,
  loading,
  followUpLoading,
  initialized,
  onFollowUp,
}: StepsPanelProps) {
  return (
    <div className="flex h-full flex-col border-r border-zinc-800 bg-zinc-900/30">
      <div className="border-b border-zinc-800 p-4">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-violet-500" />
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Spark
          </span>
        </div>
        <h2 className="truncate text-sm font-semibold text-zinc-100">{title}</h2>
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-500">
          {prompt}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Steps
        </p>

        {loading && steps.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-4 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            Generating your website...
          </div>
        ) : (
          <>
            {loading && steps.length > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Streaming files into your project...
              </div>
            )}
            <ul className="space-y-1">
            {steps.map((step, i) => (
              <li
                key={step.id}
                className="flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-zinc-800 hover:bg-zinc-900/50"
              >
                <StepIcon step={step} />
                <div className="min-h-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <StepTypeIcon type={step.type} />
                    <span className="text-xs text-zinc-500">Step {i + 1}</span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-zinc-300">
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="mt-0.5 text-xs text-zinc-500">{step.description}</p>
                  )}
                  {step.code && step.type === StepType.RunScript && (
                    <code className="mt-1 block truncate rounded bg-zinc-950 px-2 py-1 font-mono text-xs text-zinc-500">
                      {step.code}
                    </code>
                  )}
                </div>
              </li>
            ))}
            </ul>
          </>
        )}

        {followUpLoading && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Streaming updates...
          </div>
        )}
      </div>

      <FollowUpPanel
        onSubmit={onFollowUp}
        loading={followUpLoading}
        disabled={!initialized || loading}
      />
    </div>
  );
}
