import { supabase } from './supabase'
import { PLAN_LIMITS } from '../config'

const currentMonth = () => new Date().toISOString().slice(0, 7)

/**
 * Returns { count, limit, canGenerate } for the current user.
 * Respects the user's active subscription plan.
 */
export async function getUsage() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0, limit: PLAN_LIMITS.free, canGenerate: false }

  // Check active subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', user.id)
    .single()

  const active = sub?.status === 'active' || sub?.status === 'trialing'
  const plan = active ? (sub?.plan || 'free') : 'free'
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free

  // Business = unlimited
  if (limit === Infinity) return { count: 0, limit: Infinity, canGenerate: true }

  const meta = user.user_metadata || {}
  const month = currentMonth()
  const count = meta.gen_month === month ? (meta.gen_count ?? 0) : 0

  return { count, limit, canGenerate: count < limit, plan }
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
