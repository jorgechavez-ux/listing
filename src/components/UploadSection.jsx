import { useState, useRef, useCallback } from 'react'
import { Upload, X, ImagePlus, Sparkles, Copy, Check, AlertCircle } from 'lucide-react'
import { generateListing } from '../lib/gemini'

export default function UploadSection() {
  const [images, setImages] = useState([])
  const [details, setDetails] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
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

  const handleGenerate = async () => {
    if (images.length === 0) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const files = images.map((img) => img.file)
      const listing = await generateListing(files, details)
      setResult(listing)
    } catch (err) {
      setError(err.message || 'Algo salió mal. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    const text = `${result.title}\n\n${result.description}\n\nPrecio: ${result.price}\nCategoría: ${result.category}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasImages = images.length > 0

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Drop zone */}
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

      {/* Extra details */}
      {hasImages && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Algo extra que la IA deba saber? <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Ej: lo compré hace 6 meses, tiene un rayón chico atrás, incluye accesorios originales, precio negociable..."
            rows={3}
            className="w-full text-sm text-gray-700 placeholder-gray-400 resize-none outline-none"
          />
        </div>
      )}

      {/* Generate button */}
      {hasImages && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold text-base hover:from-violet-700 hover:to-indigo-600 transition-all shadow-lg shadow-violet-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analizando fotos...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate listing
            </>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-violet-600">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Tu listing está listo</span>
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
