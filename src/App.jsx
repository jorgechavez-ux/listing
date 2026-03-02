import { useState, useEffect, useRef } from 'react'
import { Zap, X } from 'lucide-react'
import Navbar from './components/Navbar'
import UploadHero from './components/UploadHero'
import AnalyzingScreen from './components/AnalyzingScreen'
import QuestionsScreen from './components/QuestionsScreen'
import ResultScreen from './components/ResultScreen'
import PricingPage from './components/PricingPage'
import HistoryPage from './components/HistoryPage'
import AccountPage from './components/AccountPage'
import AuthModal from './components/AuthModal'
import { useAuth } from './hooks/useAuth'
import { getUsage, incrementUsage } from './lib/usage'
import { saveListing } from './lib/listings'
import { enhanceImages } from './lib/imageUtils'
import { FREE_TIER_LIMIT } from './config'

export default function App() {
  const { user, loading: authLoading, signOut: authSignOut } = useAuth()
  const signOut = () => { authSignOut(); handleReset() }

  // Handle Stripe redirect back to the app
  const params = new URLSearchParams(window.location.search)
  const checkoutResult = params.get('checkout') // 'success' | 'cancel'

  const [screen, setScreen] = useState(() => {
    if (params.get('checkout') === 'success') return 'pricing'
    if (params.get('screen') === 'account') return 'account'
    return 'upload'
  })
  const [images, setImages] = useState([])
  const [details, setDetails] = useState('')
  const [productName, setProductName] = useState('')
  const [productContext, setProductContext] = useState('')
  const [forcedProductName, setForcedProductName] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [enhancing, setEnhancing] = useState(false)
  const [lockedPrice, setLockedPrice] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = (message) => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  // Auth modal
  const [showAuth, setShowAuth] = useState(false)
  // Pending action to run after login
  const [pendingStart, setPendingStart] = useState(null)

  // Called when user clicks "Generate listing" in UploadHero
  const handleStart = async (imgs, det) => {
    if (!user) {
      // Save what they wanted to do, then show login
      setPendingStart({ imgs, det })
      setShowAuth(true)
      return
    }

    const { canGenerate } = await getUsage()
    if (!canGenerate) {
      showToast(`You've reached the ${FREE_TIER_LIMIT} free listings limit for this month.`)
      setScreen('pricing')
      return
    }

    setImages(imgs)
    setDetails(det)
    setUploadError(null)
    setScreen('analyzing')
  }

  // Called after successful login
  const handleAuthSuccess = async () => {
    setShowAuth(false)
    if (pendingStart) {
      const { imgs, det } = pendingStart
      setPendingStart(null)
      await handleStart(imgs, det)
    }
  }

  const handleAnalysisDone = (analysis) => {
    if (analysis.error) {
      setUploadError(analysis.error)
      setScreen('upload')
      return
    }
    setProductName(analysis.productName || '')
    setProductContext(analysis._webContext || '')
    setForcedProductName(null) // clear after analysis done
    if (analysis.needsQuestions && analysis.questions?.length > 0) {
      setQuestions(analysis.questions)
      setScreen('questions')
    } else {
      setQuestions([])
      setAnswers({})
      setScreen('generating')
    }
  }

  const handleReanalyze = (correctedName) => {
    setProductName(correctedName)
    setForcedProductName(correctedName)
    setScreen('analyzing')
  }

  const handleGenerate = (ans) => {
    setAnswers(ans)
    setScreen('generating')
  }

  const handleResultDone = async (listing) => {
    if (listing.error) {
      setUploadError(listing.error)
      setScreen('upload')
      return
    }
    // Save to DB and count usage in parallel
    await Promise.all([
      saveListing({
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        productName,
      }),
      incrementUsage(),
    ])
    // Preserve user-edited price if regenerating
    const finalListing = lockedPrice ? { ...listing, price: lockedPrice } : listing
    setLockedPrice(null)

    setResult(finalListing)
    setScreen('result')

    // Only enhance images on first generation — skip if already enhanced
    const alreadyEnhanced = images.some((img) => img.enhanced)
    if (!alreadyEnhanced) {
      setEnhancing(true)
      enhanceImages(images).then((enhanced) => {
        setImages(enhanced)
        setEnhancing(false)
      })
    }
  }

  const handleRegenerate = (currentPrice) => {
    setLockedPrice(currentPrice ?? null)
    setScreen('generating')
  }

  const handlePricing = () => setScreen('pricing')
  const handleHistory = () => setScreen('history')
  const handleAccount = () => setScreen('account')

  const handleReset = () => {
    setImages([])
    setDetails('')
    setProductName('')
    setProductContext('')
    setQuestions([])
    setAnswers({})
    setResult(null)
    setUploadError(null)
    setScreen('upload')
  }

  if (authLoading) return null

  return (
    <>
      <Navbar
        screen={screen}
        user={user}
        onReset={handleReset}
        onPricing={handlePricing}
        onHistory={handleHistory}
        onAccount={handleAccount}
        onSignOut={signOut}
        onSignIn={() => setShowAuth(true)}
      />

      {screen === 'upload' && (
        <UploadHero onStart={handleStart} error={uploadError} />
      )}

      {screen === 'analyzing' && (
        <AnalyzingScreen
          mode="analyze"
          images={images}
          details={details}
          forcedProductName={forcedProductName}
          onDone={handleAnalysisDone}
        />
      )}

      {screen === 'questions' && (
        <QuestionsScreen
          images={images}
          productName={productName}
          questions={questions}
          onReanalyze={handleReanalyze}
          onGenerate={handleGenerate}
          onBack={handleReset}
        />
      )}

      {screen === 'generating' && (
        <AnalyzingScreen
          mode="generate"
          images={images}
          details={details}
          answers={answers}
          productName={productName}
          productContext={productContext}
          onDone={handleResultDone}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          images={images}
          result={result}
          productName={productName}
          enhancing={enhancing}
          onReset={handleReset}
          onRegenerate={handleRegenerate}
        />
      )}

      {screen === 'pricing' && (
        <PricingPage
          onBack={handleReset}
          user={user}
          onSignIn={() => setShowAuth(true)}
          checkoutSuccess={checkoutResult === 'success'}
        />
      )}

      {screen === 'history' && (
        <HistoryPage />
      )}

      {screen === 'account' && (
        <AccountPage
          user={user}
          onSignOut={signOut}
          onPricing={handlePricing}
        />
      )}

      {/* Auth modal — rendered on top of any screen */}
      {showAuth && (
        <AuthModal
          onClose={() => { setShowAuth(false); setPendingStart(null) }}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-2xl shadow-xl max-w-xs animate-fade-in">
          <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <p className="leading-snug">{toast}</p>
          <button onClick={() => setToast(null)} className="shrink-0 text-white/40 hover:text-white/80 transition-colors ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  )
}
