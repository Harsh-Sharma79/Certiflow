/**
 * API Route: /api/projects/:id/generate
 *
 * POST - Generate certificates for all recipients
 * Uses server-side Canvas rendering via @napi-rs/canvas
 * Generates PNG certificates and packages them into a ZIP
 */
import { getServiceClient, getUserId } from '../../lib/supabase.js'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import archiver from 'archiver'
import { Writable } from 'stream'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = await getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const { id: projectId } = req.query
  const supabase = getServiceClient()

  try {
    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single()

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    if (!project.template_url) {
      return res.status(400).json({ error: 'No template uploaded' })
    }

    // Get fields
    const { data: fields } = await supabase
      .from('certificate_fields')
      .select('*')
      .eq('project_id', projectId)

    if (!fields?.length) {
      return res.status(400).json({ error: 'No certificate fields configured' })
    }

    // Get recipients
    const { data: recipients } = await supabase
      .from('recipients')
      .select('*')
      .eq('project_id', projectId)

    if (!recipients?.length) {
      return res.status(400).json({ error: 'No recipients found' })
    }

    // Update project status
    await supabase
      .from('projects')
      .update({ status: 'generating', updated_at: new Date().toISOString() })
      .eq('id', projectId)

    // Load template image
    const templateResponse = await fetch(project.template_url)
    const templateBuffer = Buffer.from(await templateResponse.arrayBuffer())
    const templateImage = await loadImage(templateBuffer)

    // Create canvas with same dimensions as template
    const canvas = createCanvas(templateImage.width, templateImage.height)
    const ctx = canvas.getContext('2d')

    // Generate certificates and collect PNG buffers
    const certBuffers = []

    for (const recipient of recipients) {
      const data = recipient.data || recipient

      // Clear canvas and draw template
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height)

      // Draw each field
      for (const field of fields) {
        const value = getFieldValue(field.field_name, data)
        if (!value) continue

        const x = (field.x_position / 100) * canvas.width
        const y = (field.y_position / 100) * canvas.height

        ctx.font = `${field.font_weight || 'normal'} ${field.font_size || 36}px ${field.font_family || 'Arial'}`
        ctx.fillStyle = field.font_color || '#000000'
        ctx.textBaseline = 'middle'
        ctx.textAlign = field.text_align || 'center'

        // Text shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
        ctx.shadowBlur = 3
        ctx.shadowOffsetX = 1
        ctx.shadowOffsetY = 1

        ctx.fillText(value, x, y)

        // Reset shadow
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0
      }

      // Export as PNG buffer
      const pngBuffer = canvas.toBuffer('image/png')
      const safeName = (data.name || 'Certificate')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50)

      certBuffers.push({
        name: `${safeName}_Certificate.png`,
        buffer: pngBuffer,
        recipientId: recipient.id,
      })
    }

    // Create ZIP archive
    const zipChunks = []
    const writableStream = new Writable({
      write(chunk, encoding, callback) {
        zipChunks.push(chunk)
        callback()
      },
    })

    await new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 6 } })
      archive.pipe(writableStream)

      for (const cert of certBuffers) {
        archive.append(cert.buffer, { name: cert.name })
      }

      archive.on('error', reject)
      archive.on('end', resolve)
      archive.finalize()
    })

    const zipBuffer = Buffer.concat(zipChunks)

    // Upload ZIP to Supabase Storage
    const zipPath = `${userId}/${projectId}/certificates.zip`

    const { error: uploadError } = await supabase.storage
      .from('generated')
      .upload(zipPath, zipBuffer, {
        contentType: 'application/zip',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generated')
      .getPublicUrl(zipPath)

    // Update project
    await supabase
      .from('projects')
      .update({
        zip_url: urlData.publicUrl,
        certificate_count: recipients.length,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    return res.status(200).json({
      zip_url: urlData.publicUrl,
      certificate_count: recipients.length,
    })
  } catch (error) {
    console.error('Generation error:', error)

    // Update project status on error
    await supabase
      .from('projects')
      .update({ status: 'error', updated_at: new Date().toISOString() })
      .eq('id', projectId)

    return res.status(500).json({ error: error.message || 'Generation failed' })
  }
}

/**
 * Get field value from recipient data based on placeholder name.
 */
function getFieldValue(fieldName, data) {
  const mapping = {
    '{{NAME}}': data.name || data.Name || '',
    '{{COURSE}}': data.course || data.Course || '',
    '{{DATE}}': data.date || data.Date || '',
  }

  if (mapping[fieldName] !== undefined) return mapping[fieldName]

  const normalizedField = fieldName.toUpperCase()
  for (const [key, value] of Object.entries(mapping)) {
    if (key.toUpperCase() === normalizedField) return value
  }

  const match = fieldName.match(/^\{\{(\w+)\}\}$/)
  if (match) {
    return data[match[1].toLowerCase()] || ''
  }

  return ''
}
