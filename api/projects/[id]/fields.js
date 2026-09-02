/**
 * API Route: /api/projects/:id/fields
 *
 * GET  - Get all certificate fields for a project
 * POST - Save certificate fields (replaces all)
 */
import { getServiceClient, getUserId } from '../../lib/supabase.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { id: projectId } = req.query
  const supabase = getServiceClient()

  // Verify project ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (!project) {
    return res.status(404).json({ error: 'Project not found' })
  }

  // GET - Fetch fields
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('certificate_fields')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return res.status(200).json({ fields: data })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  // POST - Save fields (delete existing, insert new)
  if (req.method === 'POST') {
    try {
      const { fields } = req.body

      if (!Array.isArray(fields)) {
        return res.status(400).json({ error: 'Fields must be an array' })
      }

      // Delete existing fields
      await supabase
        .from('certificate_fields')
        .delete()
        .eq('project_id', projectId)

      // Insert new fields
      if (fields.length > 0) {
        const fieldsToInsert = fields.map(f => ({
          project_id: projectId,
          field_name: f.field_name,
          x_position: f.x_position,
          y_position: f.y_position,
          font_size: f.font_size || 36,
          font_family: f.font_family || 'Arial',
          font_color: f.font_color || '#000000',
          font_weight: f.font_weight || 'normal',
          text_align: f.text_align || 'center',
        }))

        const { data, error } = await supabase
          .from('certificate_fields')
          .insert(fieldsToInsert)
          .select()

        if (error) throw error
        return res.status(200).json({ fields: data })
      }

      return res.status(200).json({ fields: [] })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
