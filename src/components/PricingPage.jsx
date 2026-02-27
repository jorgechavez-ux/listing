import { useState, useEffect } from 'react'
import { Check, Zap, Loader2, PartyPopper } from 'lucide-react'
import { createCheckoutSession } from '../lib/stripe'

const PRICE_IDS = {
  pro_monthly:      import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
  pro_yearly:       import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY,
  business_monthly: import.meta.env.VITE_STRIPE_PRICE_BIZ_MONTHLY,
  business_yearly:  import.meta.env.VITE_STRIPE_PRICE_BIZ_YEARLY,
}

const plans = [
  {
    key: 'free',
    name: 'Free',
    desc: 'Try it out and see what it can do.',
    monthly: 0,
    yearly: 0,
    cta: 'Get started free',
    ctaStyle: 'border',
    features: [
      '5 listings per month',
      'AI-generated descriptions',
      'Optimized 1:1 images',
      'Smart clarifying questions',
      'Copy to clipboard',
    ],
    missing: ['Advanced image enhancement', 'Listing history', 'Priority support'],
  },
  {
    key: 'pro',
    name: 'Pro',
    desc: 'For regular sellers who want real results.',
    monthly: 9,
    yearly: 7,
    cta: 'Start Pro',
    ctaStyle: 'solid',
    popular: true,
    features: [
      '60 listings per month',
      'Enhanced AI descriptions',
      'Optimized 1:1 images',
      'Smart clarifying questions',
      'Advanced image enhancement',
      'Listing history',
      'Priority support',
    ],
    missing: [],
  },
  {
    key: 'business',
    name: 'Business',
    desc: 'For resellers and high-volume stores.',
    monthly: 29,
    yearly: 23,
    cta: 'Talk to sales',
    ctaStyle: 'border',
    features: [
      'Unlimited listings',
      'Enhanced AI descriptions',
      'Optimized 1:1 images',
      'Smart clarifying questions',
      'Advanced image enhancement',
      'Listing history',
      'API access',
      'Multiple users',
      'Dedicated support',
    ],
    missing: [],
  },
]

export default function PricingPage({ onBack, user, onSignIn, checkoutSuccess }) {
  const [yearly, setYearly] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState(null)

  // Clean up ?checkout=success from the URL after showing the banner
  useEffect(() => {
    if (checkoutSuccess) {
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      window.history.replaceState({}, '', url.toString())
    }
  }, [checkoutSuccess])

  const handleCTA = async (plan) => {
    console.log('[Pricing] handleCTA', { planKey: plan.key, user: !!user, yearly })

    if (plan.key === 'free') {
      onBack()
      return
    }

    if (!user) {
      console.log('[Pricing] no user → showing sign in modal')
      onSignIn()
      return
    }

    const priceKey = `${plan.key}_${yearly ? 'yearly' : 'monthly'}`
    const priceId = PRICE_IDS[priceKey]
    console.log('[Pricing] priceKey:', priceKey, 'priceId:', priceId)

    if (!priceId) {
      setError('Price not configured yet.')
      return
    }

    setLoadingPlan(plan.key)
    setError(null)

    try {
      const url = await createCheckoutSession(priceId, plan.key)
      console.log('[Pricing] checkout URL:', url)
      window.location.href = url
    } catch (err) {
      console.error('[Pricing] error:', err.message)
      setError(err.message)
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-6xl mx-auto px-6 py-20">

        {/* Success banner */}
        {checkoutSuccess && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 mb-10 text-sm text-emerald-800 font-medium">
            <PartyPopper className="w-5 h-5 text-emerald-500 shrink-0" />
            You're now on Pro! Your plan is active — go generate some listings.
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-violet-100 mb-5">
            <Zap className="w-3.5 h-3.5" />
            Simple pricing, no surprises
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Choose your plan
          </h1>
          <p className="text-lg text-gray-500 max-w-md mx-auto">
            Start free. Scale when you need to.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                !yearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                yearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Yearly
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                −20%
              </span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-center text-sm text-red-600 mb-6">{error}</p>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-7 flex flex-col gap-6 transition-all ${
                plan.popular
                  ? 'bg-gray-950 text-white shadow-2xl shadow-gray-900/20 scale-[1.02]'
                  : 'bg-white border border-gray-200'
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-violet-200">
                    Most popular
                  </span>
                </div>
              )}

              {/* Plan info */}
              <div>
                <p className={`text-sm font-semibold mb-1 ${plan.popular ? 'text-violet-400' : 'text-violet-600'}`}>
                  {plan.name}
                </p>
                <p className={`text-sm leading-relaxed ${plan.popular ? 'text-gray-400' : 'text-gray-500'}`}>
                  {plan.desc}
                </p>
              </div>

              {/* Price */}
              <div className="flex items-end gap-1.5">
                <span className={`text-5xl font-extrabold tracking-tight ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                  ${yearly ? plan.yearly : plan.monthly}
                </span>
                {plan.monthly > 0 && (
                  <span className={`text-sm font-medium pb-2 ${plan.popular ? 'text-gray-500' : 'text-gray-400'}`}>
                    / mo
                  </span>
                )}
                {plan.monthly === 0 && (
                  <span className={`text-sm font-medium pb-2 ${plan.popular ? 'text-gray-500' : 'text-gray-400'}`}>
                    forever
                  </span>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleCTA(plan)}
                disabled={loadingPlan === plan.key}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                  plan.ctaStyle === 'solid'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white hover:from-violet-700 hover:to-indigo-600 shadow-lg shadow-violet-500/25'
                    : plan.popular
                    ? 'border border-gray-700 text-gray-300 hover:bg-gray-800'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {loadingPlan === plan.key && <Loader2 className="w-4 h-4 animate-spin" />}
                {plan.cta}
              </button>

              {/* Divider */}
              <div className={`h-px ${plan.popular ? 'bg-gray-800' : 'bg-gray-100'}`} />

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      plan.popular ? 'bg-violet-500/20' : 'bg-violet-50'
                    }`}>
                      <Check className={`w-2.5 h-2.5 ${plan.popular ? 'text-violet-400' : 'text-violet-600'}`} />
                    </div>
                    <span className={plan.popular ? 'text-gray-300' : 'text-gray-600'}>{f}</span>
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm opacity-35">
                    <div className="mt-0.5 w-4 h-4 rounded-full border border-gray-300 shrink-0" />
                    <span className="text-gray-400 line-through">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-sm text-gray-400 mt-10">
          No contracts. Cancel anytime. All plans billed in USD.
        </p>

      </div>
    </div>
  )
}
