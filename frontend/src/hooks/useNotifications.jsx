import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { logsAPI } from '../api'

const NotifContext = createContext(null)

export function NotifProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [isOpen,        setIsOpen]        = useState(false)
  const intervalRef = useRef(null)
  const prevLogCount = useRef(0)

  const fetchNewLogs = useCallback(async () => {
    try {
      const res  = await logsAPI.getAll({ limit: 10, page: 1 })
      const logs = res.data.data || []
      const total = res.data.pagination?.total || 0

      // If new logs appeared since last check
      if (total > prevLogCount.current && prevLogCount.current !== 0) {
        const newLogs = logs.slice(0, total - prevLogCount.current)
        const newNotifs = newLogs.map(log => ({
          id:        log.id,
          type:      log.outcome,
          eventType: log.event_type,
          title:     log.event_title,
          rule:      log.rule_name,
          action:    log.action_name,
          outcome:   log.outcome,
          time:      log.created_at,
          read:      false,
        }))

        setNotifications(prev => [...newNotifs, ...prev].slice(0, 50))
        setUnreadCount(prev => prev + newNotifs.length)
      }

      prevLogCount.current = total
    } catch {}
  }, [])

  useEffect(() => {
    // Initial load
    fetchNewLogs()
    // Poll every 4 seconds
    intervalRef.current = setInterval(fetchNewLogs, 4000)
    return () => clearInterval(intervalRef.current)
  }, [fetchNewLogs])

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const clearAll = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  return (
    <NotifContext.Provider value={{
      notifications, unreadCount, isOpen, setIsOpen,
      markAllRead, clearAll,
    }}>
      {children}
    </NotifContext.Provider>
  )
}

export const useNotif = () => useContext(NotifContext)
