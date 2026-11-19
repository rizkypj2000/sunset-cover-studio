// Sunset Cover Studio's hand-in program (Node 22, standard library only). The app is app/: static files a desktop
// browser opens offline (index.html and its ES modules), a multi-panel cover-art maker with its own lettering drawn
// from glyph outlines in app/src/glyphs.js. This program copies app/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json with the vendored make.fun library.
//
// Try the app with `node serve.ts` (http://localhost:8080). Outside the grader, MAKEFUN_OUTPUT_DIR replaces /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copies one directory of the repository into the output, creating the target even when the source is absent. */
function copyIntoOutput(name: string): void {
  const source = join(repoRoot, name);
  const target = join(outputDir, name);
  mkdirSync(target, { recursive: true });
  if (existsSync(source)) cpSync(source, target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyIntoOutput('app');
copyIntoOutput('screenshots');

// The gate's caps: text_max_bytes shapes the dossier; the rest make buildDossier refuse what the scorer would refuse
// (over 4 screenshots or one over 256 KiB, over 993 entries or 48 MiB in app/, or an app/ path over 1000 bytes).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
