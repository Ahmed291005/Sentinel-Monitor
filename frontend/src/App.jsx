import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './components/common/Toast'
import Layout            from './components/common/Layout'
import LoginPage         from './pages/LoginPage'
import DashboardPage     from './pages/DashboardPage'
import EventsPage        from './pages/EventsPage'
import RulesPage         from './pages/RulesPage'
import LogsPage          from './pages/LogsPage'
import AgentPage         from './pages/AgentPage'
import SystemMonitorPage from './pages/SystemMonitorPage'
import AnalyticsPage    from './pages/AnalyticsPage'
import NotFoundPage      from './pages/NotFoundPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#050810]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#00d4ff] border-t-transparent rounded-full spin mx-auto mb-4"/>
        <p className="text-[#475569] text-sm font-mono">Initializing Sentinel...</p>
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute><Layout /></ProtectedRoute>
            }>
              <Route index           element={<DashboardPage />} />
              <Route path="events"   element={<EventsPage />} />
              <Route path="rules"    element={<RulesPage />} />
              <Route path="logs"     element={<LogsPage />} />
              <Route path="agent"    element={<AgentPage />} />
              <Route path="monitor"    element={<SystemMonitorPage />} />
              <Route path="analytics"  element={<AnalyticsPage />} />
              <Route path="*"          element={<NotFoundPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
