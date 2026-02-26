// ─── Generation limits per plan ───────────────────────────────────────────────
// Change FREE_TIER_LIMIT to adjust how many listings a free user gets per month.
export const FREE_TIER_LIMIT = 5

export const PLAN_LIMITS = {
  free:     5,
  pro:      60,
  business: Infinity,
}
