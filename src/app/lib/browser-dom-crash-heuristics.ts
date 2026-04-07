/**
 * When built-in page translation or aggressive extensions rewrite the DOM, React often throws
 * NotFoundError / HierarchyRequestError with insertBefore or removeChild. We never show these
 * strings as primary UI; use only to pick friendlier recovery copy.
 */
export function isLikelyTranslationOrExtensionDomCrash(detail: string | undefined): boolean {
  if (!detail) return false;
  const m = detail.toLowerCase();
  return (
    m.includes('insertbefore') ||
    m.includes('removechild') ||
    m.includes('notfounderror') ||
    m.includes('hierarchyrequesterror')
  );
}
