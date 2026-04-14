// Paste into use_figma `code` (fileKey: DwfuqT3PTp9CLv8fVEGXGJ). skillNames: figma-use,figma-generate-library

const found = figma.root.children.find((p) => p.name === '01 Foundations');
await figma.setCurrentPageAsync(found);

for (const ch of [...found.children]) {
  if (ch.name === 'Foundations / Specimens') ch.remove();
}

const vars = await figma.variables.getLocalVariablesAsync();
const vMap = Object.fromEntries(vars.map((v) => [v.name, v]));
const colls = await figma.variables.getLocalVariableCollectionsAsync();
let coll = colls.find((c) => c.name === 'GLC');
if (!coll) {
  try {
    coll = await figma.variables.getVariableCollectionByIdAsync('VariableCollectionId:1:2');
  } catch (e) {
    throw new Error('GLC variable collection not found');
  }
}
const modeId = coll.modes[0].modeId;

function bindFill(node, varName) {
  const v = vMap[varName];
  if (!v || v.resolvedType !== 'COLOR') return;
  const val = v.valuesByMode[modeId];
  let paint = { type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } };
  if (val && typeof val === 'object' && 'r' in val) paint = { type: 'SOLID', color: { r: val.r, g: val.g, b: val.b } };
  node.fills = [figma.variables.setBoundVariableForPaint(paint, 'color', v)];
}

await figma.loadFontAsync({ family: 'Space Grotesk', style: 'Bold' });
await figma.loadFontAsync({ family: 'Space Grotesk', style: 'Medium' });
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });

function makeTextStyle(name, font, size, lineHeightPx) {
  let existing = figma.getLocalTextStyles().find((s) => s.name === name);
  if (existing) return existing;
  const s = figma.createTextStyle();
  s.name = name;
  s.fontName = font;
  s.fontSize = size;
  s.lineHeight = { unit: 'PIXELS', value: lineHeightPx };
  return s;
}

const ts = {
  d4xl: makeTextStyle('GLC / Display / 4xl', { family: 'Space Grotesk', style: 'Bold' }, 39, 42),
  d3xl: makeTextStyle('GLC / Display / 3xl', { family: 'Space Grotesk', style: 'Bold' }, 31, 36),
  d2xl: makeTextStyle('GLC / Display / 2xl', { family: 'Space Grotesk', style: 'Bold' }, 25, 30),
  xl: makeTextStyle('GLC / Display / xl', { family: 'Space Grotesk', style: 'Medium' }, 20, 26),
  bodyLg: makeTextStyle('GLC / Body / lg', { family: 'Inter', style: 'Regular' }, 17, 26),
  bodyBase: makeTextStyle('GLC / Body / base', { family: 'Inter', style: 'Regular' }, 15, 24),
  bodySm: makeTextStyle('GLC / Body / sm', { family: 'Inter', style: 'Regular' }, 13, 20),
  bodyXs: makeTextStyle('GLC / Body / xs', { family: 'Inter', style: 'Regular' }, 11, 16),
  label: makeTextStyle('GLC / Label / semibold', { family: 'Inter', style: 'Semi Bold' }, 11, 14),
};

function makeEffectStyle(name, effects) {
  let e = figma.getLocalEffectStyles().find((s) => s.name === name);
  if (e) {
    e.effects = effects;
    return e;
  }
  const s = figma.createEffectStyle();
  s.name = name;
  s.effects = effects;
  return s;
}

const shadowXs = makeEffectStyle('GLC / Shadow / xs', [
  {
    type: 'DROP_SHADOW',
    color: { r: 11 / 255, g: 17 / 255, b: 32 / 255, a: 0.04 },
    offset: { x: 0, y: 1 },
    radius: 2,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  },
]);

const shadowSm = makeEffectStyle('GLC / Shadow / sm', [
  {
    type: 'DROP_SHADOW',
    color: { r: 11 / 255, g: 17 / 255, b: 32 / 255, a: 0.07 },
    offset: { x: 0, y: 1 },
    radius: 3,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  },
  {
    type: 'DROP_SHADOW',
    color: { r: 11 / 255, g: 17 / 255, b: 32 / 255, a: 0.04 },
    offset: { x: 0, y: 1 },
    radius: 2,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  },
]);

const root = figma.createFrame();
root.name = 'Foundations / Specimens';
root.x = 64;
root.y = 64;
root.layoutMode = 'VERTICAL';
root.primaryAxisSizingMode = 'AUTO';
root.counterAxisSizingMode = 'AUTO';
root.paddingLeft = root.paddingRight = 48;
root.paddingTop = root.paddingBottom = 48;
root.itemSpacing = 48;
const rLg = vMap['radius/lg'];
if (rLg) {
  root.setBoundVariable('topLeftRadius', rLg);
  root.setBoundVariable('topRightRadius', rLg);
  root.setBoundVariable('bottomLeftRadius', rLg);
  root.setBoundVariable('bottomRightRadius', rLg);
} else {
  root.cornerRadius = 12;
}
bindFill(root, 'bg/surface');
const borderV = vMap['border/subtle'];
if (borderV) {
  const sp = { type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } };
  root.strokes = [figma.variables.setBoundVariableForPaint(sp, 'color', borderV)];
  root.strokeWeight = 1;
}

function section(title) {
  const sec = figma.createFrame();
  sec.name = 'Section / ' + title;
  sec.layoutMode = 'VERTICAL';
  sec.primaryAxisSizingMode = 'AUTO';
  sec.counterAxisSizingMode = 'AUTO';
  sec.itemSpacing = 16;
  sec.fills = [];
  const h = figma.createText();
  h.characters = title;
  h.textStyleId = ts.label.id;
  bindFill(h, 'text/tertiary');
  sec.appendChild(h);
  return sec;
}

const typoSec = section('TYPOGRAPHY (theme.css — font-display / font-sans)');
const samples = [
  ['Display 4xl (2.4375rem)', ts.d4xl, 'text/primary'],
  ['Display 3xl', ts.d3xl, 'text/primary'],
  ['Display 2xl', ts.d2xl, 'text/primary'],
  ['Display xl', ts.xl, 'text/primary'],
  ['Body lg (1.0625rem)', ts.bodyLg, 'text/secondary'],
  ['Body base (0.9375rem)', ts.bodyBase, 'text/secondary'],
  ['Body sm', ts.bodySm, 'text/secondary'],
  ['Body xs', ts.bodyXs, 'text/tertiary'],
];
for (const [label, style, colorTok] of samples) {
  const row = figma.createFrame();
  row.layoutMode = 'VERTICAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.itemSpacing = 4;
  row.fills = [];
  const t = figma.createText();
  t.characters = label + ' — The quick brown fox';
  t.textStyleId = style.id;
  bindFill(t, colorTok);
  row.appendChild(t);
  typoSec.appendChild(row);
}

const spaceSec = section('SPACING (width bound to space/* variables)');
const spaceRow = figma.createFrame();
spaceRow.name = 'Spacing scale';
spaceRow.layoutMode = 'HORIZONTAL';
spaceRow.primaryAxisSizingMode = 'AUTO';
spaceRow.counterAxisSizingMode = 'AUTO';
spaceRow.itemSpacing = 16;
spaceRow.fills = [];
const spaceTokens = ['space/3-5', 'space/4', 'space/6', 'space/8', 'space/10'];
for (const sn of spaceTokens) {
  const cell = figma.createFrame();
  cell.layoutMode = 'VERTICAL';
  cell.itemSpacing = 8;
  cell.primaryAxisSizingMode = 'AUTO';
  cell.counterAxisSizingMode = 'AUTO';
  cell.fills = [];
  const bar = figma.createFrame();
  bar.name = 'bar ' + sn;
  bar.resize(4, 40);
  bindFill(bar, 'brand/blue');
  const wVar = vMap[sn];
  if (wVar) bar.setBoundVariable('width', wVar);
  const cap = figma.createText();
  cap.characters = sn.replace('space/', '');
  cap.textStyleId = ts.bodyXs.id;
  bindFill(cap, 'text/tertiary');
  cell.appendChild(bar);
  cell.appendChild(cap);
  spaceRow.appendChild(cell);
}
spaceSec.appendChild(spaceRow);

const shSec = section('SHADOWS (effect styles — --shadow-xs / --shadow-sm)');
const shRow = figma.createFrame();
shRow.layoutMode = 'HORIZONTAL';
shRow.itemSpacing = 24;
shRow.fills = [];
shRow.primaryAxisSizingMode = 'AUTO';
shRow.counterAxisSizingMode = 'AUTO';
function shadowCard(label, effectStyle) {
  const c = figma.createFrame();
  c.resize(140, 88);
  c.name = 'card ' + label;
  bindFill(c, 'bg/surface');
  c.effectStyleId = effectStyle.id;
  const t = figma.createText();
  t.characters = label;
  t.textStyleId = ts.bodyXs.id;
  t.x = 12;
  t.y = 12;
  bindFill(t, 'text/secondary');
  c.appendChild(t);
  return c;
}
shRow.appendChild(shadowCard('shadow-xs', shadowXs));
shRow.appendChild(shadowCard('shadow-sm', shadowSm));
shSec.appendChild(shRow);

root.appendChild(typoSec);
root.appendChild(spaceSec);
root.appendChild(shSec);
found.appendChild(root);

return {
  rootId: root.id,
  textStyleIds: Object.fromEntries(Object.entries(ts).map(([k, s]) => [k, s.id])),
  effectStyleIds: { xs: shadowXs.id, sm: shadowSm.id },
};
