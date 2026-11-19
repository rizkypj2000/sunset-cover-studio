// Photo finishing for one panel: the gradient-map grade with a contrast curve, halftone dots in the shadows, film
// grain, bloom on the highlights, a light leak and a vignette. Pixel passes work on ImageData; the rest are canvas
// composites, so every effect scales with the panel's size in pixels.

import { gradientMapLut, hexToRgb } from './grades.js';

/** A small seeded random generator, so the grain of a given panel looks the same on every redraw. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Grades pixels in place: luminance through an S-curve (`contrast`), then through the grade's gradient map, mixed
 * with the original colour by `strength` (0 keeps the photo, 1 is the pure gradient map).
 */
export function applyGradientMap(image, grade, strength, contrast = 1.25) {
  const lut = gradientMapLut(grade);
  const curve = new Uint8Array(256);
  const gamma = grade.gamma ?? 1;
  for (let i = 0; i < 256; i++) {
    const x = Math.pow(i / 255, gamma);
    const s = x * x * (3 - 2 * x);
    const v = x + (s - x) * (contrast - 1) * 2;
    curve[i] = Math.max(0, Math.min(255, Math.round(v * 255)));
  }
  const d = image.data;
  const keep = 1 - strength;
  const saturation = 1.35;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const y = (r * 77 + g * 151 + b * 28) >> 8;
    const lum = curve[y] * 3;
    const tone = curve[y];
    d[i] = (tone + (r - y) * saturation) * keep + lut[lum] * strength;
    d[i + 1] = (tone + (g - y) * saturation) * keep + lut[lum + 1] * strength;
    d[i + 2] = (tone + (b - y) * saturation) * keep + lut[lum + 2] * strength;
  }
}

/** Soft-lights the grade's sky (warm at the top, hot at the bottom) over the panel, tying the panels together. */
export function applySkyWash(ctx, width, height, grade, alpha = 0.45) {
  const g = ctx.createLinearGradient(0, 0, width * 0.3, height);
  g.addColorStop(0, grade.accent2);
  g.addColorStop(0.55, grade.accent);
  g.addColorStop(1, grade.sky[1]);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Prints rotated halftone dots of `inkHex` into the shadows, larger where the photo is darker. */
export function applyHalftoneShadows(image, cell, inkHex, amount = 0.7) {
  const [ir, ig, ib] = hexToRgb(inkHex);
  const { data: d, width, height } = image;
  const inv = 1 / (cell * Math.SQRT2);
  const soft = 2 / cell;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = (d[i] * 77 + d[i + 1] * 151 + d[i + 2] * 28) >> 8;
      const dark = 1 - lum / 255;
      if (dark < 0.5) continue;
      const u = (x + y) * inv, v = (x - y) * inv;
      const fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v) - 0.5;
      const dist = Math.sqrt(fu * fu + fv * fv) * 2;
      const radius = Math.pow((dark - 0.5) / 0.5, 0.9) * 1.1;
      const edge = Math.min(1, Math.max(0, (radius - dist) / soft));
      if (edge <= 0) continue;
      const a = edge * amount;
      d[i] += (ir - d[i]) * a;
      d[i + 1] += (ig - d[i + 1]) * a;
      d[i + 2] += (ib - d[i + 2]) * a;
    }
  }
}

/** Adds monochrome film grain of strength `amount` (0..1), seeded per panel. */
export function addFilmGrain(image, amount, seed) {
  const rand = seededRandom(seed);
  const d = image.data;
  const scale = amount * 255;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() + rand() - 1) * scale;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
}

/** Screens a blurred copy of the canvas over itself, so the highlights glow like haze at golden hour. */
export function applyBloom(ctx, scratch, radius, alpha = 0.45) {
  const { width, height } = ctx.canvas;
  scratch.width = width;
  scratch.height = height;
  const s = scratch.getContext('2d');
  s.filter = `blur(${Math.max(1, radius)}px) brightness(1.15)`;
  s.drawImage(ctx.canvas, 0, 0);
  s.filter = 'none';
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = alpha;
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
}

/** A warm light leak streaming in from one corner of the panel. */
export function applyLightLeak(ctx, width, height, grade, corner = 0) {
  const cx = corner % 2 === 0 ? 0 : width;
  const cy = corner < 2 ? 0 : height;
  const r = Math.hypot(width, height) * 0.75;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  const [r1, g1, b1] = hexToRgb(grade.accent2);
  const [r2, g2, b2] = hexToRgb(grade.accent);
  g.addColorStop(0, `rgba(${r1},${g1},${b1},0.55)`);
  g.addColorStop(0.35, `rgba(${r2},${g2},${b2},0.22)`);
  g.addColorStop(1, `rgba(${r2},${g2},${b2},0)`);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Darkens the panel's edges toward the grade's ink colour. */
export function applyVignette(ctx, width, height, grade, strength = 0.6) {
  const [r, g, b] = hexToRgb(grade.ink);
  const grad = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.25, width / 2, height / 2, Math.hypot(width, height) * 0.62);
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},${strength})`);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
