import Navbar from './components/Navbar'
import UploadSection from './components/UploadSection'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <main className="pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-violet-100">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            Impulsado por IA · Gratis para empezar
          </div>

          {/* H1 */}
          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight max-w-2xl">
            Tu listing de{' '}
            <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
              Marketplace
            </span>
            , perfecto en segundos
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-lg text-gray-500 max-w-xl leading-relaxed">
            Subí una foto de lo que querés vender. La IA analiza el producto, escribe una descripción que engancha y mejora tus fotos automáticamente.
          </p>

          {/* Social proof */}
          <div className="mt-4 flex items-center gap-1.5 text-sm text-gray-400">
            <div className="flex -space-x-1.5">
              {['bg-pink-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400'].map((c, i) => (
                <div key={i} className={`w-6 h-6 rounded-full ${c} border-2 border-white`} />
              ))}
            </div>
            <span>+1,200 listings creados esta semana</span>
          </div>

          {/* Upload area */}
          <div className="mt-12 w-full max-w-2xl">
            <UploadSection />
          </div>
        </div>
      </main>
    </div>
  )
}
