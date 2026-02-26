import { Sparkles, Plus } from 'lucide-react'

export default function Navbar({ screen = 'upload', onReset, onRegenerate, onPricing }) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo — always clickable to reset */}
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold">L</span>
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">ListAI</span>
        </button>

        {/* Right side — context-aware */}
        <div className="flex items-center gap-2">
          {screen === 'result' ? (
            // Result screen: show action buttons
            <>
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Sparkles className="w-4 h-4 text-violet-500" />
                Pulir
              </button>
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo listing
              </button>
            </>
          ) : (
            // Default: upload / questions / analyzing
            <>
              <button
                onClick={onPricing}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Pricing
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors">
                Iniciar sesión
              </button>
            </>
          )}
        </div>

      </div>
    </nav>
  )
}
