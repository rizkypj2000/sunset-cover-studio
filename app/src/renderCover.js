// Composes a whole cover onto a canvas at the canvas's own size: the frame, each photo panel cropped and graded with
// its effects, the caption's backdrop panel, and the lettering. The editor's preview and the exported PNG both come
// from renderCover, the preview at a smaller size.

import { drawTitleBackdrop } from './backdrops.js';
import { drawCroppedPhoto } from './crop.js';
import {
  addFilmGrain, applyBloom, applyGradientMap, applyHalftoneShadows, applyLightLeak, applySkyWash, applyVignette,
} from './effects.js';
import { gradeById, hexToRgb } from './grades.js';
import { layoutFor, layoutGeometry, SIZES } from './layouts.js';
import { drawCaptionBlock } from './lettering.js';

export const FRAME_COLORS = [
  { id: 'ink', name: 'Night' },
  { id: 'white', name: 'White' },
  { id: 'cream', name: 'Cream' },
  { id: 'accent', name: 'Accent' },
];

/** The frame (border) colour for a frame choice under a grade. */
export function frameColor(frameId, grade) {
  if (frameId === 'white') return '#ffffff';
  if (frameId === 'cream') return '#f6ead2';
  if (frameId === 'accent') return grade.accent;
  return grade.ink;
}

const scratchCanvases = new Map();
/** A reusable offscreen canvas, so redraws while dragging do not allocate new ones. */
function scratchCanvas(key, width, height) {
  let c = scratchCanvases.get(key);
  if (!c) {
    c = document.createElement('canvas');
    scratchCanvases.set(key, c);
  }
  if (c.width !== width) c.width = width;
  if (c.height !== height) c.height = height;
  return c;
}

/** Draws an empty panel: the grade's sky with a plus sign inviting a photo. */
function drawEmptyPanel(ctx, rect, grade) {
  const g = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  g.addColorStop(0, grade.sky[1]);
  g.addColorStop(1, grade.sky[3]);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  const s = Math.min(rect.w, rect.h) * 0.12;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(rect.x + rect.w / 2 - s, rect.y + rect.h / 2 - s * 0.14, s * 2, s * 0.28);
  ctx.fillRect(rect.x + rect.w / 2 - s * 0.14, rect.y + rect.h / 2 - s, s * 0.28, s * 2);
}

/** Renders one graded photo panel into `rect` of the cover. */
function drawPhotoPanel(ctx, rect, photo, crop, grade, doc, index, unit) {
  const w = Math.max(1, Math.round(rect.w));
  const h = Math.max(1, Math.round(rect.h));
  const panel = scratchCanvas(`panel${index}`, w, h);
  const p = panel.getContext('2d', { willReadFrequently: true });
  p.clearRect(0, 0, w, h);
  drawCroppedPhoto(p, photo, { w, h }, crop);
  const fx = doc.effects;
  const image = p.getImageData(0, 0, w, h);
  applyGradientMap(image, grade, doc.strength, 1 + doc.contrast * 0.5);
  if (fx.halftone) applyHalftoneShadows(image, Math.max(3, 9 * unit), grade.ink, 0.55);
  if (fx.grain) addFilmGrain(image, 0.07, 1013 + index * 7919);
  p.putImageData(image, 0, 0);
  applySkyWash(p, w, h, grade, 0.5 * doc.strength);
  if (fx.bloom) applyBloom(p, scratchCanvas('bloom', w, h), Math.min(w, h) * 0.03, 0.3);
  if (fx.leak) applyLightLeak(p, w, h, grade, index % 4);
  if (fx.vignette) applyVignette(p, w, h, grade, 0.55);
  ctx.drawImage(panel, Math.round(rect.x), Math.round(rect.y));
}

/** A thin bright keyline just inside each panel's edge, so the panels read as printed cards. */
function drawPanelKeyline(ctx, rect, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = width;
  ctx.strokeRect(rect.x + width / 2, rect.y + width / 2, rect.w - width, rect.h - width);
  ctx.restore();
}

/** A feathered elliptical shadow under overlaid lettering, so it reads over busy photos without a hard box. */
function drawSoftShadowBehind(ctx, rect, grade) {
  const [r, g, b] = hexToRgb(grade.ink);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h * 0.55;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rect.w / rect.h, 1);
  const radius = rect.h * 0.75;
  const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  shade.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
  shade.addColorStop(0.6, `rgba(${r},${g},${b},0.25)`);
  shade.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = shade;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

/**
 * Draws `doc` (the cover's settings) onto `canvas` at its current size, `photos` mapping photo ids to images.
 * Returns the geometry in canvas pixels, for hit-testing the preview.
 */
export function renderCover(canvas, doc, photos) {
  const ctx = canvas.getContext('2d');
  const { width: W, height: H } = canvas;
  const size = SIZES[doc.size] ?? SIZES.landscape;
  const unit = W / size.w;
  const grade = gradeById(doc.gradeId);
  const layout = layoutFor(doc.size, doc.layoutId);
  const geo = layoutGeometry(layout, W, H, doc.border * unit);

  ctx.save();
  ctx.fillStyle = frameColor(doc.frame, grade);
  ctx.fillRect(0, 0, W, H);

  geo.panels.forEach((rect, i) => {
    const slot = doc.panels[i];
    const photo = slot && photos.get(slot.photoId);
    if (photo) drawPhotoPanel(ctx, rect, photo, slot.crop, grade, doc, i, unit);
    else drawEmptyPanel(ctx, rect, grade);
    if (doc.keyline && doc.border > 0) drawPanelKeyline(ctx, rect, grade.accent, Math.max(1, 3 * unit));
  });

  const caption = doc.caption;
  if (geo.titleMode === 'panel') {
    const first = doc.panels[0] && photos.get(doc.panels[0].photoId);
    drawTitleBackdrop(ctx, geo.title, doc.backdrop, grade, first);
    if (doc.keyline && doc.border > 0) drawPanelKeyline(ctx, geo.title, grade.accent, Math.max(1, 3 * unit));
    drawCaptionBlock(ctx, geo.title, caption, doc.letterStyle, grade);
  } else {
    drawSoftShadowBehind(ctx, geo.title, grade);
    drawCaptionBlock(ctx, geo.title, caption, doc.letterStyle, grade, { anchor: 'bottom' });
  }
  ctx.restore();
  return geo;
}
