// The photo library: images the person picks or drops, decoded in the browser from local object URLs. Nothing is
// uploaded; each photo is { id, name, image, url, sample }.

let nextPhotoId = 1;

/** True for files the browser can decode as images. */
export function isImageFile(file) {
  return file && (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name));
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not read ${url}`));
    img.src = url;
  });
}

/** Reads a local file into the library's photo shape. */
export async function loadPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const image = await loadImageElement(url);
  return { id: `p${nextPhotoId++}`, name: file.name, image, url, sample: false };
}

/** Loads one of the bundled sample photos under app/samples/. */
export async function loadSamplePhoto(name) {
  const url = `samples/${name}.jpg`;
  const image = await loadImageElement(url);
  return { id: `sample-${name}`, name: `${name}.jpg`, image, url, sample: true };
}

/** The image files among a FileList or DataTransfer's files. */
export function imageFilesFrom(list) {
  return [...(list ?? [])].filter(isImageFile);
}
