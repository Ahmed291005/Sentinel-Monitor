import React, { useState, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  const colors = {
    success: 'border-[rgba(16,185,129,0.3)]  bg-[rgba(16,185,129,0.1)]  text-[#10b981]',
    error:   'border-[rgba(239,68,68,0.3)]   bg-[rgba(239,68,68,0.1)]   text-[#f87171]',
    warning: 'border-[rgba(245,158,11,0.3)]  bg-[rgba(245,158,11,0.1)]  text-[#fbbf24]',
    info:    'border-[rgba(0,212,255,0.3)]   bg-[rgba(0,212,255,0.1)]   text-[#00d4ff]',
  }

  const icons = { success: '✓', error: '✗', warning: '⚠', info: 'ℹ' }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl pointer-events-auto fade-slide ${colors[t.type]}`}
          >
            <span className="font-bold">{icons[t.type]}</span>
            <span className="text-white">{t.message}</span>
            <button onClick={() => remove(t.id)} className="ml-2 opacity-60 hover:opacity-100 text-xs">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
