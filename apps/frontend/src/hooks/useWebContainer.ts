import type { WebContainer } from '@webcontainer/api';
import { useEffect, useRef, useState } from 'react';
import { stepsToFiles } from '../lib/parseArtifact';
import {
  bootWebContainer,
  extractPreviewUrl,
  filesToFileSystemTree,
  prepareFilesForWebContainer,
  syncFilesToContainer,
} from '../lib/webcontainer';
import type { Step } from '../types';
import { StepType } from '../types';

const DEV_SERVER_TIMEOUT_MS = 120_000;

function attachPreviewListeners(
  container: WebContainer,
  onUrl: (url: string) => void,
  isCancelled: () => boolean
) {
  const handleUrl = (url: string) => {
    if (!isCancelled() && url) {
      onUrl(url);
    }
  };

  container.on('server-ready', (_port, url) => handleUrl(url));
  container.on('port', (_port, type, url) => {
    if (type === 'open') {
      handleUrl(url);
    }
  });
}

export function useWebContainer(steps: Step[], ready: boolean) {
  const [webcontainer, setWebContainer] = useState<WebContainer | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const startedRef = useRef(false);
  const syncedFilesRef = useRef('');
  const previewReadyRef = useRef(false);
  const stepsRef = useRef(steps);

  stepsRef.current = steps;

  const fileCount = steps.filter((step) => step.type === StepType.CreateFile).length;

  useEffect(() => {
    let cancelled = false;

    if (!window.crossOriginIsolated) {
      setError(
        'WebContainer requires cross-origin isolation. Restart the dev server and open http://localhost:5173 (not 127.0.0.1 or a tunnel URL).'
      );
      return;
    }

    bootWebContainer()
      .then((instance) => {
        if (!cancelled) {
          setWebContainer(instance);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to boot WebContainer'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!webcontainer || !ready || fileCount === 0 || startedRef.current) {
      return;
    }

    const container = webcontainer;
    let cancelled = false;

    const markPreviewReady = (url: string) => {
      if (cancelled || previewReadyRef.current) {
        return;
      }
      previewReadyRef.current = true;
      window.clearTimeout(timeoutId);
      setPreviewUrl(url);
      setLoading(false);
      setStatus(null);
    };

    let timeoutId = 0;

    async function mountAndStart() {
      startedRef.current = true;
      previewReadyRef.current = false;
      setLoading(true);
      setError(null);
      setPreviewUrl(null);
      setStatus('Mounting project files...');

      let devLog = '';
      timeoutId = window.setTimeout(() => {
        if (!cancelled && !previewReadyRef.current) {
          setError(
            `Dev server timed out after 2 minutes. Last output: ${devLog.slice(-600) || 'none'}`
          );
          setLoading(false);
          setStatus(null);
        }
      }, DEV_SERVER_TIMEOUT_MS);

      try {
        attachPreviewListeners(container, markPreviewReady, () => cancelled);

        const files = prepareFilesForWebContainer(
          stepsToFiles(stepsRef.current)
        );
        const tree = filesToFileSystemTree(files);
        await container.mount(tree);
        syncedFilesRef.current = JSON.stringify(files);

        setStatus('Installing dependencies...');
        const install = await container.spawn('npm', ['install']);
        let installLog = '';
        install.output.pipeTo(
          new WritableStream({
            write(data) {
              installLog += data;
            },
          })
        );
        const installExit = await install.exit;
        if (installExit !== 0) {
          throw new Error(
            `npm install failed (exit ${installExit}): ${installLog.slice(-500)}`
          );
        }

        setStatus('Starting dev server...');
        const dev = await container.spawn('npm', ['run', 'dev']);
        dev.output.pipeTo(
          new WritableStream({
            write(data) {
              devLog += data;
              console.log('[webcontainer]', data);
              const url = extractPreviewUrl(data);
              if (url) {
                markPreviewReady(url);
              }
            },
          })
        );

        dev.exit.then((code) => {
          if (!cancelled && code !== 0 && !previewReadyRef.current) {
            window.clearTimeout(timeoutId);
            setError(
              `Dev server exited with code ${code}. Output: ${devLog.slice(-600)}`
            );
            setLoading(false);
            setStatus(null);
          }
        });
      } catch (err) {
        if (!cancelled) {
          window.clearTimeout(timeoutId);
          startedRef.current = false;
          previewReadyRef.current = false;
          setError(err instanceof Error ? err.message : 'Failed to start preview');
          setLoading(false);
          setStatus(null);
        }
      }
    }

    mountAndStart();

    return () => {
      cancelled = true;
    };
  }, [webcontainer, ready, fileCount]);

  useEffect(() => {
    if (!webcontainer || !ready || !startedRef.current) {
      return;
    }

    const container = webcontainer;
    const files = prepareFilesForWebContainer(stepsToFiles(steps));
    const serialized = JSON.stringify(files);
    if (serialized === syncedFilesRef.current) {
      return;
    }

    let cancelled = false;

    async function syncFiles() {
      try {
        await syncFilesToContainer(container, files);
        if (!cancelled) {
          syncedFilesRef.current = serialized;
        }
      } catch (err) {
        console.error('[webcontainer] Failed to sync files:', err);
      }
    }

    syncFiles();

    return () => {
      cancelled = true;
    };
  }, [webcontainer, steps, ready]);

  return { previewUrl, loading, error, status, webcontainer };
}
