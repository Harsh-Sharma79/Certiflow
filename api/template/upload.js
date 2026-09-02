/**
 * API Route: /api/template/upload
 *
 * POST - Upload a certificate template image to Supabase Storage
 *
 * Expects multipart/form-data with:
 * - file: The image file (PNG/JPG)
 * - projectId: The project ID
 */
import { getServiceClient, getUserId } from '../lib/supabase.js'

export const config = {
  api: {
    bodyParser: false,
  },
}

/**
 * Parse multipart form data manually for Vercel serverless.
 * Extracts file buffer and fields from the raw body.
 */
async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => {
      const buffer = Buffer.concat(chunks)
      const boundary = req.headers['content-type']?.split('boundary=')[1]

      if (!boundary) {
        reject(new Error('No boundary found in content-type'))
        return
      }

      const parts = buffer.toString('binary').split('--' + boundary)
      const result = { file: null, fields: {} }

      for (const part of parts) {
        if (part.trim() === '' || part.trim() === '--') continue

        const headerEnd = part.indexOf('\r\n\r\n')
        if (headerEnd === -1) continue

        const header = part.substring(0, headerEnd)
        const body = part.substring(headerEnd + 4)

        // Remove trailing boundary markers
        const cleanBody = body.replace(/\r\n--\s*$/, '')

        if (header.includes('filename=')) {
          // This is a file part
          const contentTypeMatch = header.match(/Content-Type:\s*(.+?)(?:\r\n|$)/i)
          const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream'

          // Extract filename
          const filenameMatch = header.match(/filename="?(.+?)"?(?:\r\n|$)/i)
          const filename = filenameMatch ? filenameMatch[1] : 'upload'

          result.file = {
            buffer: Buffer.from(cleanBody, 'binary'),
            contentType,
            filename,
          }
        } else {
          // This is a regular field
          const nameMatch = header.match(/name="?(.+?)"?(?:\r\n|$)/i)
          if (nameMatch) {
            result.fields[nameMatch[1]] = cleanBody.trim()
          }
        }
      }

      resolve(result)
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Authenticate
  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  try {
    // Parse multipart form data
    const { file, fields } = await parseMultipart(req)

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const projectId = fields.projectId
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.contentType)) {
      return res.status(400).json({ error: 'Only PNG and JPG files are allowed' })
    }

    // Validate file size (10MB max)
    if (file.buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size must be under 10MB' })
    }

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

    // Upload to Supabase Storage
    const extension = file.contentType.includes('png') ? 'png' : 'jpg'
    const storagePath = `${userId}/${projectId}/template.${extension}`

    // Delete existing template if any
    try {
      await supabase.storage.from('templates').remove([`${userId}/${projectId}/template.png`])
      await supabase.storage.from('templates').remove([`${userId}/${projectId}/template.jpg`])
    } catch (e) {
      // Ignore if no existing file
    }

    const { error: uploadError } = await supabase.storage
      .from('templates')
      .upload(storagePath, file.buffer, {
        contentType: file.contentType,
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('templates')
      .getPublicUrl(storagePath)

    // Update project with template URL
    await supabase
      .from('projects')
      .update({
        template_url: urlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    return res.status(200).json({
      url: urlData.publicUrl,
      path: storagePath,
    })
  } catch (error) {
    console.error('Template upload error:', error)
    return res.status(500).json({ error: error.message || 'Upload failed' })
  }
}
