export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface TemplateResponse {
  prompts: string[];
  uiPrompts: string[];
}

export interface ChatResponse {
  text: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function fetchTemplate(prompt: string): Promise<TemplateResponse> {
  const res = await fetch(`${API_BASE}/template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to determine project template');
  }

  return res.json();
}

export async function sendChat(messages: ChatMessage[]): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to generate project');
  }

  return res.json();
}

export async function streamChat(
  messages: ChatMessage[],
  onChunk: (chunk: string, fullText: string) => void,
  signal?: AbortSignal
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to generate project');
  }

  if (!res.body) {
    throw new Error('Streaming is not supported in this browser');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) {
        continue;
      }

      const payload = JSON.parse(line.slice(6)) as {
        type: string;
        text?: string;
        message?: string;
      };

      if (payload.type === 'text' && payload.text) {
        fullText += payload.text;
        onChunk(payload.text, fullText);
      } else if (payload.type === 'error') {
        throw new Error(payload.message ?? 'Streaming failed');
      }
    }
  }

  return { text: fullText };
}

export function buildInitialMessages(
  template: TemplateResponse,
  userPrompt: string
): ChatMessage[] {
  const messages: ChatMessage[] = template.prompts.map((content) => ({
    role: 'user',
    content,
  }));

  messages.push({ role: 'user', content: userPrompt });
  return messages;
}
