export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold">L</span>
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">ListAI</span>
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-2">
          <a
            href="#pricing"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
          >
            Pricing
          </a>
          <button className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors">
            Iniciar sesión
          </button>
        </div>
      </div>
    </nav>
  )
}
