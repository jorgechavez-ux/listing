import { useState } from 'react'
import { Pencil, Check, ChevronRight, SkipForward, Sparkles } from 'lucide-react'

export default function QuestionsScreen({ images, productName, questions, onProductNameChange, onGenerate }) {
  const [answers, setAnswers] = useState({})
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(productName)

  const handleSaveName = () => {
    onProductNameChange(nameInput.trim() || productName)
    setEditingName(false)
  }

  const bgImage = images[0]?.url

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12 pt-28">
      <div className="w-full max-w-lg">

        {/* Recognition card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-4">
          <div className="flex items-center gap-4">
            {bgImage && (
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-sm">
                <img src={bgImage} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                He reconocido
              </p>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName() }}
                    className="flex-1 text-base font-bold text-gray-900 border-b-2 border-violet-400 outline-none bg-transparent pb-0.5"
                  />
                  <button
                    onClick={handleSaveName}
                    className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 hover:bg-violet-200 flex items-center justify-center shrink-0 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-900 truncate">
                    {productName || 'Producto'}
                  </span>
                  <button
                    onClick={() => { setNameInput(productName); setEditingName(true) }}
                    className="w-6 h-6 rounded-md text-gray-400 hover:text-violet-600 hover:bg-violet-50 flex items-center justify-center transition-colors shrink-0"
                    title="Corregir detección"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Questions */}
        {questions.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-4">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Una última cosa...</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Completá lo que sepas. Lo que dejés en blanco no se incluye.
              </p>
            </div>
            <div className="px-5 py-5 space-y-4">
              {questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {q.label}
                  </label>
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={q.placeholder}
                    className="w-full px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4 text-sm text-emerald-700 font-medium">
            Tengo todo lo que necesito para armar tu listing.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {questions.length > 0 && (
            <button
              onClick={() => onGenerate({})}
              className="flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium text-gray-500 hover:text-gray-800 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all"
            >
              <SkipForward className="w-4 h-4" />
              Saltar
            </button>
          )}
          <button
            onClick={() => onGenerate(answers)}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 text-white font-semibold text-sm hover:from-violet-700 hover:to-indigo-600 transition-all shadow-md shadow-violet-200 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generar listing
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  )
}
