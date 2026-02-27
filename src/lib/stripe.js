import { supabase } from './supabase'

export async function createCheckoutSession(priceId, plan) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { priceId, plan },
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data.url
}

export async function createPortalSession(flow = null) {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: { flow },
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data.url
}

export async function reactivateSubscription() {
  const { data, error } = await supabase.functions.invoke('reactivate-subscription', {})
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

export async function cancelSubscription() {
  const { data, error } = await supabase.functions.invoke('cancel-subscription', {})
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data // { success, currentPeriodEnd }
}

export async function changePlan(priceId, plan) {
  const { data, error } = await supabase.functions.invoke('change-plan', {
    body: { priceId, plan },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

export async function getUserPlan() {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .single()

  if (error || !data) return 'free'
  const active = data.status === 'active' || data.status === 'trialing'
  return active ? (data.plan || 'free') : 'free'
}
