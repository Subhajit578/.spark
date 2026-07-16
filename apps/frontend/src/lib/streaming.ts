import type { Step } from '../types';
import { StepType } from '../types';

const PARSE_DEBOUNCE_MS = 200;

export function createStreamParser(onParse: () => void) {
  let lastParse = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule() {
      const now = Date.now();
      const elapsed = now - lastParse;

      if (elapsed >= PARSE_DEBOUNCE_MS) {
        lastParse = now;
        onParse();
        return;
      }

      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(() => {
        lastParse = Date.now();
        timer = null;
        onParse();
      }, PARSE_DEBOUNCE_MS - elapsed);
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      onParse();
    },
  };
}

export function withStreamingStatus(steps: Step[], streaming: boolean): Step[] {
  if (!streaming) {
    return steps;
  }

  let lastFileIndex = -1;
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    if (steps[i]?.type === StepType.CreateFile) {
      lastFileIndex = i;
      break;
    }
  }

  if (lastFileIndex === -1) {
    return steps;
  }

  return steps.map((step, index) =>
    index === lastFileIndex
      ? { ...step, status: 'in-progress' as const }
      : step
  );
}
