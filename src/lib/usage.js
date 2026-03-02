import { supabase } from './supabase'
import { PLAN_LIMITS } from '../config'

const currentMonth = () => new Date().toISOString().slice(0, 7)

/**
 * Returns { count, limit, canGenerate, plan, currentPeriodEnd } for the current user.
 * Respects the user's active subscription plan.
 */
export async function getUsage() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0, limit: PLAN_LIMITS.free, canGenerate: false, plan: 'free', currentPeriodEnd: null }

  // Check active subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  const active = sub?.status === 'active' || sub?.status === 'trialing' || sub?.status === 'canceling'
  const plan = active ? (sub?.plan || 'free') : 'free'
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const currentPeriodEnd = sub?.current_period_end ?? null
  const cancelling = sub?.status === 'canceling'

  // Business = unlimited
  if (limit === Infinity) return { count: 0, limit: Infinity, canGenerate: true, plan, currentPeriodEnd, cancelling }

  const meta = user.user_metadata || {}
  const month = currentMonth()
  const count = meta.gen_month === month ? (meta.gen_count ?? 0) : 0

  return { count, limit, canGenerate: count < limit, plan, currentPeriodEnd, cancelling }
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
