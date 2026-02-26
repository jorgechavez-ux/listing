import { useState } from 'react'
import Navbar from './components/Navbar'
import UploadHero from './components/UploadHero'
import AnalyzingScreen from './components/AnalyzingScreen'
import QuestionsScreen from './components/QuestionsScreen'
import ResultScreen from './components/ResultScreen'

export default function App() {
  const [screen, setScreen] = useState('upload')
  const [images, setImages] = useState([])
  const [details, setDetails] = useState('')
  const [productName, setProductName] = useState('')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  const handleStart = (imgs, det) => {
    setImages(imgs)
    setDetails(det)
    setUploadError(null)
    setScreen('analyzing')
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

  const handleResultDone = (listing) => {
    if (listing.error) {
      setUploadError(listing.error)
      setScreen('upload')
      return
    }
    setResult(listing)
    setScreen('result')
  }

  const handleRegenerate = () => setScreen('generating')

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

  return (
    <>
      {/* Navbar always visible on every screen */}
      <Navbar screen={screen} onReset={handleReset} onRegenerate={handleRegenerate} />

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
    </>
  )
}
