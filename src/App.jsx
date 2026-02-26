import { useState } from 'react'
import Navbar from './components/Navbar'
import UploadHero from './components/UploadHero'
import AnalyzingScreen from './components/AnalyzingScreen'
import QuestionsScreen from './components/QuestionsScreen'
import ResultScreen from './components/ResultScreen'
import PricingPage from './components/PricingPage'
import HistoryPage from './components/HistoryPage'
import AuthModal from './components/AuthModal'
import { useAuth } from './hooks/useAuth'
import { getUsage, incrementUsage } from './lib/usage'
import { saveListing } from './lib/listings'
import { FREE_TIER_LIMIT } from './config'

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()

  const [screen, setScreen] = useState('upload')
  const [images, setImages] = useState([])
  const [details, setDetails] = useState('')
  const [productName, setProductName] = useState('')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)

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

    const { canGenerate, count } = await getUsage()
    if (!canGenerate) {
      setUploadError(`Alcanzaste el límite de ${FREE_TIER_LIMIT} listings gratuitos este mes. Pasate a Pro para generar más.`)
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
    if (analysis.needsQuestions && analysis.questions?.length > 0) {
      setQuestions(analysis.questions)
      setScreen('questions')
    } else {
      setQuestions([])
      setAnswers({})
      setScreen('generating')
    }
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
    setResult(listing)
    setScreen('result')
  }

  const handleRegenerate = () => setScreen('generating')

  const handlePricing = () => setScreen('pricing')
  const handleHistory = () => setScreen('history')

  const handleReset = () => {
    setImages([])
    setDetails('')
    setProductName('')
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
          onDone={handleAnalysisDone}
        />
      )}

      {screen === 'questions' && (
        <QuestionsScreen
          images={images}
          productName={productName}
          questions={questions}
          onProductNameChange={setProductName}
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
          onDone={handleResultDone}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          images={images}
          result={result}
          onReset={handleReset}
          onRegenerate={handleRegenerate}
        />
      )}

      {screen === 'pricing' && (
        <PricingPage onBack={handleReset} />
      )}

      {screen === 'history' && (
        <HistoryPage />
      )}

      {/* Auth modal — rendered on top of any screen */}
      {showAuth && (
        <AuthModal
          onClose={() => { setShowAuth(false); setPendingStart(null) }}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  )
}
