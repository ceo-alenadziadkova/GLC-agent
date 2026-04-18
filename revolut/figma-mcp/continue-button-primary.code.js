// Paste into use_figma `code` (fileKey: DwfuqT3PTp9CLv8fVEGXGJ). Run after continue-foundations.code.js.

let compPage = figma.root.children.find((p) => p.name === '02 Components');
if (!compPage) {
  compPage = figma.createPage();
  compPage.name = '02 Components';
}
await figma.setCurrentPageAsync(compPage);

for (const ch of [...compPage.children]) {
  if (ch.name === 'Button / Primary') ch.remove();
}

const vars = await figma.variables.getLocalVariablesAsync();
const vMap = Object.fromEntries(vars.map((v) => [v.name, v]));
const coll = await figma.variables.getVariableCollectionByIdAsync('VariableCollectionId:1:2');
const modeId = coll.modes[0].modeId;

function bindSolidToVar(node, varName) {
  const v = vMap[varName];
  if (!v || v.resolvedType !== 'COLOR') return false;
  const val = v.valuesByMode[modeId];
  let paint = { type: 'SOLID', color: { r: 0.11, g: 0.73, b: 1 } };
  if (val && typeof val === 'object' && 'r' in val) paint = { type: 'SOLID', color: { r: val.r, g: val.g, b: val.b } };
  node.fills = [figma.variables.setBoundVariableForPaint(paint, 'color', v)];
  return true;
}

await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });

const labelStyle = figma.getLocalTextStyles().find((s) => s.name === 'GLC / Body / sm');

const btn = figma.createComponent();
btn.name = 'Button / Primary';
btn.layoutMode = 'HORIZONTAL';
btn.primaryAxisSizingMode = 'HUG';
btn.counterAxisSizingMode = 'HUG';
btn.primaryAxisAlignItems = 'CENTER';
btn.counterAxisAlignItems = 'CENTER';
btn.itemSpacing = 8;
btn.cornerRadius = 9999;
btn.paddingTop = btn.paddingBottom = 14;
btn.paddingLeft = btn.paddingRight = 32;

if (!bindSolidToVar(btn, 'brand/blue')) {
  btn.fills = [{ type: 'SOLID', color: { r: 28 / 255, g: 189 / 255, b: 1 } }];
}

const txt = figma.createText();
txt.characters = 'Primary action';
if (labelStyle) txt.textStyleId = labelStyle.id;
else {
  txt.fontSize = 14;
  txt.fontName = { family: 'Inter', style: 'Semi Bold' };
}
txt.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

btn.appendChild(txt);
compPage.appendChild(btn);
btn.x = 80;
btn.y = 80;

return { componentId: btn.id, pageId: compPage.id };
