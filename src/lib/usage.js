import { supabase } from './supabase'
import { FREE_TIER_LIMIT } from '../config'

// Returns "YYYY-MM" for the current month
const currentMonth = () => new Date().toISOString().slice(0, 7)

/**
 * Returns { count, limit, canGenerate } for the current user.
 * Usage is stored in user_metadata: { gen_count, gen_month }
 */
export async function getUsage() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0, limit: FREE_TIER_LIMIT, canGenerate: false }

  const meta = user.user_metadata || {}
  const month = currentMonth()

  // Reset counter if it's a new month
  const count = meta.gen_month === month ? (meta.gen_count ?? 0) : 0
  const limit = FREE_TIER_LIMIT // swap for plan-based limit later

  return { count, limit, canGenerate: count < limit }
}

/**
 * Increments the user's generation count for the current month.
 * Call this AFTER a successful generation.
 */
export async function incrementUsage() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const meta = user.user_metadata || {}
  const month = currentMonth()
  const currentCount = meta.gen_month === month ? (meta.gen_count ?? 0) : 0

  await supabase.auth.updateUser({
    data: {
      gen_count: currentCount + 1,
      gen_month: month,
    },
  })
}
