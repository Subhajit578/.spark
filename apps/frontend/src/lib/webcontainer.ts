import { WebContainer } from '@webcontainer/api';
import type { FileSystemTree, WebContainer as WebContainerInstance } from '@webcontainer/api';

export function filesToFileSystemTree(
  files: Record<string, string>
): FileSystemTree {
  const root: FileSystemTree = {};

  for (const [filePath, contents] of Object.entries(files)) {
    const parts = filePath.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;

      if (isFile) {
        current[part] = { file: { contents } };
      } else {
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        const node = current[part];
        if ('directory' in node) {
          current = node.directory;
        }
      }
    }
  }

  return root;
}

function patchViteConfig(config: string): string {
  let next = config;

  if (!next.includes('host:') && !next.includes("host :")) {
    if (next.includes('server:')) {
      next = next.replace(/server:\s*\{/, "server: {\n    host: '0.0.0.0',");
    } else {
      next = next.replace(
        /defineConfig\(\{/,
        "defineConfig({\n  server: {\n    host: '0.0.0.0',\n    port: 5173,\n  },"
      );
    }
  }

  if (!next.includes('port:') && !next.includes('port :')) {
    if (next.includes('server:')) {
      next = next.replace(
        /server:\s*\{/,
        "server: {\n    port: 5173,"
      );
    }
  }

  return next;
}

function patchPackageJson(content: string): string {
  try {
    const pkg = JSON.parse(content) as {
      scripts?: Record<string, string>;
    };

    if (pkg.scripts?.dev?.includes('vite')) {
      pkg.scripts.dev = 'vite --host 0.0.0.0 --port 5173';
    }

    return JSON.stringify(pkg, null, 2);
  } catch {
    return content;
  }
}

export function prepareFilesForWebContainer(
  files: Record<string, string>
): Record<string, string> {
  const prepared = { ...files };

  const viteConfigPath = Object.keys(prepared).find((path) =>
    /vite\.config\.(ts|js|mjs)$/.test(path)
  );

  if (viteConfigPath) {
    prepared[viteConfigPath] = patchViteConfig(prepared[viteConfigPath]);
  }

  const packageJsonPath = Object.keys(prepared).find(
    (path) => path === 'package.json' || path.endsWith('/package.json')
  );

  if (packageJsonPath) {
    prepared[packageJsonPath] = patchPackageJson(prepared[packageJsonPath]);
  }

  return prepared;
}

let bootPromise: Promise<WebContainer> | null = null;

export function bootWebContainer() {
  if (!bootPromise) {
    bootPromise = WebContainer.boot({ coep: 'credentialless' });
  }
  return bootPromise;
}

export async function teardownWebContainer() {
  if (bootPromise) {
    try {
      const instance = await bootPromise;
      instance.teardown();
    } catch {
      // Ignore teardown errors from a failed boot.
    }
  }
  bootPromise = null;
}

export async function syncFilesToContainer(
  container: WebContainerInstance,
  files: Record<string, string>
) {
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/').filter(Boolean);
    if (parts.length > 1) {
      await container.fs.mkdir(parts.slice(0, -1).join('/'), {
        recursive: true,
      });
    }

    await container.fs.writeFile(path, content);
  }
}

export function extractPreviewUrl(output: string): string | null {
  const patterns = [
    /https?:\/\/[^\s]*\.webcontainer-api\.io[^\s]*/i,
    /Network:\s*(https?:\/\/[^\s]+)/i,
    /https?:\/\/[a-zA-Z0-9.-]+:\d+\/?/,
    /Local:\s*(https?:\/\/[^\s]+)/i,
    /➜\s+Local:\s*(https?:\/\/[^\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = output.match(pattern);
    if (match) {
      return (match[1] ?? match[0]).trim();
    }
  }

  return null;
}
