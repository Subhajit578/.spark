import type { ChatMessage } from '../api/client';
import { streamChat } from '../api/client';
import type { Step } from '../types';
import { mergeSteps, parseXML, stepsToFiles } from './parseArtifact';
import { createStreamParser } from './streaming';

const WORK_DIR = '/home/project';
const FILE_MODIFICATIONS_TAG = 'bolt_file_modifications';

function stripPreviousFileModifications(content: string): string {
  const pattern = new RegExp(
    `<${FILE_MODIFICATIONS_TAG}>[\\s\\S]*?</${FILE_MODIFICATIONS_TAG}>\\s*`,
    'i'
  );
  return content.replace(pattern, '').trim();
}

export function buildFollowUpContent(
  followUpPrompt: string,
  currentSteps: Step[]
): string {
  const files = stepsToFiles(currentSteps);
  const paths = Object.keys(files).sort();

  const fileBlocks = paths
    .map(
      (path) => `<file path="${WORK_DIR}/${path}">\n${files[path]}\n</file>`
    )
    .join('\n\n');

  const modifications =
    paths.length > 0
      ? `<${FILE_MODIFICATIONS_TAG}>\n${fileBlocks}\n</${FILE_MODIFICATIONS_TAG}>\n\n`
      : '';

  return `${modifications}${followUpPrompt}`;
}

export interface FollowUpStreamUpdate {
  text: string;
  steps: Step[];
}

export interface FollowUpOptions {
  onStream?: (update: FollowUpStreamUpdate) => void;
  signal?: AbortSignal;
}

export async function sendFollowUp(
  messages: ChatMessage[],
  followUpPrompt: string,
  currentSteps: Step[],
  options?: FollowUpOptions
): Promise<{ steps: Step[]; messages: ChatMessage[] }> {
  const userContent = buildFollowUpContent(followUpPrompt, currentSteps);

  const apiMessages: ChatMessage[] = [
    ...messages.map((message) =>
      message.role === 'user'
        ? {
            ...message,
            content: stripPreviousFileModifications(message.content),
          }
        : message
    ),
    { role: 'user', content: userContent },
  ];

  let parserText = '';
  const parser = createStreamParser(() => {
    try {
      const chatSteps = parseXML(parserText);
      const steps = mergeSteps(currentSteps, chatSteps, {
        rejectCorruptedUpdates: true,
      });
      options?.onStream?.({ text: parserText, steps });
    } catch {
      // Partial XML while streaming.
    }
  });

  const { text } = await streamChat(
    apiMessages,
    (_chunk, fullText) => {
      parserText = fullText;
      parser.schedule();
    },
    options?.signal
  );

  parser.flush();

  const chatSteps = parseXML(text);
  const steps = mergeSteps(currentSteps, chatSteps, {
    rejectCorruptedUpdates: true,
  });

  return {
    steps,
    messages: [
      ...messages,
      { role: 'user', content: userContent },
      { role: 'assistant', content: text },
    ],
  };
}
