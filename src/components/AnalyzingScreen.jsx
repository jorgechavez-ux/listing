import { useState, useEffect } from 'react'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { analyzeForQuestions, generateListing } from '../lib/gemini'
import { MultiStepLoader } from './MultiStepLoader'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const ANALYZE_STATES = [
  { text: 'Uploading images' },
  { text: 'Recognizing product' },
  { text: 'Searching the web' },
  { text: 'Preparing your listing' },
]

const GENERATE_STATES = [
  { text: 'Processing information' },
  { text: 'Writing your listing' },
]

export default function AnalyzingScreen({ mode, images, details, answers, productName, productContext, onDone }) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState(null)

  const states = mode === 'generate' ? GENERATE_STATES : ANALYZE_STATES

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        if (mode === 'analyze') {
          setStep(0) // Uploading images

          // Start API in parallel with the UX steps
          const apiPromise = analyzeForQuestions(images[0].file, details)

          await sleep(800)
          if (cancelled) return
          setStep(1) // Recognizing product

          await sleep(1500)
          if (cancelled) return
          setStep(2) // Searching the web

          // Wait for the full result (identify + search + analyze)
          const result = await apiPromise
          if (cancelled) return

          setStep(3) // Preparing
          await sleep(400)
          if (!cancelled) onDone(result)

        } else {
          setStep(0)
          const files = images.map((img) => img.file)
          const apiPromise = generateListing(files, details, answers || {}, productContext || '')

          await sleep(800)
          if (cancelled) return
          setStep(1)

          const result = await apiPromise
          if (cancelled) return

          await sleep(400)
          if (!cancelled) onDone(result)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Algo salió mal. Intentá de nuevo.')
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  if (error) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center pt-16 bg-white">
        <div className="w-full max-w-sm mx-6 space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => onDone({ error })}
            className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <MultiStepLoader
      loadingStates={states}
      value={step}
      loading={true}
    />
  )
}
