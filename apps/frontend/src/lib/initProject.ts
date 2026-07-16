import {
  buildInitialMessages,
  fetchTemplate,
  streamChat,
} from '../api/client';
import type { ChatMessage } from '../api/client';
import type { Step } from '../types';
import {
  countFileSteps,
  getProjectTitle,
  mergeSteps,
  parseXML,
} from './parseArtifact';
import { createStreamParser } from './streaming';

export interface InitProjectStreamUpdate {
  text: string;
  steps: Step[];
  title: string;
}

export interface InitProjectOptions {
  onStream?: (update: InitProjectStreamUpdate) => void;
  signal?: AbortSignal;
}

export interface InitProjectResult {
  title: string;
  steps: Step[];
  messages: ChatMessage[];
}

export async function initProject(
  prompt: string,
  options?: InitProjectOptions
): Promise<InitProjectResult> {
  const template = await fetchTemplate(prompt);

  const baseSteps = template.uiPrompts.flatMap((uiPrompt) => parseXML(uiPrompt));
  const messages = buildInitialMessages(template, prompt);

  options?.onStream?.({
    text: '',
    steps: baseSteps,
    title: getProjectTitle(baseSteps),
  });

  let latestSteps = baseSteps;
  let latestTitle = getProjectTitle(baseSteps);

  const parser = createStreamParser(() => {
    try {
      const chatSteps = parseXML(parserText);
      latestSteps = mergeSteps(baseSteps, chatSteps);
      latestTitle = getProjectTitle(latestSteps);
      options?.onStream?.({
        text: parserText,
        steps: latestSteps,
        title: latestTitle,
      });
    } catch {
      // Partial XML while streaming — wait for more tokens.
    }
  });

  let parserText = '';
  const { text } = await streamChat(
    messages,
    (_chunk, fullText) => {
      parserText = fullText;
      parser.schedule();
    },
    options?.signal
  );

  parser.flush();

  const chatSteps = parseXML(text);

  if (countFileSteps(chatSteps) === 0) {
    throw new Error(
      'The AI response did not include any project files. Try again or use a simpler prompt.'
    );
  }

  const steps = mergeSteps(baseSteps, chatSteps);

  return {
    title: getProjectTitle(steps),
    steps,
    messages: [...messages, { role: 'assistant', content: text }],
  };
}
