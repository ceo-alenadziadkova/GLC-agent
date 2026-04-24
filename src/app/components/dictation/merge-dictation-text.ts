/** Join a new finalized speech segment with existing field text. */
export function mergeAppendedText(current: string, chunk: string): string {
  const t = current.trim();
  const c = chunk.trim();
  if (!c) {
    return current;
  }
  if (!t) {
    return c;
  }
  return `${t} ${c}`;
}
