/**
 * Certificate Generator - renders certificates using the HTML Canvas API.
 *
 * This runs entirely in the browser. It loads the template image,
 * then draws each dynamic field at the configured position, size, and style.
 *
 * All positions use percentage-based coordinates for responsive rendering.
 */

/**
 * Render a single certificate as a PNG data URL.
 *
 * @param {string} templateUrl - URL of the certificate template image
 * @param {Array} fields - Array of field configs with positions and styles
 * @param {Object} recipientData - Recipient data: { name, course, date }
 * @returns {Promise<string>} PNG data URL of the rendered certificate
 */
export async function renderCertificate(templateUrl, fields, recipientData) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height
        const ctx = canvas.getContext('2d')

        // Draw template background
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Draw each field
        for (const field of fields) {
          const value = getFieldValue(field.field_name, recipientData)
          if (!value) continue

          // Calculate pixel position from percentage
          const x = (field.x_position / 100) * canvas.width
          const y = (field.y_position / 100) * canvas.height

          // Set font style
          const fontWeight = field.font_weight || 'normal'
          const fontSize = field.font_size || 36
          const fontFamily = field.font_family || 'Arial'
          ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
          ctx.fillStyle = field.font_color || '#000000'
          ctx.textBaseline = 'middle'

          // Set text alignment
          ctx.textAlign = field.text_align || 'center'

          // Add text shadow for better readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
          ctx.shadowBlur = 3
          ctx.shadowOffsetX = 1
          ctx.shadowOffsetY = 1

          // Draw the text
          ctx.fillText(value, x, y)

          // Reset shadow
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0
        }

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/png', 1.0)
        resolve(dataUrl)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load template image'))
    }

    img.src = templateUrl
  })
}

/**
 * Get the value for a field placeholder from recipient data.
 * Maps {{NAME}}, {{COURSE}}, {{DATE}} to actual values.
 *
 * @param {string} fieldName - The placeholder like {{NAME}}
 * @param {Object} data - Recipient data
 * @returns {string} The value to render
 */
function getFieldValue(fieldName, data) {
  const mapping = {
    '{{NAME}}': data.name || data.Name || '',
    '{{COURSE}}': data.course || data.Course || '',
    '{{DATE}}': data.date || data.Date || '',
  }

  // Try exact match first, then case-insensitive
  if (mapping[fieldName] !== undefined) {
    return mapping[fieldName]
  }

  // Try matching with uppercase/lowercase variations
  const normalizedField = fieldName.toUpperCase()
  for (const [key, value] of Object.entries(mapping)) {
    if (key.toUpperCase() === normalizedField) {
      return value
    }
  }

  // For custom fields, try to extract the field name
  const match = fieldName.match(/^\{\{(\w+)\}\}$/)
  if (match) {
    const key = match[1].toLowerCase()
    return data[key] || ''
  }

  return ''
}

/**
 * Load an image as an HTMLImageElement.
 *
 * @param {string} url - Image URL
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
