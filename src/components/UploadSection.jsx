import { useState, useRef, useCallback } from 'react'
import { Upload, X, ImagePlus, Sparkles, Copy, Check, AlertCircle, ChevronRight, SkipForward } from 'lucide-react'
import { analyzeForQuestions, generateListing } from '../lib/gemini'

export default function UploadSection() {
  const [images, setImages] = useState([])
  const [details, setDetails] = useState('')
  const [dragging, setDragging] = useState(false)

  // Multi-step state
  const [step, setStep] = useState('upload') // 'upload' | 'questions' | 'result'
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState([])
  const [productName, setProductName] = useState('')
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const inputRef = useRef(null)

  const addFiles = (files) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const previews = imageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      id: Math.random().toString(36).slice(2),
    }))
    setImages((prev) => [...prev, ...previews])
    setResult(null)
    setError(null)
    setStep('upload')
  }

  const removeImage = (id) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === id)
      if (removed) URL.revokeObjectURL(removed.url)
      return prev.filter((img) => img.id !== id)
    })
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  // Step 1: analyze photo and check for questions
  const handleFirstStep = async () => {
    if (images.length === 0) return
    setError(null)
    setAnalyzing(true)

    try {
      const analysis = await analyzeForQuestions(images[0].file, details)

      if (analysis.needsQuestions && analysis.questions?.length > 0) {
        setProductName(analysis.productName || 'tu producto')
        setQuestions(analysis.questions)
        setAnswers({})
        setStep('questions')
      } else {
        // No questions needed, go straight to generate
        await runGenerate({})
      }
    } catch (err) {
      setError(err.message || 'Algo salió mal. Intentá de nuevo.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Step 2: generate listing (with or without answers)
  const runGenerate = async (answersToUse) => {
    setGenerating(true)
    setError(null)

    try {
      const files = images.map((img) => img.file)
      const listing = await generateListing(files, details, answersToUse)
      setResult(listing)
      setStep('result')
    } catch (err) {
      setError(err.message || 'Algo salió mal. Intentá de nuevo.')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerate = () => runGenerate(answers)
  const handleSkip = () => runGenerate({})

  const handleCopy = async () => {
    const text = `${result.title}\n\n${result.description}\n\nPrecio: ${result.price}\nCategoría: ${result.category}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setStep('upload')
    setResult(null)
    setQuestions([])
    setAnswers({})
    setError(null)
  }

  const hasImages = images.length > 0
  const isLoading = analyzing || generating

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Image upload zone — always visible unless result */}
      {step !== 'result' && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !hasImages && inputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-200
            ${dragging ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-violet-400 hover:bg-gray-50'}
            ${hasImages ? 'p-4 cursor-default' : 'p-12 flex flex-col items-center justify-center gap-3 cursor-pointer'}
          `}
        >
          {!hasImages ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                <Upload className="w-6 h-6 text-violet-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-800">Sube las fotos de tu producto</p>
                <p className="text-sm text-gray-400 mt-1">Arrastrá acá o hacé click para elegir · JPG, PNG, WEBP</p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
              <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-violet-400 hover:bg-violet-50 flex items-center justify-center transition-all"
              >
                <ImagePlus className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>
      )}

      {/* Extra details — only on upload step */}
      {hasImages && step === 'upload' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Algo extra que la IA deba saber? <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Ej: lo compré hace 6 meses, tiene un rayón chico atrás, incluye accesorios originales..."
            rows={3}
            className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none outline-none"
          />
        </div>
      )}

      {/* First step button */}
      {hasImages && step === 'upload' && (
        <button
          onClick={handleFirstStep}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold text-base hover:from-violet-700 hover:to-indigo-600 transition-all shadow-lg shadow-violet-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analizando foto...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate listing
            </>
          )}
        </button>
      )}

      {/* Questions step */}
      {step === 'questions' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-6 py-4 bg-violet-50 border-b border-violet-100">
            <div className="flex items-center gap-2 text-violet-700">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Detecté que es {productName}</span>
            </div>
            <p className="text-sm text-violet-600 mt-0.5">
              Respondé lo que sepas para un listing más preciso. Podés dejar en blanco lo que no sabés.
            </p>
          </div>

          {/* Questions */}
          <div className="px-6 py-5 space-y-4">
            {questions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{q.label}</label>
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="w-full px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                />
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-6 pb-5 flex gap-3">
            <button
              onClick={handleSkip}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              Saltar
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold text-sm hover:from-violet-700 hover:to-indigo-600 transition-all shadow-md shadow-violet-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  Generar listing
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {step === 'result' && result && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-violet-600">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Tu listing está listo</span>
            </div>
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Nuevo listing
            </button>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Título</p>
            <p className="font-semibold text-gray-900">{result.title}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Descripción</p>
            <p className="text-gray-700 text-sm leading-relaxed">{result.description}</p>
          </div>

          <div className="flex gap-6">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Precio sugerido</p>
              <p className="font-semibold text-gray-900">{result.price}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Categoría</p>
              <p className="font-semibold text-gray-900">{result.category}</p>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <><Check className="w-4 h-4" /> Copiado</>
            ) : (
              <><Copy className="w-4 h-4" /> Copiar descripción</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
