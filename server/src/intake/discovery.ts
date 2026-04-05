/**
 * Mode C — docs/QUESTION_BANK.md § "Discovery — Mode C".
 * Subset of bank ids shown when `collectionMode === 'discovery'` (no-site / short path).
 *
 * Philosophy: no website = audit value lever is operations & automation, not tech stack.
 * The discovery set is as comprehensive as the full-site path — every domain is covered.
 *
 * Visible count after branching:
 *   generic industry, solo  ~22 questions
 *   hospitality, small team ~27 questions
 *   max (any industry)      ~29 questions
 *
 * Intentionally excluded:
 *   d3  — hours on repetitive work (clients reliably underestimate; low signal quality)
 *   d4  — not_solo branch already gates this correctly
 *   e1/e2/e3 — compliance depth adds friction without changing discovery recommendations
 */
export const DISCOVERY_BANK_IDS = new Set<string>([
  // Section A — Identity, stage, scale (8)
  'a1', 'a2', 'a3', 'a4', 'a6', 'a7', 'a8', 'a9',

  // Section B — Customers, channels, growth history (5 universal)
  'b1', 'b2', 'b3', 'b7', 'b_growth_attempts',

  // Section B — Industry-specific (branched; only shown for matching industry)
  'b_hotel_1', 'b_hotel_2',   // Hospitality
  'b_realestate_1',            // Real Estate
  'b_restaurant_1',            // Restaurant & F&B
  'b_services_1',              // Professional Services
  'b_health_1',                // Healthcare
  'b_marine_1',                // Marine

  // Section C — Digital footprint without a site (6; all branch: no_website)
  'c_nosite_1',       // how people find you online
  'c_nosite_4',       // where inquiries arrive (new)
  'c_nosite_5',       // Google Business presence (new)
  'c_nosite_reviews', // reviews / reputation (new)
  'c_nosite_2',       // planning a website?
  'c_nosite_3',       // social media channels

  // Section D — Conversion pipeline (new: response speed + closing + billing)
  'd1', 'd1a', 'd1b',
  'd_response_time', 'd_closing_flow', 'd_billing_flow',

  // Section D — Operations & Automation depth
  'd2', 'd_automation_attempt',
  'd4a', 'd4b', 'd6', 'd5',

  // Section D — Industry-specific ops (branched)
  'd_hotel_1', 'd_hotel_2',   // Hospitality (PMS, check-in)
  'd_realestate_1',            // Real Estate (portal listings)
  'd_restaurant_1',            // Restaurant (POS)

  // Section F — Goals, urgency, readiness (5)
  'f1', 'f2', 'f7', 'f8', 'f4',
]);

export function isDiscoverySurfaceQuestion(id: string): boolean {
  return DISCOVERY_BANK_IDS.has(id);
}
