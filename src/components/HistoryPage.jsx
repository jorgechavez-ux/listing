import { useState, useEffect } from 'react'
import { getUserListings, deleteListing } from '../lib/listings'
import { Sparkles, Trash2, Copy, Check, ChevronDown, ChevronUp, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 10

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ListingRow({ listing, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleCopy = async () => {
    const text = `${listing.title}\n\n${listing.description}\n\nPrice: ${listing.price}\nCategory: ${listing.category}`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(listing.id)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-all">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Product label */}
        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-violet-500" />
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{listing.title}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {listing.product_name && (
              <span className="text-xs text-gray-400">{listing.product_name}</span>
            )}
            <span className="text-xs text-gray-300">·</span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {timeAgo(listing.created_at)}
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="hidden sm:block shrink-0">
          <span className="text-sm font-bold text-gray-900">{listing.price}</span>
        </div>

        {/* Category */}
        <div className="hidden md:block shrink-0">
          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
            {listing.category}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            title="Copy"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-8 h-8 rounded-xl hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
            title="Delete"
          >
            {deleting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Trash2 className="w-4 h-4" />
            }
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded description */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-gray-50">
          <p className="text-sm text-gray-600 leading-relaxed mt-4">{listing.description}</p>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Price</p>
              <p className="text-sm font-bold text-gray-900">{listing.price}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Category</p>
              <p className="text-sm font-semibold text-gray-700">{listing.category}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    getUserListings().then(({ data, error }) => {
      if (error) setError(error.message)
      else setListings(data || [])
      setLoading(false)
    })
  }, [])

  const handleDelete = async (id) => {
    const { error } = await deleteListing(id)
    if (!error) {
      setListings((prev) => {
        const next = prev.filter((l) => l.id !== id)
        // If deleting the last item on a page > 1, go back one page
        const totalPages = Math.max(1, Math.ceil(next.length / PAGE_SIZE))
        if (page > totalPages) setPage(totalPages)
        return next
      })
    }
  }

  const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE))
  const paginated = listings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
          <p className="text-sm text-gray-500 mt-1">
            All your generated listings, saved automatically.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && listings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-violet-400" />
            </div>
            <p className="font-semibold text-gray-800 mb-1">No listings yet</p>
            <p className="text-sm text-gray-400">Once you generate one it will appear here automatically.</p>
          </div>
        )}

        {/* Table header */}
        {!loading && listings.length > 0 && (
          <>
            <div className="hidden sm:grid grid-cols-[1fr_80px_140px_100px] gap-4 px-5 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span>Product</span>
              <span>Price</span>
              <span>Category</span>
              <span></span>
            </div>

            <div className="space-y-2">
              {paginated.map((listing) => (
                <ListingRow key={listing.id} listing={listing} onDelete={handleDelete} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-gray-400">
                {listings.length} listing{listings.length !== 1 ? 's' : ''} ·{' '}
                page {page} of {totalPages}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                        p === page
                          ? 'bg-violet-600 text-white border border-violet-600'
                          : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
