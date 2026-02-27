import Stripe from 'npm:stripe@14'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const { priceId, plan } = await req.json()
    if (!priceId || !plan) throw new Error('Missing priceId or plan')

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .single()

    if (!sub?.stripe_subscription_id) throw new Error('No active subscription found')

    // Get subscription from Stripe to find the item ID
    const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
    const itemId = subscription.items.data[0].id

    // Update to new price — Stripe prorates automatically:
    //   Upgrade → charges the difference immediately
    //   Downgrade → credits the unused amount to next invoice
    const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'create_prorations',
    })

    // Reflect new plan in DB immediately
    await supabase.from('subscriptions').update({
      plan,
      status: updated.status,
      current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
