/**
 * API Route: /api/projects/:id
 *
 * GET    - Get a single project by ID
 * DELETE - Delete a project and all associated data
 */
import { getServiceClient, getUserId } from '../../lib/supabase.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { id } = req.query
  const supabase = getServiceClient()

  // GET - Fetch single project
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        return res.status(404).json({ error: 'Project not found' })
      }
      return res.status(200).json({ project: data })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  // DELETE - Delete project and associated data
  if (req.method === 'DELETE') {
    try {
      // Verify ownership
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (!project) {
        return res.status(404).json({ error: 'Project not found' })
      }

      // Delete associated data (cascading should handle this, but being explicit)
      await supabase.from('generated_certificates').delete().eq('project_id', id)
      await supabase.from('certificate_fields').delete().eq('project_id', id)
      await supabase.from('recipients').delete().eq('project_id', id)
      await supabase.from('projects').delete().eq('id', id)

      // Clean up storage files
      try {
        await supabase.storage.from('templates').remove([`${userId}/${id}/template`])
        await supabase.storage.from('generated').remove([`${userId}/${id}/certificates.zip`])
      } catch (e) {
        // Storage cleanup is best-effort
      }

      return res.status(200).json({ message: 'Project deleted' })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
