import { useState, useEffect } from 'react'
import { Check, Zap, Loader2, PartyPopper, X } from 'lucide-react'
import { createCheckoutSession, changePlan, cancelSubscription } from '../lib/stripe'
import { getUsage } from '../lib/usage'

const PRICE_IDS = {
  pro_monthly:      import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
  pro_yearly:       import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY,
  business_monthly: import.meta.env.VITE_STRIPE_PRICE_BIZ_MONTHLY,
  business_yearly:  import.meta.env.VITE_STRIPE_PRICE_BIZ_YEARLY,
}

const PLAN_ORDER = { free: 0, pro: 1, business: 2 }

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

function formatDate(iso) {
  if (!iso) return 'end of billing period'
  return new Date(iso).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function PricingPage({ onBack, user, onSignIn, checkoutSuccess }) {
  const [yearly, setYearly] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState(null)
  const [error, setError] = useState(null)

  // Current plan state
  const [currentPlan, setCurrentPlan] = useState(null)        // null = loading
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(null)

  // Confirmation modal state
  const [modal, setModal] = useState(null) // { plan, priceId, type: 'upgrade'|'downgrade'|'cancel'|'checkout' }
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)

  // Success message after plan change
  const [successMsg, setSuccessMsg] = useState(null)

  // Clean up ?checkout=success from URL
  useEffect(() => {
    if (checkoutSuccess) {
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      window.history.replaceState({}, '', url.toString())
    }
  }, [checkoutSuccess])

  // Load current plan
  useEffect(() => {
    if (user) {
      getUsage().then((u) => {
        setCurrentPlan(u.plan || 'free')
        setCurrentPeriodEnd(u.currentPeriodEnd)
      })
    } else {
      setCurrentPlan('free')
    }
  }, [user])

  const handleCTA = async (plan) => {
    if (!user) { onSignIn(); return }
    if (plan.key === currentPlan) return // already on this plan — button is disabled

    const priceKey = `${plan.key}_${yearly ? 'yearly' : 'monthly'}`
    const priceId = PRICE_IDS[priceKey]

    // Free plan → cancel subscription
    if (plan.key === 'free') {
      setModal({ plan, priceId: null, type: 'cancel' })
      return
    }

    // Free user → paid plan: go to checkout
    if (currentPlan === 'free') {
      if (!priceId) { setError('Price not configured yet.'); return }
      setLoadingPlan(plan.key)
      setError(null)
      try {
        const url = await createCheckoutSession(priceId, plan.key)
        window.location.href = url
      } catch (err) {
        setError(err.message)
        setLoadingPlan(null)
      }
      return
    }

    // Paid → different paid plan: show confirmation modal
    if (!priceId) { setError('Price not configured yet.'); return }
    const type = PLAN_ORDER[plan.key] > PLAN_ORDER[currentPlan] ? 'upgrade' : 'downgrade'
    setModal({ plan, priceId, type })
    setModalError(null)
  }

  const handleConfirm = async () => {
    setModalLoading(true)
    setModalError(null)
    try {
      if (modal.type === 'cancel') {
        await cancelSubscription()
        setSuccessMsg(`Your ${plans.find(p => p.key === currentPlan)?.name} benefits remain active until ${formatDate(currentPeriodEnd)}. After that you'll move to Free.`)
        setCurrentPlan('free')
      } else {
        await changePlan(modal.priceId, modal.plan.key)
        setSuccessMsg(`You're now on ${modal.plan.name}! Your plan has been updated.`)
        setCurrentPlan(modal.plan.key)
      }
      setModal(null)
    } catch (err) {
      setModalError(err.message)
    }
    setModalLoading(false)
  }

  // Derive button label per plan card
  const getButtonLabel = (plan) => {
    if (currentPlan === null) return plan.cta
    if (plan.key === currentPlan) return 'Current plan'
    if (!user) return plan.cta
    if (plan.key === 'free') return 'Cancel subscription'
    if (currentPlan === 'free') return plan.cta
    return PLAN_ORDER[plan.key] > PLAN_ORDER[currentPlan] ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`
  }

  const isCurrentPlan = (plan) => currentPlan !== null && plan.key === currentPlan

  // Modal copy
  const getModalContent = () => {
    if (!modal) return {}
    const currentPlanName = plans.find(p => p.key === currentPlan)?.name || 'current'
    if (modal.type === 'upgrade') return {
      title: `Upgrade to ${modal.plan.name}`,
      body: `You'll be upgraded immediately. Stripe will charge the prorated difference for the rest of your current billing period.`,
      cta: 'Upgrade now',
      ctaClass: 'bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-700 hover:to-indigo-600 text-white',
    }
    if (modal.type === 'downgrade') return {
      title: `Downgrade to ${modal.plan.name}`,
      body: `You'll be downgraded immediately. The unused portion of your ${currentPlanName} subscription will be credited to your next invoice.`,
      cta: 'Downgrade now',
      ctaClass: 'bg-gray-900 hover:bg-gray-800 text-white',
    }
    if (modal.type === 'cancel') return {
      title: 'Cancel subscription?',
      body: `Your ${currentPlanName} benefits remain active until ${formatDate(currentPeriodEnd)}. After that you'll move to Free (5 listings/month).`,
      cta: 'Cancel subscription',
      ctaClass: 'bg-red-500 hover:bg-red-600 text-white',
    }
    return {}
  }

  const modalContent = getModalContent()

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-6xl mx-auto px-6 py-20">

        {/* Checkout success banner */}
        {checkoutSuccess && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 mb-10 text-sm text-emerald-800 font-medium">
            <PartyPopper className="w-5 h-5 text-emerald-500 shrink-0" />
            You're now on Pro! Your plan is active — go generate some listings.
          </div>
        )}

        {/* Plan change success banner */}
        {successMsg && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 mb-10 text-sm text-emerald-800">
            <PartyPopper className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
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

        {error && (
          <p className="text-center text-sm text-red-600 mb-6">{error}</p>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan)
            const btnLabel  = getButtonLabel(plan)
            const isLoading = loadingPlan === plan.key

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 flex flex-col gap-6 transition-all ${
                  plan.popular
                    ? 'bg-gray-950 text-white shadow-2xl shadow-gray-900/20 scale-[1.02]'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {/* Top badge: Current plan takes priority over Most popular */}
                {isCurrent ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-emerald-200">
                      Current plan
                    </span>
                  </div>
                ) : plan.popular ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-violet-200">
                      Most popular
                    </span>
                  </div>
                ) : null}

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
                  disabled={isCurrent || isLoading || !!successMsg}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2
                    disabled:cursor-not-allowed
                    ${isCurrent ? 'opacity-50' : ''}
                    ${!isCurrent && plan.ctaStyle === 'solid'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white hover:from-violet-700 hover:to-indigo-600 shadow-lg shadow-violet-500/25'
                      : !isCurrent && plan.popular
                      ? 'border border-gray-700 text-gray-300 hover:bg-gray-800'
                      : !isCurrent
                      ? 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                      : plan.popular
                      ? 'border border-gray-700 text-gray-500'
                      : 'border border-gray-200 text-gray-400'
                    }`}
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {btnLabel}
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
            )
          })}
        </div>

        <p className="text-center text-sm text-gray-400 mt-10">
          No contracts. Cancel anytime. All plans billed in USD.
        </p>

      </div>

      {/* Confirmation modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !modalLoading && setModal(null)} />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">

            <button
              onClick={() => setModal(null)}
              disabled={modalLoading}
              className="absolute top-5 right-5 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-3 pr-8">{modalContent.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{modalContent.body}</p>

            {modalError && <p className="text-xs text-red-500 mt-3">{modalError}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                disabled={modalLoading}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Go back
              </button>
              <button
                onClick={handleConfirm}
                disabled={modalLoading}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${modalContent.ctaClass}`}
              >
                {modalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {modalContent.cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
