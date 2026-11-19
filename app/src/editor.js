// The editor page: holds the cover document, builds the controls, keeps the live preview drawn, adds the person's
// photos from the file picker or a drop, and exports the cover as a PNG at the chosen post size. A `?shot=` query
// sets up a fixed scene for a screenshot instead (./shots.js).

import { BACKDROPS } from './backdrops.js';
import { changeCoverSize, createCoverDoc, fillPanelsWithPhotos } from './coverDoc.js';
import { panCrop, startingCrop, zoomCrop } from './crop.js';
import { attachCropNavigator, drawCropNavigator } from './cropNavigator.js';
import { appendLineToPath } from './glyphs.js';
import { GRADES, gradeById } from './grades.js';
import { LAYOUTS, SIZES, layoutFor } from './layouts.js';
import { LETTER_STYLES, paintLetteredPath } from './lettering.js';
import { attachPanelGestures } from './panelGestures.js';
import { imageFilesFrom, loadPhotoFile, loadSamplePhoto } from './photoLibrary.js';
import { FRAME_COLORS, renderCover } from './renderCover.js';
import { applyShotScene, isShotRequest } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');

const editor = {
  doc: createCoverDoc(),
  photos: [],
  selected: 0,
  geometry: null,
};

const photoMap = () => new Map(editor.photos.map((p) => [p.id, p.image]));
const currentLayout = () => layoutFor(editor.doc.size, editor.doc.layoutId);
const panelCount = () => currentLayout().panels.length;

let frameRequested = false;
/** Redraws the preview on the next animation frame, coalescing bursts of changes. */
function schedulePreview() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(() => {
    frameRequested = false;
    drawPreview();
  });
}

/** Sizes the preview canvas to fit the stage at the cover's aspect ratio, in device pixels. */
function fitPreviewCanvas() {
  const size = SIZES[editor.doc.size];
  const wrap = $('canvasWrap').getBoundingClientRect();
  const scale = Math.min(wrap.width / size.w, wrap.height / size.h);
  const cssW = Math.max(80, Math.floor(size.w * scale));
  const cssH = Math.max(80, Math.floor(size.h * scale));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  preview.style.width = `${cssW}px`;
  preview.style.height = `${cssH}px`;
  const pw = Math.min(size.w, Math.round(cssW * dpr));
  const ph = Math.round((pw * size.h) / size.w);
  if (preview.width !== pw || preview.height !== ph) {
    preview.width = pw;
    preview.height = ph;
  }
}

/** Draws the cover into the preview, then outlines the selected panel. */
function drawPreview() {
  fitPreviewCanvas();
  editor.geometry = renderCover(preview, editor.doc, photoMap());
  const rect = editor.geometry.panels[editor.selected];
  const selected = panelContext(editor.selected);
  drawCropNavigator($('cropNavigator'), selected?.photo, rect, editor.doc.panels[editor.selected]?.crop);
  if (!rect) return;
  const ctx = preview.getContext('2d');
  const lw = Math.max(2, preview.width / 360);
  ctx.save();
  ctx.strokeStyle = '#27e1ff';
  ctx.lineWidth = lw;
  ctx.setLineDash([lw * 4, lw * 2.5]);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = lw * 2;
  ctx.strokeRect(rect.x + lw / 2, rect.y + lw / 2, rect.w - lw, rect.h - lw);
  ctx.restore();
}

/** Which panel (index), 'title' or nothing lies under a point in preview pixels. */
function hitTestPreview(x, y) {
  const geo = editor.geometry;
  if (!geo) return null;
  const inside = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const i = geo.panels.findIndex(inside);
  if (geo.titleMode === 'panel' && inside(geo.title)) return 'title';
  return i >= 0 ? i : null;
}

/** Re-renders every control whose state depends on the document. */
function refreshControls() {
  renderSizePresets();
  renderLayoutPicker();
  renderPhotoTray();
  renderPanelControls();
  renderChoiceChips($('letterStylePicker'), LETTER_STYLES, editor.doc.letterStyle, (id) => { editor.doc.letterStyle = id; });
  renderGradePicker();
  renderEffectToggles();
  renderChoiceChips($('framePicker'), FRAME_COLORS.map((f) => ({ ...f, name: `${f.name} border` })), editor.doc.frame, (id) => { editor.doc.frame = id; });
  renderChoiceChips($('backdropPicker'), BACKDROPS, editor.doc.backdrop, (id) => { editor.doc.backdrop = id; });
  $('gradeStrength').value = editor.doc.strength;
  $('gradeContrast').value = editor.doc.contrast;
  $('borderWidth').value = editor.doc.border;
  $('captionKicker').value = editor.doc.caption.kicker;
  $('captionTitle').value = editor.doc.caption.title;
  $('captionSubtitle').value = editor.doc.caption.subtitle;
}

/** A row of pill buttons choosing one of `items`. */
function renderChoiceChips(container, items, current, choose) {
  container.replaceChildren(...items.map((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.name;
    b.setAttribute('aria-pressed', String(item.id === current));
    b.addEventListener('click', () => {
      choose(item.id);
      refreshControls();
      schedulePreview();
    });
    return b;
  }));
}

function renderSizePresets() {
  $('sizePresets').replaceChildren(...Object.values(SIZES).map((size) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<b>${size.label}</b><small>${size.hint}</small>`;
    b.setAttribute('aria-pressed', String(size.id === editor.doc.size));
    b.addEventListener('click', () => {
      changeCoverSize(editor.doc, size.id);
      editor.selected = Math.min(editor.selected, panelCount() - 1);
      refreshControls();
      schedulePreview();
    });
    return b;
  }));
}

/** A small diagram of a layout: photo cells in grey, the caption cell in the grade's accent. */
function drawLayoutThumbnail(canvas, layout, grade) {
  const ctx = canvas.getContext('2d');
  const { width: W, height: H } = canvas;
  ctx.fillStyle = '#0b0614';
  ctx.fillRect(0, 0, W, H);
  const sx = W / layout.cols, sy = H / layout.rows, g = 1.5;
  ctx.fillStyle = '#6d5a8c';
  for (const [x, y, w, h] of layout.panels) ctx.fillRect(x * sx + g, y * sy + g, w * sx - g * 2, h * sy - g * 2);
  const [tx, ty, tw, th] = layout.title.cell;
  ctx.fillStyle = layout.title.mode === 'panel' ? grade.accent : 'rgba(255,195,77,0.85)';
  if (layout.title.mode === 'panel') ctx.fillRect(tx * sx + g, ty * sy + g, tw * sx - g * 2, th * sy - g * 2);
  else ctx.fillRect(tx * sx + tw * sx * 0.1, ty * sy + th * sy * 0.35, tw * sx * 0.8, th * sy * 0.4);
}

function renderLayoutPicker() {
  const size = SIZES[editor.doc.size];
  const grade = gradeById(editor.doc.gradeId);
  $('layoutPicker').replaceChildren(...LAYOUTS[editor.doc.size].map((layout) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(layout.id === editor.doc.layoutId));
    const c = document.createElement('canvas');
    c.width = 112;
    c.height = Math.round((112 * size.h) / size.w);
    drawLayoutThumbnail(c, layout, grade);
    const label = document.createElement('span');
    label.textContent = `${layout.name} · ${layout.panels.length}`;
    b.append(c, label);
    b.addEventListener('click', () => {
      editor.doc.layoutId = layout.id;
      editor.selected = Math.min(editor.selected, layout.panels.length - 1);
      refreshControls();
      schedulePreview();
    });
    return b;
  }));
}

function renderPhotoTray() {
  const slot = editor.doc.panels[editor.selected];
  $('photoTray').replaceChildren(...editor.photos.map((photo) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = `Put ${photo.name} in panel ${editor.selected + 1}`;
    b.setAttribute('aria-pressed', String(slot?.photoId === photo.id));
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.name;
    const remove = document.createElement('span');
    remove.className = 'remove';
    remove.textContent = '×';
    remove.title = 'Remove photo';
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      removePhoto(photo.id);
    });
    b.append(img, remove);
    b.addEventListener('click', () => {
      slot.photoId = photo.id;
      refreshControls();
      schedulePreview();
    });
    return b;
  }));
}

function renderPanelControls() {
  $('panelNumber').textContent = `${editor.selected + 1} of ${panelCount()}`;
  $('panelZoom').value = editor.doc.panels[editor.selected].crop.zoom;
}

function renderGradePicker() {
  $('gradePicker').replaceChildren(...GRADES.map((grade) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = grade.name;
    b.style.background = `linear-gradient(90deg, ${grade.map.join(', ')})`;
    b.setAttribute('aria-pressed', String(grade.id === editor.doc.gradeId));
    b.addEventListener('click', () => {
      editor.doc.gradeId = grade.id;
      refreshControls();
      schedulePreview();
    });
    return b;
  }));
}

const EFFECT_NAMES = { grain: 'Grain', halftone: 'Halftone', bloom: 'Glow', leak: 'Light leak', vignette: 'Vignette' };
function renderEffectToggles() {
  $('effectToggles').replaceChildren(...Object.entries(EFFECT_NAMES).map(([id, name]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = name;
    b.setAttribute('aria-pressed', String(Boolean(editor.doc.effects[id])));
    b.addEventListener('click', () => {
      editor.doc.effects[id] = !editor.doc.effects[id];
      refreshControls();
      schedulePreview();
    });
    return b;
  }));
}

/** Selects a panel (or focuses the title field when the caption's panel is clicked). */
function selectTarget(target) {
  if (target === 'title') {
    $('captionTitle').focus();
    return;
  }
  editor.selected = target;
  renderPanelControls();
  renderPhotoTray();
  schedulePreview();
}

/** The selected panel's preview rect and photo, for crop maths. */
function panelContext(index) {
  const slot = editor.doc.panels[index];
  const photo = slot && editor.photos.find((p) => p.id === slot.photoId)?.image;
  const rect = editor.geometry?.panels[index];
  return photo && rect ? { slot, photo, rect } : null;
}

/** Adds photo files to the library. Dropped on a panel, the first goes there; otherwise they fill the panels. */
async function addPhotos(fileList, target = null) {
  const files = imageFilesFrom(fileList);
  if (!files.length) return;
  const loaded = [];
  for (const file of files) {
    try {
      loaded.push(await loadPhotoFile(file));
    } catch {
      setStatus(`Could not open ${file.name}`);
    }
  }
  if (!loaded.length) return;
  const replacingSamples = editor.photos.every((p) => p.sample);
  if (replacingSamples) editor.photos = [];
  editor.photos.push(...loaded);
  if (typeof target === 'number') {
    editor.doc.panels[target].photoId = loaded[0].id;
    editor.selected = target;
    if (replacingSamples) {
      editor.doc.panels.forEach((slot, i) => {
        if (i !== target) slot.photoId = loaded[i % loaded.length].id;
      });
    }
  } else {
    fillPanelsWithPhotos(editor.doc, editor.photos.map((p) => p.id));
  }
  setStatus(`${loaded.length} photo${loaded.length > 1 ? 's' : ''} added`);
  refreshControls();
  schedulePreview();
}

function removePhoto(id) {
  editor.photos = editor.photos.filter((p) => p.id !== id);
  const ids = editor.photos.map((p) => p.id);
  editor.doc.panels.forEach((slot, i) => {
    if (slot.photoId === id) slot.photoId = ids.length ? ids[i % ids.length] : null;
  });
  refreshControls();
  schedulePreview();
}

let statusTimer = 0;
function setStatus(text) {
  $('exportStatus').textContent = text;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { $('exportStatus').textContent = ''; }, 4000);
}

/** A file name from the caption, such as sunset-boulevard-1920x1080.png. */
function exportFileName() {
  const size = SIZES[editor.doc.size];
  const slug = editor.doc.caption.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
  return `${slug}-${size.w}x${size.h}.png`;
}

/** Encodes a canvas as a PNG blob, on an OffscreenCanvas where the browser has one (it encodes right away). */
async function encodePng(canvas) {
  if (typeof OffscreenCanvas === 'function') {
    const off = new OffscreenCanvas(canvas.width, canvas.height);
    off.getContext('2d').drawImage(canvas, 0, 0);
    return off.convertToBlob({ type: 'image/png' });
  }
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

/** Renders the cover at full post size and downloads it as a PNG. */
async function exportCoverPng() {
  const button = $('exportPng');
  const size = SIZES[editor.doc.size];
  button.disabled = true;
  setStatus(`Rendering ${size.w} x ${size.h}…`);
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  try {
    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    renderCover(canvas, editor.doc, photoMap());
    const blob = await encodePng(canvas);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = exportFileName();
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 120000);
    setStatus(`Saved ${a.download}`);
  } catch (error) {
    setStatus(`Export failed: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

/** The studio's name in its own lettering, for the top bar. */
function drawBrandMark() {
  const canvas = $('brandMark');
  const ctx = canvas.getContext('2d');
  const grade = gradeById('vice');
  const path = new Path2D();
  appendLineToPath(path, 'SUNSET COVER STUDIO', 14, 14, 34, { slant: 0.16 });
  paintLetteredPath(ctx, path, 'gloss', grade, 14, 34);
}

function wireControls() {
  $('photoInput').addEventListener('change', (e) => {
    addPhotos(e.target.files);
    e.target.value = '';
  });
  const zone = $('dropZone');
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragging'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('dragging');
    addPhotos(e.dataTransfer.files);
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    addPhotos(e.dataTransfer.files);
  });

  $('fillPanels').addEventListener('click', () => {
    fillPanelsWithPhotos(editor.doc, editor.photos.map((p) => p.id));
    refreshControls();
    schedulePreview();
  });
  $('panelZoom').addEventListener('input', (e) => {
    const c = panelContext(editor.selected);
    if (!c) return;
    c.slot.crop = zoomCrop(c.slot.crop, c.photo, c.rect, Number(e.target.value) / c.slot.crop.zoom);
    schedulePreview();
  });
  $('panelFlip').addEventListener('click', () => {
    const slot = editor.doc.panels[editor.selected];
    slot.crop = { ...slot.crop, flip: !slot.crop.flip };
    schedulePreview();
  });
  $('panelReset').addEventListener('click', () => {
    editor.doc.panels[editor.selected].crop = { zoom: 1, fx: 0.5, fy: 0.5, flip: false };
    renderPanelControls();
    schedulePreview();
  });
  $('panelEverywhere').addEventListener('click', () => {
    const id = editor.doc.panels[editor.selected].photoId;
    editor.doc.panels.forEach((slot, i) => {
      slot.photoId = id;
      if (i !== editor.selected) slot.crop = startingCrop(i);
    });
    refreshControls();
    schedulePreview();
  });

  for (const [id, key] of [['captionKicker', 'kicker'], ['captionTitle', 'title'], ['captionSubtitle', 'subtitle']]) {
    $(id).addEventListener('input', (e) => {
      editor.doc.caption[key] = e.target.value;
      schedulePreview();
    });
  }
  $('gradeStrength').addEventListener('input', (e) => { editor.doc.strength = Number(e.target.value); schedulePreview(); });
  $('gradeContrast').addEventListener('input', (e) => { editor.doc.contrast = Number(e.target.value); schedulePreview(); });
  $('borderWidth').addEventListener('input', (e) => { editor.doc.border = Number(e.target.value); schedulePreview(); });
  $('exportPng').addEventListener('click', exportCoverPng);
  attachCropNavigator($('cropNavigator'), () => panelContext(editor.selected)?.photo, (fx, fy) => {
    const c = panelContext(editor.selected);
    if (!c) return;
    c.slot.crop = zoomCrop({ ...c.slot.crop, fx, fy }, c.photo, c.rect, 1);
    schedulePreview();
  });
  window.addEventListener('resize', schedulePreview);

  attachPanelGestures(preview, {
    hitTest: hitTestPreview,
    onSelect: selectTarget,
    onPan(index, dx, dy) {
      const c = panelContext(index);
      if (!c) return;
      c.slot.crop = panCrop(c.slot.crop, c.photo, c.rect, dx, dy);
      schedulePreview();
    },
    onZoom(index, factor) {
      const c = panelContext(index);
      if (!c) return;
      c.slot.crop = zoomCrop(c.slot.crop, c.photo, c.rect, factor);
      renderPanelControls();
      schedulePreview();
    },
    onReset(index) {
      editor.doc.panels[index].crop = startingCrop(index);
      renderPanelControls();
      schedulePreview();
    },
    onDropFiles(target, files) {
      addPhotos(files, typeof target === 'number' ? target : null);
    },
  });
}

async function startEditor() {
  drawBrandMark();
  wireControls();
  editor.photos = await Promise.all([loadSamplePhoto('boulevard'), loadSamplePhoto('pier')]);
  fillPanelsWithPhotos(editor.doc, editor.photos.map((p) => p.id));
  const query = new URLSearchParams(location.search);
  if (isShotRequest(query)) {
    await applyShotScene(query, editor, { refreshControls, drawPreview, photoMap });
    return;
  }
  refreshControls();
  drawPreview();
}

startEditor();
