// Part 2: specimens frame (run after part1-styles)

function T(name) {
  const s = figma.getLocalTextStyles().find((x) => x.name === name);
  return s;
}
function E(name) {
  return figma.getLocalEffectStyles().find((x) => x.name === name);
}

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
    throw new Error('GLC variable collection not found — create collection "GLC" first');
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

await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
await figma.loadFontAsync({ family: 'Space Grotesk', style: 'Bold' });
await figma.loadFontAsync({ family: 'Space Grotesk', style: 'Medium' });

const shadowXs = E('GLC / Shadow / xs');
const shadowSm = E('GLC / Shadow / sm');
const tsLabel = T('GLC / Label / semibold');
const tsBodyXs = T('GLC / Body / xs');

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
} else root.cornerRadius = 12;
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
  if (tsLabel) h.textStyleId = tsLabel.id;
  bindFill(h, 'text/tertiary');
  sec.appendChild(h);
  return sec;
}

const typoSec = section('TYPOGRAPHY (theme.css)');
const sampleDefs = [
  ['Display 4xl (2.4375rem)', 'GLC / Display / 4xl', 'text/primary'],
  ['Display 3xl', 'GLC / Display / 3xl', 'text/primary'],
  ['Display 2xl', 'GLC / Display / 2xl', 'text/primary'],
  ['Display xl', 'GLC / Display / xl', 'text/primary'],
  ['Body lg', 'GLC / Body / lg', 'text/secondary'],
  ['Body base', 'GLC / Body / base', 'text/secondary'],
  ['Body sm', 'GLC / Body / sm', 'text/secondary'],
  ['Body xs', 'GLC / Body / xs', 'text/tertiary'],
];
for (const [label, styleName, colorTok] of sampleDefs) {
  const st = T(styleName);
  if (!st) continue;
  const row = figma.createFrame();
  row.layoutMode = 'VERTICAL';
  row.primaryAxisSizingMode = 'AUTO';
  row.counterAxisSizingMode = 'AUTO';
  row.itemSpacing = 4;
  row.fills = [];
  const t = figma.createText();
  t.characters = label + ' — The quick brown fox';
  t.textStyleId = st.id;
  bindFill(t, colorTok);
  row.appendChild(t);
  typoSec.appendChild(row);
}

const spaceSec = section('SPACING (space/* width)');
const spaceRow = figma.createFrame();
spaceRow.name = 'Spacing scale';
spaceRow.layoutMode = 'HORIZONTAL';
spaceRow.primaryAxisSizingMode = 'AUTO';
spaceRow.counterAxisSizingMode = 'AUTO';
spaceRow.itemSpacing = 16;
spaceRow.fills = [];
for (const sn of ['space/3-5', 'space/4', 'space/6', 'space/8', 'space/10']) {
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
  if (tsBodyXs) cap.textStyleId = tsBodyXs.id;
  bindFill(cap, 'text/tertiary');
  cell.appendChild(bar);
  cell.appendChild(cap);
  spaceRow.appendChild(cell);
}
spaceSec.appendChild(spaceRow);

const shSec = section('SHADOWS');
const shRow = figma.createFrame();
shRow.layoutMode = 'HORIZONTAL';
shRow.itemSpacing = 24;
shRow.fills = [];
shRow.primaryAxisSizingMode = 'AUTO';
shRow.counterAxisSizingMode = 'AUTO';
function shadowCard(label, eff) {
  const c = figma.createFrame();
  c.resize(140, 88);
  c.name = 'card ' + label;
  bindFill(c, 'bg/surface');
  if (eff) c.effectStyleId = eff.id;
  const t = figma.createText();
  t.characters = label;
  if (tsBodyXs) t.textStyleId = tsBodyXs.id;
  t.x = 12;
  t.y = 12;
  bindFill(t, 'text/secondary');
  c.appendChild(t);
  return c;
}
if (shadowXs) shRow.appendChild(shadowCard('shadow-xs', shadowXs));
if (shadowSm) shRow.appendChild(shadowCard('shadow-sm', shadowSm));
shSec.appendChild(shRow);

root.appendChild(typoSec);
root.appendChild(spaceSec);
root.appendChild(shSec);
found.appendChild(root);

return { rootId: root.id };
