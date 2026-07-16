import type { Plugin } from 'vite';

export function crossOriginIsolation(): Plugin {
  const applyHeaders = (
    _req: unknown,
    res: { setHeader: (name: string, value: string) => void },
    next: () => void
  ) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    next();
  };

  return {
    name: 'cross-origin-isolation',
    configureServer(server) {
      server.middlewares.use(applyHeaders);
    },
    configurePreviewServer(server) {
      server.middlewares.use(applyHeaders);
    },
  };
}
