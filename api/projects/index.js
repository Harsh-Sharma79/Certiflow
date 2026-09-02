/**
 * API Route: /api/projects
 *
 * GET  - List all projects for the authenticated user
 * POST - Create a new project
 */
import { getServiceClient, getUserId } from '../lib/supabase.js'

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Authenticate
  const userId = await getUserId(req)
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = getServiceClient()

  // GET - List projects
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return res.status(200).json({ projects: data })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  // POST - Create project
  if (req.method === 'POST') {
    try {
      const { name, description } = req.body

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Project name is required' })
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: name.trim(),
          description: (description || '').trim(),
        })
        .select()
        .single()

      if (error) throw error
      return res.status(201).json({ project: data })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
