/**
 * Maps linear pre-brief submit slot ids into progressive UI steps (contact pair, industry + Other specify).
 */
export function splitPreBriefSlotsIntoQueueSteps(slotIds: readonly string[]): string[][] {
  const set = new Set(slotIds);
  const out: string[][] = [];
  const used = new Set<string>();
  for (const id of slotIds) {
    if (used.has(id)) continue;
    if (id === 'a5' && set.has('a11')) {
      out.push(['a5', 'a11']);
      used.add('a5');
      used.add('a11');
      continue;
    }
    if (id === 'a11') {
      if (!used.has('a11') && !set.has('a5')) {
        out.push(['a11']);
        used.add('a11');
      }
      continue;
    }
    if (id === 'a2' && set.has('intake_industry_specify')) {
      out.push(['a2', 'intake_industry_specify']);
      used.add('a2');
      used.add('intake_industry_specify');
      continue;
    }
    if (id === 'intake_industry_specify' && set.has('a2')) {
      if (used.has('a2')) continue;
      out.push(['a2', 'intake_industry_specify']);
      used.add('a2');
      used.add('intake_industry_specify');
      continue;
    }
    out.push([id]);
    used.add(id);
  }
  return out;
}
