import { useState, useRef, useCallback } from 'react'
import { Upload, ImagePlus, X, Sparkles, AlertCircle } from 'lucide-react'

export default function UploadHero({ onStart, error }) {
  const [images, setImages] = useState([])
  const [details, setDetails] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const addFiles = (files) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const previews = imageFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      id: Math.random().toString(36).slice(2),
    }))
    setImages((prev) => [...prev, ...previews])
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

  const hasImages = images.length > 0

  return (
    <main className="pt-28 pb-20 px-6">
      <div className="max-w-6xl mx-auto flex flex-col items-center text-center">

        <div className="mb-6 inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-violet-100">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
          Impulsado por IA · Gratis para empezar
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight max-w-2xl">
          Tu listing de{' '}
          <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
            Marketplace
          </span>
          , perfecto en segundos
        </h1>

        <p className="mt-5 text-lg text-gray-500 max-w-xl leading-relaxed">
          Subí una foto de lo que querés vender. La IA analiza el producto, escribe una descripción que engancha y mejora tus fotos automáticamente.
        </p>

        <div className="mt-4 flex items-center gap-1.5 text-sm text-gray-400">
          <div className="flex -space-x-1.5">
            {['bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400'].map((c, i) => (
              <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 border-white`} />
            ))}
          </div>
          <span>+1,200 listings creados esta semana</span>
        </div>

        <div className="mt-12 w-full max-w-2xl space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                  <p className="text-sm text-gray-400 mt-1">Arrastrá acá o hacé click · JPG, PNG, WEBP</p>
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
                ¿Algo extra que la IA deba saber?{' '}
                <span className="text-gray-400 font-normal">(opcional)</span>
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

          {/* CTA */}
          {hasImages && (
            <button
              onClick={() => onStart(images, details)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold text-base hover:from-violet-700 hover:to-indigo-600 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Generate listing
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
