import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, ImagePlus, X, Sparkles, AlertCircle, Loader2, Camera, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { processImages } from '../lib/imageUtils'

const TYPING_HINTS = [
  'bought it 6 months ago, works perfectly...',
  'small scratch on the back, barely noticeable...',
  'includes original box and all accessories...',
  'only used 3 times, like new condition...',
  'size M, black, no stains or damage...',
  '2022 model, battery health at 90%...',
  'open to offers, need to sell quickly...',
]

function useTypingPlaceholder(phrases, typingSpeed = 55, deletingSpeed = 28, pauseMs = 1800) {
  const [displayed, setDisplayed] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = phrases[phraseIdx]
    if (!deleting && displayed === current) {
      const t = setTimeout(() => setDeleting(true), pauseMs)
      return () => clearTimeout(t)
    }
    if (deleting && displayed === '') {
      setDeleting(false)
      setPhraseIdx((i) => (i + 1) % phrases.length)
      return
    }
    const t = setTimeout(() => {
      setDisplayed(deleting
        ? displayed.slice(0, -1)
        : current.slice(0, displayed.length + 1)
      )
    }, deleting ? deletingSpeed : typingSpeed)
    return () => clearTimeout(t)
  }, [displayed, deleting, phraseIdx])

  return displayed
}

// Static product sample photos (replace with your own in /public/samples/)
const SAMPLE_PRODUCTS = [
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80&h=80&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=80&h=80&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=80&h=80&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=80&h=80&fit=crop&auto=format',
]

const ease = [0.16, 1, 0.3, 1]

const fadeUp = (delay = 0, distance = 24) => ({
  initial: { opacity: 0, y: distance },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease },
})

export default function UploadHero({ onStart, error }) {
  const [images, setImages]       = useState([])
  const [details, setDetails]     = useState('')
  const [dragging, setDragging]   = useState(false)
  const [processing, setProcessing] = useState(false)
  const inputRef = useRef(null)
  const typingPlaceholder = useTypingPlaceholder(TYPING_HINTS)
  const [viewerIndex, setViewerIndex] = useState(null)

  const openViewer  = (i) => setViewerIndex(i)
  const closeViewer = () => setViewerIndex(null)
  const viewerPrev  = (e) => { e.stopPropagation(); setViewerIndex((i) => (i - 1 + images.length) % images.length) }
  const viewerNext  = (e) => { e.stopPropagation(); setViewerIndex((i) => (i + 1) % images.length) }

  useEffect(() => {
    if (viewerIndex === null) return
    const onKey = (e) => {
      if (e.key === 'Escape')     closeViewer()
      if (e.key === 'ArrowLeft')  setViewerIndex((i) => (i - 1 + images.length) % images.length)
      if (e.key === 'ArrowRight') setViewerIndex((i) => (i + 1) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewerIndex, images.length])

  const addFiles = useCallback(async (files) => {
    setProcessing(true)
    try {
      const processed = await processImages(files)
      setImages((prev) => [...prev, ...processed])
    } catch (e) {
      console.error('Error procesando imágenes:', e)
    } finally {
      setProcessing(false)
    }
  }, [])

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
  }, [addFiles])

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const hasImages = images.length > 0

  return (
    <main className="pt-28 pb-20 px-6 min-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center">

        {/* Badge */}
        <motion.div
          {...fadeUp(0, 16)}
          className="mb-6 inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-violet-100"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
          Sellers close up to 30% faster · Free to start
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.08)}
          className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight max-w-3xl"
        >
          Listings that{' '}
          <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
            actually sell
          </span>
          {' '}— in seconds
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...fadeUp(0.18)}
          className="mt-5 text-lg text-gray-500 max-w-xl leading-relaxed"
        >
          Most buyers scroll past vague listings. Our AI writes titles and descriptions
          that answer every question before it's asked — so buyers hit "buy" instead of moving on.
        </motion.p>

        {/* Social proof */}
        <motion.div
          {...fadeUp(0.28)}
          className="mt-5 flex items-center gap-3"
        >
          <div className="flex -space-x-2">
            {SAMPLE_PRODUCTS.map((src, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full border-2 border-white overflow-hidden shadow-sm"
                style={{ zIndex: SAMPLE_PRODUCTS.length - i }}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-400">
            <span className="font-semibold text-gray-600">+1,200</span> listings created this week
          </p>
        </motion.div>

        {/* Upload area */}
        <motion.div
          {...fadeUp(0.46)}
          className="mt-12 w-full max-w-2xl space-y-4"
        >
          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => !hasImages && !processing && inputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed transition-all duration-200
              ${dragging
                ? 'border-violet-500 bg-violet-50 scale-[1.01]'
                : 'border-gray-200 bg-white hover:border-violet-400 hover:bg-gray-50'}
              ${hasImages || processing
                ? 'p-4 cursor-default'
                : 'p-12 flex flex-col items-center justify-center gap-3 cursor-pointer'}
            `}
          >
            {/* Processing */}
            {processing && (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                <p className="text-sm font-medium text-gray-600">Enhancing with AI...</p>
                <p className="text-xs text-gray-400">Nano Banana 2 is reframing and improving your photos</p>
              </div>
            )}

            {/* Empty state */}
            {!processing && !hasImages && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-violet-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Upload your product photos</p>
                  <p className="text-sm text-gray-400 mt-1">Drag here or click to choose · JPG, PNG, WEBP</p>
                </div>
              </>
            )}

            {/* Image grid */}
            {!processing && hasImages && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {images.map((img, i) => (
                    <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); openViewer(i) }}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      <div className={`absolute bottom-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        img.enhanced ? 'bg-violet-600 text-white' : 'bg-black/50 text-white/70'
                      }`}>
                        {img.enhanced ? '✦ AI enhanced' : '✦ canvas'}
                      </div>
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white drop-shadow" />
                      </div>
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
                <p className="text-xs text-gray-400 text-center">
                  {images.some((i) => i.enhanced) ? 'AI enhanced · 1:1 · 1200×1200px' : '1:1 · 1200×1200px'}
                </p>
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

          {/* Banner: multi-photo tip */}
          <AnimatePresence>
            {!processing && (
              <motion.div
                key="photo-tip"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease }}
                className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-left"
              >
                <Camera className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  <span className="font-semibold">Upload multiple photos</span> — front, back, details and accessories.
                  The more angles you share, the more accurate and complete your listing will be.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Extra details + CTA — animate in when images are added */}
          <AnimatePresence>
            {hasImages && !processing && (
              <>
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.3, ease }}
                  className="bg-white rounded-2xl border border-gray-200 p-4"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anything extra the AI should know?{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={typingPlaceholder}
                    rows={3}
                    className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none outline-none"
                  />
                </motion.div>

                <motion.button
                  key="cta"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.3, delay: 0.05, ease }}
                  onClick={() => onStart(images, details)}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold text-base hover:from-violet-700 hover:to-indigo-600 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate listing
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {/* Image viewer */}
      <AnimatePresence>
        {viewerIndex !== null && (
          <motion.div
            key="viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={closeViewer}
          >
            {/* Close */}
            <button
              onClick={closeViewer}
              className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Counter */}
            {images.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
                {viewerIndex + 1} / {images.length}
              </div>
            )}

            {/* Image */}
            <motion.img
              key={viewerIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              src={images[viewerIndex]?.url}
              alt=""
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Prev / Next */}
            {images.length > 1 && (
              <>
                <button
                  onClick={viewerPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={viewerNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Badge */}
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1.5 rounded-full ${
              images[viewerIndex]?.enhanced ? 'bg-violet-600 text-white' : 'bg-white/10 text-white/60'
            }`}>
              {images[viewerIndex]?.enhanced ? '✦ AI enhanced' : '✦ canvas'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
