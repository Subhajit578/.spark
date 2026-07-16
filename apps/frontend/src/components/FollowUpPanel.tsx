import { useState } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';

interface FollowUpPanelProps {
  onSubmit: (message: string) => void;
  loading: boolean;
  disabled: boolean;
}

export function FollowUpPanel({ onSubmit, loading, disabled }: FollowUpPanelProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading || disabled) return;

    onSubmit(trimmed);
    setInput('');
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/50 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Follow up
      </p>
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Ask for changes..."
          rows={2}
          disabled={disabled || loading}
          className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 pr-12 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || disabled}
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send follow-up"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </form>
      <p className="mt-1.5 text-[11px] text-zinc-600">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
