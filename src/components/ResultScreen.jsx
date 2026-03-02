import { useState, useEffect } from 'react'
import { Copy, Check, Sparkles, ChevronLeft, ChevronRight, Zap, Pencil, ExternalLink, TrendingUp, Download, X } from 'lucide-react'
import { searchSimilarListings } from '../lib/gemini'
import JSZip from 'jszip'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shrink-0"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function EditButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-violet-500 transition-colors shrink-0"
      title="Edit"
    >
      <Pencil className="w-3.5 h-3.5" />
    </button>
  )
}

function SaveButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-7 h-7 rounded-lg bg-violet-50 hover:bg-violet-100 flex items-center justify-center text-violet-500 transition-colors shrink-0"
      title="Save"
    >
      <Check className="w-3.5 h-3.5" />
    </button>
  )
}

export default function ResultScreen({ images: initialImages, result: initialResult, productName, onReset, onRegenerate }) {
  const [result, setResult] = useState(initialResult)
  const [imgs, setImgs] = useState(initialImages)

  const [activeImage, setActiveImage] = useState(0)
  const [editing, setEditing] = useState({ title: false, description: false, price: false, category: false })
  const [similarListings, setSimilarListings] = useState([])
  const [loadingSimilar, setLoadingSimilar] = useState(true)
  const [marketplaceToast, setMarketplaceToast] = useState(false)

  const removeImage = (id) => {
    setImgs((prev) => {
      const next = prev.filter((img) => img.id !== id)
      setActiveImage((ai) => Math.min(ai, Math.max(next.length - 1, 0)))
      return next
    })
  }

  const slugName = (result.title || 'listing').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)

  const downloadImages = async () => {
    const fetchBlob = (url) => fetch(url).then((r) => r.blob())

    if (imgs.length === 1) {
      const blob = await fetchBlob(imgs[0].url)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${slugName}.png`
      a.click()
      URL.revokeObjectURL(a.href)
    } else {
      const zip = new JSZip()
      await Promise.all(
        imgs.map(async (img, i) => {
          const blob = await fetchBlob(img.url)
          zip.file(`${slugName}-${i + 1}.png`, blob)
        })
      )
      const blob = await zip.generateAsync({ type: 'blob' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${slugName}.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    }
  }

  const postOnMarketplace = async () => {
    const text = `${result.title}\n\nPrecio: ${result.price}\n\n${result.description}`
    await navigator.clipboard.writeText(text)
    window.open('https://www.facebook.com/marketplace/create/item', '_blank')
    setMarketplaceToast(true)
    setTimeout(() => setMarketplaceToast(false), 5000)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      searchSimilarListings(productName || result.title, result.price)
        .then(setSimilarListings)
        .finally(() => setLoadingSimilar(false))
    }, 4000)
    return () => clearTimeout(timer)
  }, [])

  const update = (field, value) => setResult((prev) => ({ ...prev, [field]: value }))
  const startEdit = (field) => setEditing((prev) => ({ ...prev, [field]: true }))
  const stopEdit = (field) => setEditing((prev) => ({ ...prev, [field]: false }))

  const prevImage = () => setActiveImage((i) => (i - 1 + imgs.length) % imgs.length)
  const nextImage = () => setActiveImage((i) => (i + 1) % imgs.length)

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">

          {/* ── LEFT: Images ── */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-sm group">
              <img
                src={imgs[activeImage]?.url}
                alt=""
                className="w-full h-full object-cover transition-opacity duration-200"
              />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded-full">
                <Zap className="w-3 h-3 text-yellow-400" /> Enhanced with AI
              </div>

              {imgs.length > 1 && (
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
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {imgs.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={`h-1.5 rounded-full transition-all ${i === activeImage ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {imgs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imgs.map((img, i) => (
                  <div
                    key={img.id}
                    className={`relative shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all group ${
                      activeImage === i
                        ? 'border-violet-500 shadow-md shadow-violet-100'
                        : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setActiveImage(i)}
                    />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove photo"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
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
              <span className="text-sm font-semibold text-gray-700">Your listing is ready</span>
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Title</label>
                <div className="flex items-center gap-1">
                  <CopyButton text={result.title} />
                  {editing.title
                    ? <SaveButton onClick={() => stopEdit('title')} />
                    : <EditButton onClick={() => startEdit('title')} />}
                </div>
              </div>
              {editing.title ? (
                <input
                  autoFocus
                  value={result.title}
                  onChange={(e) => update('title', e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && stopEdit('title')}
                  className="w-full text-xl font-bold text-gray-900 border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all bg-white"
                />
              ) : (
                <p className="text-xl font-bold text-gray-900 leading-snug">{result.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Description</label>
                <div className="flex items-center gap-1">
                  <CopyButton text={result.description} />
                  {editing.description
                    ? <SaveButton onClick={() => stopEdit('description')} />
                    : <EditButton onClick={() => startEdit('description')} />}
                </div>
              </div>
              {editing.description ? (
                <textarea
                  autoFocus
                  value={result.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={6}
                  className="w-full text-sm text-gray-700 leading-relaxed border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none bg-white"
                />
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result.description}</p>
              )}
            </div>

            {/* Price + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Price</label>
                  <div className="flex items-center gap-1">
                    <CopyButton text={result.price} />
                    {editing.price
                      ? <SaveButton onClick={() => stopEdit('price')} />
                      : <EditButton onClick={() => startEdit('price')} />}
                  </div>
                </div>
                {editing.price ? (
                  <input
                    autoFocus
                    value={result.price}
                    onChange={(e) => update('price', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && stopEdit('price')}
                    className="w-full px-3.5 py-2.5 text-sm font-bold text-gray-900 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all bg-white"
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-900">{result.price}</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Category</label>
                  <div className="flex items-center gap-1">
                    <CopyButton text={result.category} />
                    {editing.category
                      ? <SaveButton onClick={() => stopEdit('category')} />
                      : <EditButton onClick={() => startEdit('category')} />}
                  </div>
                </div>
                {editing.category ? (
                  <input
                    autoFocus
                    value={result.category}
                    onChange={(e) => update('category', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && stopEdit('category')}
                    className="w-full px-3.5 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all bg-white"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{result.category}</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={onReset}
                className="w-full py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Done
              </button>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onRegenerate(result.price)}
                  className="py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Regenerate
                </button>
                <button
                  onClick={downloadImages}
                  className="py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {imgs.length === 1 ? 'Descargar' : 'Descargar ZIP'}
                </button>
                <button
                  onClick={postOnMarketplace}
                  className="py-3 rounded-xl border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Marketplace
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ── Similar listings section ── */}
        {(loadingSimilar || similarListings.length > 0) && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-gray-700">Similar listings on the market</h2>
              {loadingSimilar && (
                <span className="text-xs text-gray-400 animate-pulse">Searching...</span>
              )}
            </div>

            {loadingSimilar ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 animate-pulse">
                    <div className="h-3 bg-gray-100 rounded w-16" />
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-5 bg-gray-100 rounded w-20 mt-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {similarListings.map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-2 hover:border-violet-200 hover:shadow-sm transition-all">
                    <span className="text-[10px] font-semibold text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full self-start">
                      {item.source}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.title}</p>
                    <p className="text-lg font-bold text-gray-900">{item.price}</p>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">{item.description}</p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 mt-1 self-start"
                      >
                        View listing
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Toast: marketplace */}
      {marketplaceToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-2xl shadow-xl max-w-sm w-full mx-4 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Datos copiados al portapapeles</p>
            <p className="text-gray-400 text-xs mt-0.5">Pega el título y descripción en el formulario de Marketplace.</p>
          </div>
        </div>
      )}
    </div>
  )
}
