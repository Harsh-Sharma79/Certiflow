/**
 * API helper for making requests to Vercel serverless functions.
 * Handles authentication headers and error responses.
 */

const API_BASE = '/api'

/**
 * Get the current Supabase session token for API requests.
 */
import { supabase } from './supabase'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()

  const headers = {
    'Content-Type': 'application/json',
  }

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  return headers
}

/**
 * Make an authenticated API request.
 */
async function apiRequest(path, options = {}) {
  const headers = await getAuthHeaders()

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `API request failed: ${response.status}`)
  }

  return data
}

export const api = {
  // Projects
  getProjects: () => apiRequest('/projects'),

  getProject: (id) => apiRequest(`/projects/${id}`),

  createProject: (data) =>
    apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteProject: (id) =>
    apiRequest(`/projects/${id}`, { method: 'DELETE' }),

  // Template
  uploadTemplate: (projectId, file) => {
    return (async () => {
      const headers = await getAuthHeaders()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)

      const response = await fetch(`${API_BASE}/template/upload`, {
        method: 'POST',
        headers: {
          Authorization: headers['Authorization'],
        },
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      return data
    })()
  },

  // Fields
  saveFields: (projectId, fields) =>
    apiRequest(`/projects/${projectId}/fields`, {
      method: 'POST',
      body: JSON.stringify({ fields }),
    }),

  getFields: (projectId) => apiRequest(`/projects/${projectId}/fields`),

  // Recipients
  uploadRecipients: (projectId, csvContent) =>
    apiRequest(`/projects/${projectId}/recipients`, {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    }),

  getRecipients: (projectId) =>
    apiRequest(`/projects/${projectId}/recipients`),

  // Certificates
  generateCertificates: (projectId) =>
    apiRequest(`/projects/${projectId}/generate`, {
      method: 'POST',
    }),

  getGeneratedCertificates: (projectId) =>
    apiRequest(`/projects/${projectId}/generated`),

  getDownloadUrl: (projectId) => apiRequest(`/projects/${projectId}/download`),
}
