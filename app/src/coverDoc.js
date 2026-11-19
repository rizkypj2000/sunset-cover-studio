// The cover document: every setting a cover is drawn from, as plain data the editor changes and renderCover reads.

import { startingCrop } from './crop.js';
import { LAYOUTS, MAX_PANELS } from './layouts.js';

/** A fresh cover with the studio's default look. */
export function createCoverDoc() {
  return {
    size: 'landscape',
    layoutId: 'mosaic',
    panels: Array.from({ length: MAX_PANELS }, (_, i) => ({ photoId: null, crop: startingCrop(i) })),
    caption: { kicker: 'Welcome to', title: 'Sunset\nBoulevard', subtitle: 'Summer 2026' },
    letterStyle: 'gloss',
    gradeId: 'vice',
    strength: 0.78,
    contrast: 0.5,
    effects: { grain: true, halftone: false, bloom: true, leak: true, vignette: true },
    border: 14,
    frame: 'ink',
    keyline: false,
    backdrop: 'sunset',
  };
}

/** Puts the photos into the panels in turn, repeating them when there are more panels than photos. */
export function fillPanelsWithPhotos(doc, photoIds) {
  if (!photoIds.length) return;
  doc.panels.forEach((slot, i) => {
    slot.photoId = photoIds[i % photoIds.length];
    slot.crop = startingCrop(i);
  });
}

/** Switches the post size, keeping the layout of the same name where the new size has one. */
export function changeCoverSize(doc, sizeId) {
  doc.size = sizeId;
  const list = LAYOUTS[sizeId];
  if (!list.some((l) => l.id === doc.layoutId)) doc.layoutId = list[0].id;
}
