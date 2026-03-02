import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { AlertCircle, ArrowLeft, DollarSign, Sparkles, Wand2, Check, Loader2, ChevronRight } from 'lucide-react'
import { analyzeForQuestions, generateListing } from '../lib/gemini'
import { enhanceImages } from '../lib/imageUtils'

const ease = [0.16, 1, 0.3, 1]

function Dots() {
  return (
    <span className="inline-flex gap-0.5 ml-1 mb-0.5 align-middle">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1 h-1 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  )
}

// ── Inline questions form ──────────────────────────────────────────────────────
function QuestionsForm({ questions, productName, marketPrice, imageUrl, onSubmit }) {
  const [ans, setAns] = useState(() =>
    Object.fromEntries(questions.map(q => [q.id, '']))
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="w-full max-w-sm mx-auto px-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {imageUrl && (
          <img src={imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shadow-sm shrink-0" />
        )}
        <div>
          <p className="text-base font-bold text-gray-900 leading-tight">{productName}</p>
          {marketPrice && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-0.5">
              <DollarSign className="w-3 h-3" />
              Avg. {marketPrice}
            </span>
          )}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Questions */}
      <div className="space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          A few quick questions
        </p>
        {questions.map((q, i) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.08, duration: 0.35, ease }}
            className="space-y-1.5"
          >
            <label className="block text-sm font-semibold text-gray-700">{q.label}</label>
            <input
              type="text"
              placeholder={q.placeholder || ''}
              value={ans[q.id]}
              onChange={e => setAns(a => ({ ...a, [q.id]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onSubmit(ans)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder-gray-300"
            />
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 + questions.length * 0.08, duration: 0.35, ease }}
        onClick={() => onSubmit(ans)}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold text-sm hover:from-violet-700 hover:to-indigo-600 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Create listing
        <ChevronRight className="w-4 h-4" />
      </motion.button>
    </motion.div>
  )
}

// ── Analyze loading (cinematic) ────────────────────────────────────────────────
function AnalyzeLoader({ image, phase, discovered }) {
  const hasProduct  = phase !== 'identifying'
  const hasMarket   = ['searched', 'analyzing', 'done'].includes(phase)
  const isSearching = phase === 'searching'

  return (
    <div className="flex flex-col items-center w-full max-w-xs mx-auto px-6 gap-5">
      {/* Image */}
      <motion.div layout transition={{ duration: 0.5, ease }}>
        <div className="relative">
          <img src={image} alt="" className="w-24 h-24 rounded-2xl object-cover shadow-lg" />
          <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </motion.div>

      {/* "Analizando..." */}
      <AnimatePresence>
        {!hasProduct && (
          <motion.p key="analyzing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}
            className="text-sm text-gray-400 font-medium -mt-2"
          >
            Analizando<Dots />
          </motion.p>
        )}
      </AnimatePresence>

      {/* Product name */}
      <AnimatePresence>
        {hasProduct && discovered.productName && (
          <motion.h2 key="name" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.5, ease }}
            className="text-2xl font-bold text-gray-900 text-center leading-tight -mt-1"
          >
            {discovered.productName}
          </motion.h2>
        )}
      </AnimatePresence>

      {/* "Buscando en el mercado..." */}
      <AnimatePresence>
        {isSearching && (
          <motion.p key="searching" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}
            className="text-sm text-gray-400 font-medium -mt-2"
          >
            Buscando en el mercado<Dots />
          </motion.p>
        )}
      </AnimatePresence>

      {/* Market data */}
      <AnimatePresence>
        {hasMarket && (
          <motion.div key="market" initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.45, ease }}
            className="w-full"
          >
            {discovered.price ? (
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">Market avg price</p>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{discovered.price}</p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
                <p className="text-xs text-gray-400 text-center">No market data found — using AI estimate</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Generate loading (two parallel steps) ─────────────────────────────────────
function ParallelStep({ icon: Icon, label, status }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease }}
      className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm"
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-500 ${
        status === 'done'   ? 'bg-emerald-100' :
        status === 'active' ? 'bg-violet-100'  : 'bg-gray-100'
      }`}>
        {status === 'done'    && <Check    className="w-4 h-4 text-emerald-600" />}
        {status === 'active'  && <Loader2  className="w-4 h-4 text-violet-600 animate-spin" />}
        {status === 'pending' && <Icon     className="w-4 h-4 text-gray-400" />}
      </div>
      <span className={`text-sm font-semibold transition-colors duration-300 ${
        status === 'done'   ? 'text-gray-400' :
        status === 'active' ? 'text-gray-900'  : 'text-gray-400'
      }`}>
        {label}
      </span>
    </motion.div>
  )
}

function GenerateLoader({ productName, enhanceStatus, listingStatus }) {
  return (
    <div className="w-full max-w-xs mx-auto px-6 space-y-5">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200 mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Creating your listing</h2>
        {productName && (
          <p className="text-sm text-gray-400 mt-1">
            for <span className="font-semibold text-violet-600">{productName}</span>
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <ParallelStep icon={Wand2}     label="Enhancing images with AI" status={enhanceStatus} />
        <ParallelStep icon={Sparkles}  label="Generating listing"        status={listingStatus} />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AnalyzingScreen({ mode, images, details, answers: initialAnswers, productName, productContext, forcedProductName, onDone }) {
  const [error,       setError]       = useState(null)
  const [phase,       setPhase]       = useState('identifying')
  const [discovered,  setDiscovered]  = useState({ productName: null, price: null })
  const [result,      setResult]      = useState(null)   // analysis result, held until questions answered

  // Generate mode: parallel step status
  const [enhanceStatus, setEnhanceStatus] = useState('active')
  const [listingStatus, setListingStatus] = useState('active')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        if (mode === 'analyze') {
          const res = await analyzeForQuestions(
            images[0].file, details, forcedProductName || null,
            (progress) => {
              if (cancelled) return
              setPhase(progress.phase)
              if (progress.productName) setDiscovered(d => ({ ...d, productName: progress.productName }))
              if (progress.usedPrice)   setDiscovered(d => ({ ...d, price: progress.usedPrice }))
            }
          )
          if (!cancelled) {
            setPhase('done')
            if (res.needsQuestions && res.questions?.length > 0) {
              setResult(res) // show inline questions form
            } else {
              setTimeout(() => { if (!cancelled) onDone(res) }, 400)
            }
          }

        } else {
          // Generate mode: run listing generation + image enhancement in parallel
          const files = images.map(img => img.file)

          const listingPromise = generateListing(files, details, initialAnswers || {}, productContext || '', productName || '')
            .then(r => { if (!cancelled) setListingStatus('done'); return r })

          const enhancePromise = enhanceImages(images)
            .then(r => { if (!cancelled) setEnhanceStatus('done'); return r })

          const [listing, enhanced] = await Promise.all([listingPromise, enhancePromise])

          if (!cancelled) {
            await new Promise(r => setTimeout(r, 400)) // brief pause so user sees both ✓
            onDone(listing, enhanced)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Something went wrong. Please try again.')
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  const handleQuestionsSubmit = (ans) => {
    onDone({ ...result, _inlineAnswers: ans })
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center pt-16 bg-white">
        <div className="w-full max-w-sm mx-6 space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => onDone({ error })}
            className="w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-white pt-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,#ede9fe33,transparent)]" />
      <div className="relative w-full">
        <AnimatePresence mode="wait">

          {/* Analyze: loading phase */}
          {mode === 'analyze' && !result && (
            <motion.div key="analyze-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
              <AnalyzeLoader image={images[0]?.url} phase={phase} discovered={discovered} />
            </motion.div>
          )}

          {/* Analyze: inline questions */}
          {mode === 'analyze' && result && (
            <motion.div key="analyze-questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <QuestionsForm
                questions={result.questions}
                productName={discovered.productName || result.productName}
                marketPrice={discovered.price}
                imageUrl={images[0]?.url}
                onSubmit={handleQuestionsSubmit}
              />
            </motion.div>
          )}

          {/* Generate: parallel steps */}
          {mode === 'generate' && (
            <motion.div key="generate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <GenerateLoader
                productName={productName}
                enhanceStatus={enhanceStatus}
                listingStatus={listingStatus}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
