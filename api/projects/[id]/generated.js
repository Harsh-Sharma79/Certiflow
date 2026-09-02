/**
 * API Route: /api/projects/:id/generated
 *
 * GET - Get all generated certificate records for a project
 */
import { getServiceClient, getUserId } from '../../lib/supabase.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { id: projectId } = req.query
  const supabase = getServiceClient()

  // Verify ownership
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (!project) return res.status(404).json({ error: 'Project not found' })

  try {
    const { data, error } = await supabase
      .from('generated_certificates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return res.status(200).json({ certificates: data })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
