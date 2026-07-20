import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [form,    setForm]    = useState({ username: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#7c3aed]/10 rounded-full blur-3xl"/>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#00d4ff]/5 rounded-full blur-2xl"/>
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#00d4ff] flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg shadow-[#7c3aed]/30">
            S
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SENTINEL</h1>
          <p className="text-sm text-[#475569] mt-1 font-mono">Autonomous Rule Intelligence</p>
        </div>

        {/* Form */}
        <div className="bg-[#080d1a] border border-[#1a2540] rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-semibold text-white mb-5">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[#f87171] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] text-[#475569] uppercase tracking-widest mb-1.5">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="admin"
                required
                className="w-full bg-[#0d1426] border border-[#1a2540] text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:border-[#00d4ff] transition-colors placeholder:text-[#334155]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#475569] uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
                className="w-full bg-[#0d1426] border border-[#1a2540] text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:border-[#00d4ff] transition-colors placeholder:text-[#334155]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#7c3aed] to-[#00d4ff] text-white font-semibold py-2.5 rounded-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 pt-4 border-t border-[#1a2540]">
            <p className="text-[11px] text-[#334155] uppercase tracking-widest mb-2">Demo credentials</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#475569]">Admin</span>
                <span className="text-[#00d4ff]">admin / Admin@1234</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#475569]">Operator</span>
                <span className="text-[#94a3b8]">operator / Operator@1234</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
