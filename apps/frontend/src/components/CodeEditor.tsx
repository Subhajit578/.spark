import Editor from '@monaco-editor/react';
import { getLanguageFromPath } from '../lib/fileTree';

interface CodeEditorProps {
  path: string | null;
  content: string;
}

export function CodeEditor({ path, content }: CodeEditorProps) {
  const language = path ? getLanguageFromPath(path) : 'plaintext';

  return (
    <Editor
      height="100%"
      language={language}
      value={content}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        renderLineHighlight: 'line',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    />
  );
}
