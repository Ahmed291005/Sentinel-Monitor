import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-6xl font-bold font-mono text-[#1a2540] mb-4">404</div>
      <h2 className="text-xl font-semibold text-white mb-2">Page Not Found</h2>
      <p className="text-sm text-[#475569] mb-6">This route does not exist in Sentinel.</p>
      <button
        onClick={() => navigate('/')}
        className="px-5 py-2 bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] rounded-lg text-sm hover:bg-[rgba(0,212,255,0.2)] transition-all"
      >
        ← Back to Dashboard
      </button>
    </div>
  )
}
