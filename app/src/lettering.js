// Caption lettering: stacks the title's lines in the caption cell, each line sized to the cell's width, with a
// kicker line above and a subtitle tag below, then paints each line in a layered style (glow, extruded depth, a
// dark outline, a gradient face and an inline highlight) using the outlines from glyphs.js.

import { appendLineToPath, measureLineUnits, normalizeCaptionText } from './glyphs.js';
import { hexToRgb } from './grades.js';

export const LETTER_STYLES = [
  { id: 'gloss', name: 'Sunset Gloss' },
  { id: 'chrome', name: 'Dusk Chrome' },
  { id: 'neon', name: 'Neon Tube' },
  { id: 'poster', name: 'Poster Block' },
];

const SLANT = 0.16;

const rgba = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

/** The face fill for a style: a vertical gradient spanning one line's cap height. */
function faceFill(ctx, styleId, grade, top, size) {
  const g = ctx.createLinearGradient(0, top, 0, top + size);
  if (styleId === 'chrome') {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.36, '#bfe9ff');
    g.addColorStop(0.5, '#3a3f86');
    g.addColorStop(0.53, grade.sun[2]);
    g.addColorStop(0.75, grade.sun[1]);
    g.addColorStop(1, '#fff3d0');
  } else if (styleId === 'poster') {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#ffffff');
  } else if (styleId === 'neon') {
    g.addColorStop(0, rgba(grade.ink, 0.35));
    g.addColorStop(1, rgba(grade.ink, 0.6));
  } else {
    g.addColorStop(0, grade.sun[0]);
    g.addColorStop(0.38, grade.sun[1]);
    g.addColorStop(0.72, grade.sun[2]);
    g.addColorStop(1, grade.accent);
  }
  return g;
}

/** Paints one lettered path in a style. `size` is the cap height in pixels; `top` its cap line. */
export function paintLetteredPath(ctx, path, styleId, grade, top, size) {
  const outline = size * (styleId === 'neon' ? 0.05 : 0.085);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (styleId === 'neon') {
    ctx.fillStyle = faceFill(ctx, styleId, grade, top, size);
    ctx.fill(path);
    for (const [width, blur, color] of [
      [outline * 1.4, size * 0.45, grade.accent2],
      [outline, size * 0.18, grade.accent2],
      [outline * 0.38, size * 0.06, '#ffffff'],
    ]) {
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.strokeStyle = color === '#ffffff' ? '#fffaff' : color;
      ctx.lineWidth = width;
      ctx.stroke(path);
    }
    ctx.restore();
    return;
  }

  const depth = size * (styleId === 'poster' ? 0.09 : 0.13);
  const dx = depth * 0.38;
  const steps = Math.max(2, Math.ceil(depth / Math.max(1, size * 0.012)));

  // Glow and the outline of the whole extruded silhouette.
  ctx.shadowColor = rgba(grade.accent, 0.8);
  ctx.shadowBlur = size * 0.4;
  ctx.strokeStyle = grade.ink;
  ctx.fillStyle = grade.ink;
  ctx.lineWidth = outline * 2;
  ctx.translate(dx, depth);
  ctx.stroke(path);
  ctx.translate(-dx, -depth);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    ctx.translate(dx * t, depth * t);
    ctx.stroke(path);
    ctx.translate(-dx * t, -depth * t);
  }

  // The extruded depth, darker as it recedes.
  const sideTop = styleId === 'poster' ? grade.accent : grade.accent;
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    ctx.translate(dx * t, depth * t);
    ctx.fillStyle = styleId === 'poster' ? sideTop : mixHex(grade.accent, grade.ink, 0.25 + t * 0.5);
    ctx.fill(path);
    ctx.translate(-dx * t, -depth * t);
  }

  // The face, then an inline highlight just inside its edge.
  ctx.fillStyle = faceFill(ctx, styleId, grade, top, size);
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  ctx.strokeStyle = styleId === 'poster' ? rgba(grade.ink, 0.18) : 'rgba(255,255,255,0.75)';
  ctx.lineWidth = size * 0.035;
  ctx.translate(size * 0.008, size * 0.012);
  ctx.stroke(path);
  ctx.restore();
  ctx.restore();
}

/** Blends two '#rrggbb' colours, t = 0 gives a. */
function mixHex(a, b, t) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Draws a run of text centred on `cx` with cap line at `top`, returning its path and width. */
function linePath(text, cx, top, size, slant = SLANT) {
  const width = ((measureLineUnits(text) + slant * 100) * size) / 100;
  const path = new Path2D();
  appendLineToPath(path, text, cx - width / 2, top, size, { slant });
  return { path, width };
}

/** A slanted bar behind the subtitle, in the grade's accent colour, with the subtitle in ink. */
function drawSubtitleTag(ctx, text, cx, top, size, grade) {
  const { path, width } = linePath(text, cx, top, size, 0.1);
  const padX = size * 0.9, padY = size * 0.42, lean = size * 0.5;
  const left = cx - width / 2 - padX, right = cx + width / 2 + padX;
  const y0 = top - padY, y1 = top + size + padY;
  ctx.save();
  ctx.shadowColor = rgba(grade.ink, 0.6);
  ctx.shadowOffsetX = size * 0.18;
  ctx.shadowOffsetY = size * 0.22;
  ctx.fillStyle = grade.ink;
  ctx.beginPath();
  ctx.moveTo(left + lean, y0);
  ctx.lineTo(right + lean, y0);
  ctx.lineTo(right - lean, y1);
  ctx.lineTo(left - lean, y1);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const inset = size * 0.16;
  ctx.fillStyle = grade.accent;
  ctx.beginPath();
  ctx.moveTo(left + lean + inset, y0 + inset);
  ctx.lineTo(right + lean - inset, y0 + inset);
  ctx.lineTo(right - lean - inset, y1 - inset);
  ctx.lineTo(left - lean + inset, y1 - inset);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = grade.ink;
  ctx.fill(path);
  ctx.restore();
}

/** Lays the caption's lines out inside `rect`: per-line sizes and the block's total height. */
export function layoutCaption(rect, caption, styleId) {
  const titleLines = String(caption.title ?? '').split('\n').map(normalizeCaptionText).filter(Boolean).slice(0, 3);
  const kicker = normalizeCaptionText(caption.kicker);
  const subtitle = normalizeCaptionText(caption.subtitle);
  const pad = Math.min(rect.w, rect.h) * 0.07;
  const availW = rect.w - pad * 2 - Math.min(rect.w, rect.h) * 0.04;
  const availH = rect.h - pad * 2;
  const extra = styleId === 'neon' ? 14 : 34; // outline, extrusion and slant overhang, in font units
  let sizes = titleLines.map((line) => (availW * 100) / (measureLineUnits(line) + SLANT * 100 + extra));
  const smallest = Math.min(...sizes);
  sizes = sizes.map((s) => Math.min(s, smallest * 1.45, availH * 0.78));
  const gap = (s) => s * 0.2;
  const base = sizes.length ? Math.min(...sizes) : availH * 0.3;
  let kickerSize = kicker ? Math.min(base * 0.3, (availW * 100) / (measureLineUnits(kicker) + 40)) : 0;
  let subSize = subtitle ? Math.min(base * 0.24, (availW * 100) / (measureLineUnits(subtitle) + 260)) : 0;
  const total = () =>
    sizes.reduce((sum, s, i) => sum + s + (i ? gap(s) : 0), 0) +
    (kicker ? kickerSize * 1.6 : 0) +
    (subtitle ? subSize * 3.2 : 0) +
    (sizes.length ? sizes[sizes.length - 1] * 0.13 : 0);
  const fit = Math.min(1, availH / Math.max(1, total()));
  sizes = sizes.map((s) => s * fit);
  kickerSize *= fit;
  subSize *= fit;
  return { titleLines, kicker, subtitle, sizes, kickerSize, subSize, height: total(), gap };
}

/** Draws the whole caption block centred in `rect` in the chosen lettering style. */
export function drawCaptionBlock(ctx, rect, caption, styleId, grade, { anchor = 'center' } = {}) {
  const lay = layoutCaption(rect, caption, styleId);
  const cx = rect.x + rect.w / 2;
  const pad = Math.min(rect.w, rect.h) * 0.07;
  let y = anchor === 'bottom'
    ? rect.y + rect.h - pad - lay.height
    : rect.y + (rect.h - lay.height) / 2;

  if (lay.kicker) {
    const { path } = linePath(lay.kicker, cx, y, lay.kickerSize, 0.12);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.ink;
    ctx.lineWidth = lay.kickerSize * 0.32;
    ctx.shadowColor = rgba(grade.ink, 0.7);
    ctx.shadowBlur = lay.kickerSize * 0.6;
    ctx.stroke(path);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = grade.accent2;
    ctx.fill(path);
    ctx.restore();
    y += lay.kickerSize * 1.6;
  }
  lay.titleLines.forEach((line, i) => {
    const size = lay.sizes[i];
    if (i) y += lay.gap(size);
    const { path } = linePath(line, cx, y, size);
    paintLetteredPath(ctx, path, styleId, grade, y, size);
    y += size;
  });
  if (lay.subtitle) {
    y += lay.subSize * 1.3 + (lay.sizes.length ? lay.sizes[lay.sizes.length - 1] * 0.13 : 0);
    drawSubtitleTag(ctx, lay.subtitle, cx, y, lay.subSize, grade);
  }
}
