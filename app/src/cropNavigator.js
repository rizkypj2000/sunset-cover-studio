// The crop navigator in the Panel card: the selected panel's whole photo, dimmed outside the part the panel shows,
// with that window outlined. Dragging on it moves the window, a second way to position a photo in its panel.

import { photoPlacement } from './crop.js';

/** Where the whole photo sits inside the navigator canvas (fitted, centred). */
function photoBox(canvas, photo) {
  const iw = photo.naturalWidth || photo.width, ih = photo.naturalHeight || photo.height;
  const s = Math.min(canvas.width / iw, canvas.height / ih);
  return { x: (canvas.width - iw * s) / 2, y: (canvas.height - ih * s) / 2, w: iw * s, h: ih * s };
}

/** Draws the navigator for `photo` cropped by `crop` into a panel shaped like `rect`; clears it with no photo. */
export function drawCropNavigator(canvas, photo, rect, crop) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b0614';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!photo || !rect) return;
  const box = photoBox(canvas, photo);
  const p = photoPlacement(photo, rect, crop);
  const vw = rect.w / (p.scale * p.iw), vh = rect.h / (p.scale * p.ih);
  const win = { x: box.x + (p.fx - vw / 2) * box.w, y: box.y + (p.fy - vh / 2) * box.h, w: vw * box.w, h: vh * box.h };
  ctx.drawImage(photo, box.x, box.y, box.w, box.h);
  ctx.save();
  ctx.fillStyle = 'rgba(11, 6, 20, 0.62)';
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.rect(win.x, win.y, win.w, win.h);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#27e1ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(win.x, win.y, win.w, win.h);
  ctx.fillStyle = '#27e1ff';
  const t = 10;
  for (const [cx, cy] of [[win.x, win.y], [win.x + win.w, win.y], [win.x, win.y + win.h], [win.x + win.w, win.y + win.h]]) {
    ctx.fillRect(cx - t / 2, cy - t / 2, t, t);
  }
  ctx.restore();
}

/** Calls `onMove(fx, fy)` with the photo point under the pointer while it is dragged across the navigator. */
export function attachCropNavigator(canvas, getPhoto, onMove) {
  let active = false;
  const move = (event) => {
    const photo = getPhoto();
    if (!photo) return;
    const r = canvas.getBoundingClientRect();
    const x = ((event.clientX - r.left) * canvas.width) / r.width;
    const y = ((event.clientY - r.top) * canvas.height) / r.height;
    const box = photoBox(canvas, photo);
    onMove((x - box.x) / box.w, (y - box.y) / box.h);
  };
  canvas.addEventListener('pointerdown', (event) => {
    active = true;
    canvas.setPointerCapture(event.pointerId);
    move(event);
  });
  canvas.addEventListener('pointermove', (event) => { if (active) move(event); });
  canvas.addEventListener('pointerup', () => { active = false; });
  canvas.addEventListener('pointercancel', () => { active = false; });
}
