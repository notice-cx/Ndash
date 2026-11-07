import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

try {
  const directory = resolve(process.env.NDASH_DATA_DIR || '.data');
  console.log(
    process.env.NDASH_EDITOR_KEY ||
      (await readFile(resolve(directory, 'editor-key'), 'utf8')).trim(),
  );
} catch {
  console.error('Start Ndash first, then run npm run access-key from the app directory.');
  process.exitCode = 1;
}
