import { useState } from 'react'
import { Copy, Check, Sparkles, ChevronLeft, ChevronRight, Zap } from 'lucide-react'

export default function ResultScreen({ images, result: initialResult, onReset, onRegenerate }) {
  const [result, setResult] = useState(initialResult)
  const [activeImage, setActiveImage] = useState(0)
  const [copied, setCopied] = useState(false)

  const update = (field, value) => setResult((prev) => ({ ...prev, [field]: value }))

  const handleCopy = async () => {
    const text = `${result.title}\n\n${result.description}\n\nPrecio: ${result.price}\nCategoría: ${result.category}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const prevImage = () => setActiveImage((i) => (i - 1 + images.length) % images.length)
  const nextImage = () => setActiveImage((i) => (i + 1) % images.length)

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">

          {/* ── LEFT: Images ── */}
          <div className="space-y-3">
            {/* Main image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-sm group">
              <img
                src={images[activeImage]?.url}
                alt=""
                className="w-full h-full object-cover transition-opacity duration-200"
              />

              {/* AI enhanced badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded-full">
                <Zap className="w-3 h-3 text-yellow-400" />
                Mejorada con IA
              </div>

              {/* Nav arrows (only if multiple images) */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {/* Dot indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          i === activeImage ? 'bg-white w-4' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImage(i)}
                    className={`shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all ${
                      activeImage === i
                        ? 'border-violet-500 shadow-md shadow-violet-100'
                        : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Listing card ── */}
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Listing listo para publicar</span>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">
                Título
              </label>
              <input
                value={result.title}
                onChange={(e) => update('title', e.target.value)}
                className="w-full text-xl font-bold text-gray-900 border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-violet-400 outline-none pb-1.5 bg-transparent transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">
                Descripción
              </label>
              <textarea
                value={result.description}
                onChange={(e) => update('description', e.target.value)}
                rows={6}
                className="w-full text-sm text-gray-700 leading-relaxed border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none bg-white"
              />
            </div>

            {/* Price + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">
                  Precio
                </label>
                <input
                  value={result.price}
                  onChange={(e) => update('price', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-bold text-gray-900 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">
                  Categoría
                </label>
                <input
                  value={result.category}
                  onChange={(e) => update('category', e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleCopy}
                className="w-full py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <><Check className="w-4 h-4 text-emerald-400" /> Copiado al portapapeles</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copiar descripción completa</>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onRegenerate}
                  className="py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Pulir con IA
                </button>
                <button
                  disabled
                  className="py-3 rounded-xl border border-dashed border-gray-200 text-sm font-medium text-gray-400 cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  Publicar directo
                  <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-semibold">
                    Pronto
                  </span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
