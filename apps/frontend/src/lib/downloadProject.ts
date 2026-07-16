import JSZip from 'jszip';
import { stepsToFiles } from './parseArtifact';
import type { Step } from '../types';

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug || 'spark-project';
}

export async function downloadProjectZip(
  steps: Step[],
  title: string
): Promise<void> {
  const files = stepsToFiles(steps);
  const paths = Object.keys(files);

  if (paths.length === 0) {
    throw new Error('No files to download yet');
  }

  const zip = new JSZip();

  for (const path of paths.sort()) {
    zip.file(path, files[path] ?? '');
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugify(title)}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
