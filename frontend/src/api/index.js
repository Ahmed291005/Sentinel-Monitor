import api from './axios'

// ── Auth ──────────────────────────────────────────────
export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout:   ()     => api.post('/auth/logout'),
  me:       ()     => api.get('/auth/me'),
}

// ── Events ────────────────────────────────────────────
export const eventsAPI = {
  getAll:       (params) => api.get('/events', { params }),
  getOne:       (id)     => api.get(`/events/${id}`),
  create:       (data)   => api.post('/events', data),
  updateStatus: (id, status) => api.patch(`/events/${id}/status`, { status }),
  delete:       (id)     => api.delete(`/events/${id}`),
  getStats:     ()       => api.get('/events/stats'),
}

// ── Rules ─────────────────────────────────────────────
export const rulesAPI = {
  getAll:  (params)     => api.get('/rules', { params }),
  getOne:  (id)         => api.get(`/rules/${id}`),
  create:  (data)       => api.post('/rules', data),
  update:  (id, data)   => api.put(`/rules/${id}`, data),
  toggle:  (id)         => api.patch(`/rules/${id}/toggle`),
  test:    (id, payload)=> api.post(`/rules/${id}/test`, { payload }),
  delete:  (id)         => api.delete(`/rules/${id}`),
}

// ── Actions ───────────────────────────────────────────
export const actionsAPI = {
  getAll: () => api.get('/actions'),
}

// ── Logs ──────────────────────────────────────────────
export const logsAPI = {
  getAll:   (params) => api.get('/logs', { params }),
  getOne:   (id)     => api.get(`/logs/${id}`),
  getStats: ()       => api.get('/logs/stats'),
}

// ── Simulation ────────────────────────────────────────
export const simAPI = {
  start:     (data) => api.post('/simulation/start', data),
  stop:      ()     => api.post('/simulation/stop'),
  getStatus: ()     => api.get('/simulation/status'),
  fire:      (type) => api.post('/simulation/fire', { type }),
}

// ── Analytics (DBMS Lab Features) ────────────────────────
export const analyticsAPI = {
  getSummary:         () => api.get('/analytics/summary'),
  getDashboard:       () => api.get('/analytics/dashboard'),
  getActiveAlerts:    () => api.get('/analytics/active-alerts'),
  getPipeline:        () => api.get('/analytics/pipeline'),
  getTopRules:        () => api.get('/analytics/top-rules'),
  getRollup:          () => api.get('/analytics/rollup'),
  getCube:            () => api.get('/analytics/cube'),
  getUntriggered:     () => api.get('/analytics/untriggered-rules'),
  getTimeline:        () => api.get('/analytics/timeline'),
}
