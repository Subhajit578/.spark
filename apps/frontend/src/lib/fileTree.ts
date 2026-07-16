import type { FileItem } from '../types';

export function buildFileTree(files: Record<string, string>): FileItem[] {
  const root: FileItem[] = [];
  const sortedPaths = Object.keys(files).sort((a, b) => a.localeCompare(b));

  for (const filePath of sortedPaths) {
    const parts = filePath.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const path = parts.slice(0, i + 1).join('/');
      const isFile = i === parts.length - 1;

      let node = current.find((item) => item.name === name);

      if (!node) {
        node = {
          name,
          path,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
          content: isFile ? files[filePath] : undefined,
        };
        current.push(node);
      } else if (isFile) {
        node.content = files[filePath];
      }

      if (!isFile && node.children) {
        current = node.children;
      }
    }
  }

  const sortNodes = (nodes: FileItem[]): FileItem[] =>
    nodes
      .map((node) =>
        node.children ? { ...node, children: sortNodes(node.children) } : node
      )
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

  return sortNodes(root);
}

export function findFileByPath(
  tree: FileItem[],
  path: string
): FileItem | null {
  for (const node of tree) {
    if (node.path === path && node.type === 'file') {
      return node;
    }
    if (node.children) {
      const found = findFileByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'markdown',
    svg: 'xml',
    yml: 'yaml',
    yaml: 'yaml',
  };
  return map[ext ?? ''] ?? 'plaintext';
}
