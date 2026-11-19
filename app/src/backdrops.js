// Backdrops for the caption's own panel, drawn in the grade's colours: a sunset over the sea with a striped sun and
// palm silhouettes, a neon perspective grid, the first photo blurred into a colour wash, or a plain gradient.

import { hexToRgb } from './grades.js';

export const BACKDROPS = [
  { id: 'sunset', name: 'Sunset + palms' },
  { id: 'grid', name: 'Neon grid' },
  { id: 'photo', name: 'Photo wash' },
  { id: 'solid', name: 'Gradient' },
];

/** A vertical sky gradient through the grade's sky colours, from `top` to `bottom`. */
function skyGradient(ctx, grade, top, bottom) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  grade.sky.forEach((c, i) => g.addColorStop(i / (grade.sky.length - 1), c));
  return g;
}

/** A sun disc with horizontal bands cut from its lower half. */
function drawStripedSun(ctx, cx, cy, r, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, grade.sun[0]);
  g.addColorStop(0.5, grade.sun[1]);
  g.addColorStop(1, grade.sun[2]);
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'destination-out';
  let y = cy - r * 0.05;
  let band = r * 0.05;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, band);
    y += band + r * 0.11;
    band *= 1.32;
  }
  ctx.restore();
}

/** A palm tree silhouette: a curved trunk from (x, baseY) and a crown of drooping fronds. */
export function drawPalmSilhouette(ctx, x, baseY, height, lean, color) {
  const topX = x + lean * height;
  const topY = baseY - height;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const trunk = height * 0.045;
  ctx.beginPath();
  ctx.moveTo(x - trunk, baseY);
  ctx.quadraticCurveTo(x + lean * height * 0.2 - trunk, baseY - height * 0.6, topX - trunk * 0.5, topY);
  ctx.lineTo(topX + trunk * 0.5, topY);
  ctx.quadraticCurveTo(x + lean * height * 0.2 + trunk, baseY - height * 0.6, x + trunk, baseY);
  ctx.closePath();
  ctx.fill();
  const fronds = [-2.9, -2.4, -1.9, -1.3, -0.75, -0.25, 0.25];
  for (const angle of fronds) {
    const len = height * (0.42 + 0.08 * Math.cos(angle * 3));
    const ex = topX + Math.cos(angle) * len;
    const ey = topY + Math.sin(angle) * len * 0.45 + len * 0.35;
    const mx = topX + Math.cos(angle) * len * 0.55;
    const my = topY + Math.sin(angle) * len * 0.55 - len * 0.12;
    const w = height * 0.05;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my - w, ex, ey);
    ctx.quadraticCurveTo(mx, my + w, topX, topY + w * 0.4);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(topX, topY + trunk * 0.4, trunk * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSunsetScene(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const horizon = y + h * 0.66;
  ctx.fillStyle = skyGradient(ctx, grade, y, horizon);
  ctx.fillRect(x, y, w, horizon - y);
  const r = Math.min(w * 0.22, h * 0.36);
  drawStripedSun(ctx, x + w * 0.5, horizon - r * 0.35, r, grade);
  const sea = ctx.createLinearGradient(0, horizon, 0, y + h);
  sea.addColorStop(0, grade.sea);
  sea.addColorStop(1, grade.ink);
  ctx.fillStyle = sea;
  ctx.fillRect(x, horizon, w, y + h - horizon);
  ctx.fillStyle = grade.sun[1];
  for (let i = 0; i < 7; i++) {
    const ly = horizon + (y + h - horizon) * (0.08 + i * 0.13);
    const lw = r * (1.3 - i * 0.12);
    ctx.globalAlpha = 0.65 - i * 0.07;
    ctx.fillRect(x + w * 0.5 - lw / 2, ly, lw, Math.max(1, h * 0.012));
  }
  ctx.globalAlpha = 1;
  const silhouette = grade.ink;
  drawPalmSilhouette(ctx, x + w * 0.06, y + h * 1.02, h * 0.95, 0.18, silhouette);
  drawPalmSilhouette(ctx, x + w * 0.14, y + h * 1.02, h * 0.7, 0.32, silhouette);
  drawPalmSilhouette(ctx, x + w * 0.93, y + h * 1.02, h * 0.88, -0.22, silhouette);
}

function drawNeonGrid(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  const horizon = y + h * 0.55;
  ctx.fillStyle = skyGradient(ctx, grade, y, horizon);
  ctx.fillRect(x, y, w, horizon - y);
  const r = Math.min(w * 0.2, h * 0.34);
  drawStripedSun(ctx, x + w * 0.5, horizon - r * 0.15, r, grade);
  ctx.fillStyle = grade.ink;
  ctx.fillRect(x, horizon, w, y + h - horizon);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, horizon, w, y + h - horizon);
  ctx.clip();
  ctx.strokeStyle = grade.accent2;
  ctx.shadowColor = grade.accent2;
  ctx.shadowBlur = h * 0.02;
  ctx.lineWidth = Math.max(1, h * 0.006);
  const vx = x + w / 2;
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(vx + i * w * 0.012, horizon);
    ctx.lineTo(vx + i * w * 0.16, y + h);
    ctx.stroke();
  }
  for (let i = 1; i < 10; i++) {
    const t = Math.pow(i / 9, 2.2);
    const ly = horizon + (y + h - horizon) * t;
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + w, ly);
    ctx.stroke();
  }
  ctx.restore();
  const haze = ctx.createLinearGradient(0, horizon - h * 0.06, 0, horizon + h * 0.08);
  const [r1, g1, b1] = hexToRgb(grade.accent);
  haze.addColorStop(0, `rgba(${r1},${g1},${b1},0)`);
  haze.addColorStop(0.5, `rgba(${r1},${g1},${b1},0.55)`);
  haze.addColorStop(1, `rgba(${r1},${g1},${b1},0)`);
  ctx.fillStyle = haze;
  ctx.fillRect(x, horizon - h * 0.06, w, h * 0.14);
}

function drawPhotoWash(ctx, rect, grade, photo) {
  const { x, y, w, h } = rect;
  if (!photo) return drawGradientField(ctx, rect, grade);
  const iw = photo.naturalWidth || photo.width, ih = photo.naturalHeight || photo.height;
  const s = Math.max(w / iw, h / ih) * 1.25;
  ctx.save();
  ctx.filter = `blur(${Math.round(Math.min(w, h) * 0.04)}px) saturate(1.4)`;
  ctx.drawImage(photo, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s);
  ctx.filter = 'none';
  ctx.globalCompositeOperation = 'color';
  ctx.fillStyle = skyGradient(ctx, grade, y, y + h);
  ctx.fillRect(x, y, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.45;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawGradientField(ctx, rect, grade) {
  const { x, y, w, h } = rect;
  ctx.fillStyle = skyGradient(ctx, grade, y, y + h);
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = grade.sun[0];
  const step = Math.max(6, h * 0.035);
  for (let ly = y + step; ly < y + h; ly += step) ctx.fillRect(x, ly, w, Math.max(1, step * 0.12));
  ctx.restore();
}

/** Fills `rect` with the chosen backdrop, clipped to it. */
export function drawTitleBackdrop(ctx, rect, backdropId, grade, photo) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (backdropId === 'grid') drawNeonGrid(ctx, rect, grade);
  else if (backdropId === 'photo') drawPhotoWash(ctx, rect, grade, photo);
  else if (backdropId === 'solid') drawGradientField(ctx, rect, grade);
  else drawSunsetScene(ctx, rect, grade);
  ctx.restore();
}
