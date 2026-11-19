// Fixed scenes for screenshots. `?shot=cover&scene=<name>` draws that scene's cover alone at its full post size,
// fitted to the window; `?shot=editor&scene=<name>` opens the editor on it. Both use the bundled sample photos,
// each panel with its own crop. window.__shotReady is set once the page is painted.

import { renderCover } from './renderCover.js';
import { SIZES } from './layouts.js';

const B = 'sample-boulevard';
const P = 'sample-pier';

/** Each scene: the cover settings it changes, and per-panel [photo, zoom, fx, fy, flip]. */
export const SHOT_SCENES = {
  landscape: {
    size: 'landscape', layoutId: 'mosaic', gradeId: 'vice', letterStyle: 'gloss', backdrop: 'sunset',
    caption: { kicker: 'Welcome to', title: 'Sunset\nBoulevard', subtitle: 'Summer 2026' },
    panels: [[B, 1.25, 0.55, 0.36], [P, 1.5, 0.42, 0.3], [B, 2.4, 0.6, 0.2], [B, 2, 0.18, 0.27], [P, 2.4, 0.82, 0.7], [B, 2.6, 0.15, 0.76, true]],
    selected: 1,
  },
  portrait: {
    size: 'portrait', layoutId: 'poster', gradeId: 'neon', letterStyle: 'chrome', backdrop: 'grid',
    caption: { kicker: 'After dark', title: 'Neon Pier', subtitle: 'Live from the boardwalk' },
    panels: [[P, 1.4, 0.45, 0.35], [B, 1.9, 0.6, 0.24], [B, 1.3, 0.5, 0.6], [B, 1.4, 0.3, 0.26], [P, 3, 0.83, 0.71], [P, 2.4, 0.42, 0.28]],
    selected: 0,
  },
  square: {
    size: 'square', layoutId: 'quad', gradeId: 'golden', letterStyle: 'poster', backdrop: 'sunset',
    caption: { kicker: '', title: 'Golden\nHour Club', subtitle: 'Est. 2026' },
    panels: [[B, 1.8, 0.6, 0.22], [P, 1.6, 0.42, 0.3], [P, 1.5, 0.7, 0.55], [B, 1.4, 0.35, 0.55]],
    selected: 0,
  },
};

export function isShotRequest(query) {
  return query.has('shot');
}

/** Applies a scene to the editor's document. */
function applySceneToDoc(doc, scene) {
  Object.assign(doc, {
    size: scene.size, layoutId: scene.layoutId, gradeId: scene.gradeId, letterStyle: scene.letterStyle,
    backdrop: scene.backdrop, caption: { ...scene.caption },
  });
  Object.assign(doc.effects, scene.effects ?? {});
  scene.panels.forEach(([photoId, zoom, fx, fy, flip = false], i) => {
    doc.panels[i] = { photoId, crop: { zoom, fx, fy, flip } };
  });
}

/** Sets up the requested scene, draws it and flags the page as ready for capture. */
export async function applyShotScene(query, editor, { refreshControls, drawPreview, photoMap }) {
  const scene = SHOT_SCENES[query.get('scene')] ?? SHOT_SCENES.landscape;
  applySceneToDoc(editor.doc, scene);
  for (const key of ['kicker', 'title', 'subtitle']) {
    if (query.has(key)) editor.doc.caption[key] = query.get(key);
  }
  if (query.has('style')) editor.doc.letterStyle = query.get('style');
  editor.selected = scene.selected ?? 0;
  if (query.get('shot') === 'cover') {
    document.body.classList.add('shot-cover');
    const size = SIZES[scene.size];
    const canvas = document.createElement('canvas');
    canvas.id = 'shotCanvas';
    canvas.width = size.w;
    canvas.height = size.h;
    document.body.append(canvas);
    renderCover(canvas, editor.doc, photoMap());
  } else {
    refreshControls();
    drawPreview();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
