// Part 1: text + effect styles only (run before part2)

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

const names = [];
function add(name, font, size, lh) {
  const s = makeTextStyle(name, font, size, lh);
  names.push(name);
  return s;
}

add('GLC / Display / 4xl', { family: 'Space Grotesk', style: 'Bold' }, 39, 42);
add('GLC / Display / 3xl', { family: 'Space Grotesk', style: 'Bold' }, 31, 36);
add('GLC / Display / 2xl', { family: 'Space Grotesk', style: 'Bold' }, 25, 30);
add('GLC / Display / xl', { family: 'Space Grotesk', style: 'Medium' }, 20, 26);
add('GLC / Body / lg', { family: 'Inter', style: 'Regular' }, 17, 26);
add('GLC / Body / base', { family: 'Inter', style: 'Regular' }, 15, 24);
add('GLC / Body / sm', { family: 'Inter', style: 'Regular' }, 13, 20);
add('GLC / Body / xs', { family: 'Inter', style: 'Regular' }, 11, 16);
add('GLC / Label / semibold', { family: 'Inter', style: 'Semi Bold' }, 11, 14);

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

makeEffectStyle('GLC / Shadow / xs', [
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

makeEffectStyle('GLC / Shadow / sm', [
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

return { ok: true, textStyles: names };
