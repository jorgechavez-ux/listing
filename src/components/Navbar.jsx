import { LogOut } from 'lucide-react'
import { useState } from 'react'
import logo from '../assets/logo-sl.png'

export default function Navbar({ screen = 'upload', user, onReset, onPricing, onHistory, onSignOut, onSignIn }) {
  const [showUserMenu, setShowUserMenu] = useState(false)

  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || 'Account'

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <button onClick={onReset} className="hover:opacity-80 transition-opacity">
          <img src={logo} alt="SmartListing" className="h-8 w-auto" />
        </button>

        {/* Right side — always the same */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPricing}
            className={`px-4 py-2 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors ${screen === 'pricing' ? 'text-violet-600 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Pricing
          </button>

          {user && (
            <button
              onClick={onHistory}
              className={`px-4 py-2 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors ${screen === 'history' ? 'text-violet-600 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              History
            </button>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-400 flex items-center justify-center">
                  <span className="text-white text-xs font-bold uppercase">
                    {displayName[0]}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                  {displayName}
                </span>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-20 w-44 bg-white rounded-2xl shadow-lg border border-gray-100 py-1 overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); onSignOut() }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-gray-400" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
            >
              Sign in
            </button>
          )}
        </div>

      </div>
    </nav>
  )
}
