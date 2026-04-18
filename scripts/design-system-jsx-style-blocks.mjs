/**
 * Shared helpers: multiline JSX `style={{ ... }}` blocks and visual key detection.
 * Used by design-system-enforcement-check and design-system-primitive-boundary-check.
 */

export const INLINE_STYLE_VISUAL_KEYS = [
  'color',
  'background',
  'backgroundColor',
  'fontSize',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'border',
  'borderColor',
  'borderWidth',
  'borderRadius',
  'boxShadow',
  'textShadow',
  'filter',
];

/**
 * JSX `style={{ ... }}` may span lines; balance `{`/`}` from the opening `{` of the
 * outer `{ ... }` expression.
 */
export function extractJsxExpressionBlocksOpeningWithDoubleBrace(content) {
  const blocks = [];
  const re = /\bstyle=\{\{/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const exprOpen = m.index + 'style='.length;
    const end = findMatchingBraceEnd(content, exprOpen);
    if (end === -1) continue;
    const block = content.slice(exprOpen, end + 1);
    const startLine = content.slice(0, exprOpen).split('\n').length;
    blocks.push({ startLine, block });
  }
  return blocks;
}

export function findMatchingBraceEnd(content, openBraceIndex) {
  let depth = 0;
  let inStr = null;
  let escape = false;
  let inTemplateExpr = false;

  for (let i = openBraceIndex; i < content.length; i++) {
    const c = content[i];

    if (inStr === '`') {
      if (inTemplateExpr) {
        if (c === '}') {
          inTemplateExpr = false;
          continue;
        }
        continue;
      }
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '$' && content[i + 1] === '{') {
        inTemplateExpr = true;
        i++;
        continue;
      }
      if (c === '`') {
        inStr = null;
        continue;
      }
      continue;
    }

    if (inStr === '"' || inStr === "'") {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === inStr) {
        inStr = null;
        continue;
      }
      continue;
    }

    if (c === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && content[i + 1] === '*') {
      i += 2;
      while (i < content.length - 1 && !(content[i] === '*' && content[i + 1] === '/')) i++;
      i++;
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      inStr = c;
      continue;
    }

    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

export function styleBlockHasVisualKey(block) {
  return INLINE_STYLE_VISUAL_KEYS.some((key) => new RegExp(`\\b${key}\\s*:`).test(block));
}
