/**
 * API Route: /api/projects/:id/download
 *
 * GET - Get a signed download URL for the project's ZIP file
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

  try {
    // Verify ownership and get zip_url
    const { data: project } = await supabase
      .from('projects')
      .select('zip_url, name')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    if (!project.zip_url) {
      return res.status(404).json({ error: 'No generated certificates available' })
    }

    return res.status(200).json({
      url: project.zip_url,
      filename: `${project.name || 'Certificates'}_All.zip`,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
