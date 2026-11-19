// Colour grades: each maps a photo's luminance through a gradient (shadows to highlights) and carries the matching
// colours for the title backdrop, the frame accent and the lettering ink.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    map: ['#12062a', '#3d0f5a', '#9e1f6f', '#ea4a5a', '#ff8d3f', '#ffd27a', '#fff0c4'],
    gamma: 1.45,
    accent: '#ff3d8b',
    accent2: '#ffc34d',
    sky: ['#1c0a3d', '#6e1a72', '#e0436e', '#ff9a4d', '#ffd98a'],
    sun: ['#fff4b8', '#ffb347', '#ff3d7f'],
    sea: '#2a0f4a',
    ink: '#160620',
  },
  {
    id: 'neon',
    name: 'Neon Night',
    map: ['#04021a', '#1a0a4f', '#4f148c', '#c41f8a', '#ff4fb8', '#6fe8ff', '#e9fdff'],
    gamma: 1.4,
    accent: '#27e1ff',
    accent2: '#ff2d95',
    sky: ['#03020f', '#140a40', '#3d0f78', '#a01a8c', '#ff3d8b'],
    sun: ['#ffe9fb', '#ff5fbf', '#7c2bff'],
    sea: '#0a0726',
    ink: '#05030f',
  },
  {
    id: 'tide',
    name: 'Teal Tide',
    map: ['#031222', '#0a3550', '#0e7c80', '#d97a45', '#ffb36e', '#fff0d8'],
    gamma: 1.3,
    accent: '#ff7a3d',
    accent2: '#2de0c8',
    sky: ['#061a33', '#0f4c6b', '#1aa3a0', '#ff9a5a', '#ffe0a8'],
    sun: ['#fffbe0', '#ffc26b', '#ff6b3d'],
    sea: '#072a3d',
    ink: '#03101d',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    map: ['#1a0904', '#4f1c0b', '#9e3c16', '#e37a26', '#ffbf55', '#fff0c8'],
    gamma: 1.3,
    accent: '#ffcf3f',
    accent2: '#ff5a36',
    sky: ['#2a0f12', '#7a2418', '#d4561f', '#ffa040', '#ffe6a3'],
    sun: ['#fffbe3', '#ffd25e', '#ff7a2e'],
    sea: '#3a1410',
    ink: '#1a0805',
  },
  {
    id: 'flamingo',
    name: 'Flamingo Duotone',
    map: ['#170c52', '#4a23a0', '#e8448f', '#ffc2dc'],
    gamma: 1.3,
    accent: '#ffe14d',
    accent2: '#ff4f9a',
    sky: ['#14093f', '#3c1d8f', '#a33bc4', '#ff4f9a', '#ffc2dc'],
    sun: ['#fffbd0', '#ffe14d', '#ff4f9a'],
    sea: '#1d1060',
    ink: '#0e0630',
  },
  {
    id: 'noir',
    name: 'Noir Pop',
    map: ['#060609', '#22222b', '#6c6875', '#d2ced8', '#ffffff'],
    gamma: 1.2,
    accent: '#ff2a6d',
    accent2: '#ffd23f',
    sky: ['#050507', '#1b1b22', '#3a2030', '#ff2a6d', '#ffb0c8'],
    sun: ['#ffffff', '#ffb0c8', '#ff2a6d'],
    sea: '#101016',
    ink: '#050507',
  },
];

/** Finds a grade by id, falling back to the first. */
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** Parses '#rrggbb' into [r, g, b]. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const lutCache = new Map();

/** A 256-entry RGB lookup table (Uint8Array of 768) spreading the grade's map colours evenly over luminance. */
export function gradientMapLut(grade) {
  if (lutCache.has(grade.id)) return lutCache.get(grade.id);
  const stops = grade.map.map(hexToRgb);
  const lut = new Uint8Array(768);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const a = Math.min(Math.floor(t), stops.length - 2);
    const f = t - a;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(stops[a][c] + (stops[a + 1][c] - stops[a][c]) * f);
  }
  lutCache.set(grade.id, lut);
  return lut;
}
