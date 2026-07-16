import { Step, StepType } from '../types';

function decodeContent(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

// Leaked LLM markup that must not end up in source files.
const LEAKED_MARKUP_PATTERN =
  /<\/?(?:boltAction|boltArtifact)\b[^>]*>|<\/?(?:parameter|artifact)>/gi;

function findLeakedMarkupIndex(text: string): number {
  LEAKED_MARKUP_PATTERN.lastIndex = 0;
  const match = LEAKED_MARKUP_PATTERN.exec(text);
  LEAKED_MARKUP_PATTERN.lastIndex = 0;
  return match ? match.index : -1;
}

function sanitizeFileContent(code: string): string {
  const tagIndex = findLeakedMarkupIndex(code);
  const cleaned = tagIndex === -1 ? code : code.slice(0, tagIndex);
  return cleaned.trimEnd();
}

function isLikelyCorruptedSource(code: string): boolean {
  if (findLeakedMarkupIndex(code) !== -1) {
    return true;
  }

  // className="...">{expr}"> — ternary leaked outside the attribute
  if (/className="[^"]*">\{[^}]+\}">/.test(code)) {
    return true;
  }

  return false;
}

function extractArtifactContent(response: string): { title: string; content: string } {
  const closedMatch = response.match(
    /<boltArtifact[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/boltArtifact>/i
  );
  if (closedMatch) {
    return { title: closedMatch[1], content: closedMatch[2] };
  }

  const openMatch = response.match(
    /<boltArtifact[^>]*title="([^"]*)"[^>]*>([\s\S]*)/i
  );
  if (openMatch) {
    return { title: openMatch[1], content: openMatch[2] };
  }

  return { title: 'Project Files', content: response };
}

interface ParsedAction {
  attrs: string;
  body: string;
}

function findActionBodyEnd(rest: string): number {
  let end = rest.length;

  const patterns = [
    /<\/boltAction>/i,
    /<\/parameter>/i,
    /<\/artifact>/i,
    /<\/boltArtifact>/i,
    /<boltAction\s/i,
  ];

  for (const pattern of patterns) {
    const index = rest.search(pattern);
    if (index !== -1 && index < end) {
      end = index;
    }
  }

  return end;
}

function parseActionAttrs(attrs: string): { type: string; path?: string } {
  const type = attrs.match(/type="([^"]+)"/)?.[1] ?? 'file';
  const path =
    attrs.match(/filePath="([^"]+)"/)?.[1] ??
    attrs.match(/filePath='([^']+)'/)?.[1];

  return { type, path };
}

function extractBoltActions(content: string): ParsedAction[] {
  const actions: ParsedAction[] = [];
  const closedRegex =
    /<boltAction\s+([^>]*)>([\s\S]*?)(?:<\/boltAction>|<\/parameter>|<\/artifact>)/gi;
  let match: RegExpExecArray | null;

  while ((match = closedRegex.exec(content)) !== null) {
    actions.push({
      attrs: match[1],
      body: match[2].trim(),
    });
  }

  if (actions.length > 0) {
    return actions;
  }

  const openRegex = /<boltAction\s+([^>]*)>/gi;
  let openMatch: RegExpExecArray | null;

  while ((openMatch = openRegex.exec(content)) !== null) {
    const bodyStart = openMatch.index + openMatch[0].length;
    const rest = content.slice(bodyStart);

    actions.push({
      attrs: openMatch[1],
      body: rest.slice(0, findActionBodyEnd(rest)).trim(),
    });
  }

  return actions;
}

export function parseXML(response: string): Step[] {
  const steps: Step[] = [];
  let id = 1;

  const { title, content } = extractArtifactContent(response);

  steps.push({
    id: id++,
    title,
    description: '',
    type: StepType.CreateFolder,
    status: 'pending',
  });

  for (const action of extractBoltActions(content)) {
    const { type, path } = parseActionAttrs(action.attrs);
    const code = sanitizeFileContent(decodeContent(action.body));

    if (type === 'file') {
      if (!path || !code) {
        continue;
      }

      steps.push({
        id: id++,
        title: `Create ${path}`,
        description: '',
        type: StepType.CreateFile,
        status: 'pending',
        code,
        path,
      });
    } else if (type === 'shell') {
      steps.push({
        id: id++,
        title: code.split('\n')[0] || 'Run command',
        description: '',
        type: StepType.RunScript,
        status: 'pending',
        code,
      });
    }
  }

  return steps;
}

export function mergeSteps(
  base: Step[],
  generated: Step[],
  options?: { rejectCorruptedUpdates?: boolean }
): Step[] {
  const rejectCorrupted = options?.rejectCorruptedUpdates ?? false;
  const fileSteps = new Map<string, Step>();
  const scriptSteps: Step[] = [];
  let folderStep = base.find((step) => step.type === StepType.CreateFolder);

  const collect = (steps: Step[]) => {
    for (const step of steps) {
      if (step.type === StepType.CreateFolder) {
        folderStep = step;
      } else if (step.type === StepType.CreateFile && step.path) {
        const existing = fileSteps.get(step.path);
        if (
          rejectCorrupted &&
          existing?.code &&
          step.code &&
          isLikelyCorruptedSource(step.code)
        ) {
          console.warn(
            `[parseArtifact] Skipping corrupted update for ${step.path}`
          );
          continue;
        }
        fileSteps.set(step.path, step);
      } else if (step.type === StepType.RunScript) {
        scriptSteps.push(step);
      }
    }
  };

  collect(base);
  collect(generated);

  const merged: Step[] = [];
  let mergeId = 1;

  if (folderStep) {
    merged.push({ ...folderStep, id: mergeId++ });
  }

  for (const step of [...fileSteps.values()].sort((a, b) =>
    (a.path ?? '').localeCompare(b.path ?? '')
  )) {
    merged.push({ ...step, id: mergeId++ });
  }

  for (const step of scriptSteps) {
    merged.push({ ...step, id: mergeId++ });
  }

  return merged;
}

export function stepsToFiles(steps: Step[]): Record<string, string> {
  const files: Record<string, string> = {};

  for (const step of steps) {
    if (step.type === StepType.CreateFile && step.path && step.code !== undefined) {
      files[step.path] = sanitizeFileContent(step.code);
    }
  }

  return files;
}

export function getProjectTitle(steps: Step[]): string {
  return (
    steps.find((step) => step.type === StepType.CreateFolder)?.title ??
    'New Project'
  );
}

export function countFileSteps(steps: Step[]): number {
  return steps.filter((step) => step.type === StepType.CreateFile && step.path).length;
}
