/**
 * API Route: /api/projects/:id/recipients
 *
 * GET  - Get all recipients for a project
 * POST - Upload recipients from CSV content
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

  // GET - Fetch recipients
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('recipients')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return res.status(200).json({ recipients: data })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  // POST - Upload recipients from CSV
  if (req.method === 'POST') {
    try {
      const { csvContent } = req.body

      if (!csvContent) {
        return res.status(400).json({ error: 'CSV content is required' })
      }

      // Parse CSV
      const lines = csvContent.trim().split('\n')
      if (lines.length < 2) {
        return res.status(400).json({ error: 'CSV must have at least a header and one data row' })
      }

      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())

      const nameIdx = headers.indexOf('name')
      const courseIdx = headers.indexOf('course')
      const dateIdx = headers.indexOf('date')

      if (nameIdx === -1 || courseIdx === -1 || dateIdx === -1) {
        return res.status(400).json({
          error: 'CSV must contain Name, Course, and Date columns',
          found: headers.join(', '),
        })
      }

      // Parse rows
      const recipients = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        const name = cells[nameIdx]
        const course = cells[courseIdx]
        const date = cells[dateIdx]

        if (name && course && date) {
          recipients.push({ name, course, date })
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({ error: 'No valid recipient rows found' })
      }

      // Delete existing recipients
      await supabase
        .from('recipients')
        .delete()
        .eq('project_id', projectId)

      // Insert new recipients
      const recipientsToInsert = recipients.map(r => ({
        project_id: projectId,
        data: r,
      }))

      // Insert in batches of 100 to avoid payload limits
      const BATCH_SIZE = 100
      const insertedRecipients = []

      for (let i = 0; i < recipientsToInsert.length; i += BATCH_SIZE) {
        const batch = recipientsToInsert.slice(i, i + BATCH_SIZE)
        const { data, error } = await supabase
          .from('recipients')
          .insert(batch)
          .select()

        if (error) throw error
        insertedRecipients.push(...(data || []))
      }

      return res.status(200).json({
        recipients: insertedRecipients,
        count: insertedRecipients.length,
      })
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
