import { useState, useEffect } from 'react'
import { Mail, LogOut, Loader2, Check, Pencil, X, Zap, CreditCard, RefreshCw, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getUsage } from '../lib/usage'
import { createPortalSession, cancelSubscription, reactivateSubscription } from '../lib/stripe'

const PLAN_META = {
  free:     { label: 'Free',     className: 'bg-gray-100 text-gray-600' },
  pro:      { label: 'Pro',      className: 'bg-violet-100 text-violet-700' },
  business: { label: 'Business', className: 'bg-amber-100 text-amber-700' },
}

function formatDate(iso) {
  if (!iso) return 'end of billing period'
  return new Date(iso).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function AccountPage({ user, onSignOut, onPricing }) {
  const initialName = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const [displayName, setDisplayName] = useState(initialName)
  const [editing, setEditing]         = useState(false)
  const [nameInput, setNameInput]     = useState(initialName)
  const [savingName, setSavingName]   = useState(false)

  const [usage, setUsage]             = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling]     = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError]             = useState(null)

  useEffect(() => {
    getUsage().then(setUsage)
  }, [])

  const handleSaveName = async () => {
    const trimmed = nameInput.trim()
    setSavingName(true)
    await supabase.auth.updateUser({ data: { full_name: trimmed } })
    setDisplayName(trimmed)
    setEditing(false)
    setSavingName(false)
  }

  const handleCancelSubscription = async () => {
    setCancelling(true)
    setError(null)
    try {
      await cancelSubscription()
      setShowCancelModal(false)
      // Reload usage so the 'canceling' status is picked up from DB
      const updated = await getUsage()
      setUsage(updated)
    } catch (err) {
      setError(err.message)
    }
    setCancelling(false)
  }

  const handleReactivate = async () => {
    setReactivating(true)
    setError(null)
    try {
      await reactivateSubscription()
      const updated = await getUsage()
      setUsage(updated)
    } catch (err) {
      setError(err.message)
    }
    setReactivating(false)
  }

  const handleUpdatePayment = async () => {
    setPortalLoading(true)
    setError(null)
    try {
      const url = await createPortalSession('payment_method_update')
      window.location.href = url
    } catch (err) {
      setError(err.message)
      setPortalLoading(false)
    }
  }

  const plan        = usage?.plan || 'free'
  const planMeta    = PLAN_META[plan] || PLAN_META.free
  const isPaid      = plan !== 'free'
  const isCancelling = usage?.cancelling ?? false
  const initials = (displayName || user?.email || '?')[0].toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-md mx-auto px-6 py-12">

        {/* Avatar + identity */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-400 flex items-center justify-center mb-4 shadow-lg shadow-violet-200">
            <span className="text-white text-2xl font-bold">{initials}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {displayName || 'Your account'}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{user?.email}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">

          {/* Display name */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Display name
            </p>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  placeholder="Your name"
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors disabled:opacity-60"
                >
                  {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setEditing(false); setNameInput(displayName) }}
                  className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {displayName || <span className="text-gray-400">Not set</span>}
                </span>
                <button
                  onClick={() => { setEditing(true); setNameInput(displayName) }}
                  className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Email
            </p>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-300 shrink-0" />
              <span className="text-sm text-gray-700">{user?.email}</span>
            </div>
          </div>

          {/* Plan */}
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Plan
            </p>

            {!usage ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                <span className="text-sm text-gray-400">Loading...</span>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Plan badge */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${planMeta.className}`}>
                    {planMeta.label}
                  </span>
                  {isCancelling ? (
                    <span className="text-xs text-orange-500 font-medium">
                      Cancels {formatDate(usage?.currentPeriodEnd)}
                    </span>
                  ) : isPaid ? (
                    <span className="text-xs text-gray-400">Active</span>
                  ) : null}
                </div>

                {/* Usage bar */}
                {usage.limit !== Infinity && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Listings this month</span>
                      <span className="font-medium">{usage.count} / {usage.limit}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all"
                        style={{ width: `${Math.min((usage.count / usage.limit) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {usage.limit === Infinity && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Unlimited listings
                  </p>
                )}

                {/* Cancelled banner */}
                {isCancelling && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-xs text-orange-700 leading-relaxed">
                    Your <strong>{planMeta.label}</strong> plan remains active until{' '}
                    <strong>{formatDate(usage?.currentPeriodEnd)}</strong>. After that you'll move to Free.
                  </div>
                )}

                {error && <p className="text-xs text-red-500">{error}</p>}

                {/* Action buttons */}
                <div className="space-y-2 pt-1">
                  {isCancelling ? (
                    <>
                      <button
                        onClick={handleReactivate}
                        disabled={reactivating}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-semibold hover:from-violet-700 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {reactivating
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <RefreshCw className="w-4 h-4" />}
                        Reactivate subscription
                      </button>
                      <button
                        onClick={onPricing}
                        className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Change plan
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={onPricing}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-sm font-semibold hover:from-violet-700 hover:to-indigo-600 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        {isPaid ? 'Change plan' : 'Upgrade plan'}
                      </button>

                      {isPaid && (
                        <>
                          <button
                            onClick={handleUpdatePayment}
                            disabled={portalLoading}
                            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                          >
                            {portalLoading
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <CreditCard className="w-4 h-4 text-gray-400" />}
                            Update payment method
                          </button>
                          <button
                            onClick={() => setShowCancelModal(true)}
                            className="w-full py-2.5 rounded-xl border border-red-100 text-sm font-semibold text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors"
                          >
                            Cancel subscription
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full mt-4 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>

      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
          <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">

            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-2">Cancel subscription?</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your <strong className="text-gray-700">{planMeta.label}</strong> benefits remain active
              until <strong className="text-gray-700">{formatDate(usage?.currentPeriodEnd)}</strong>.
              After that you'll move to the Free plan (5 listings/month).
            </p>

            {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Keep plan
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
