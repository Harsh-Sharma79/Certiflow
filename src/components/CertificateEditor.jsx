import { useState, useRef, useCallback, useEffect } from 'react'

const AVAILABLE_FIELDS = [
  { name: '{{NAME}}', label: 'Name' },
  { name: '{{COURSE}}', label: 'Course' },
  { name: '{{DATE}}', label: 'Date' },
]

const FONT_FAMILIES = ['Arial', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Impact']

const DEFAULT_FIELD_STYLE = {
  font_size: 36,
  font_family: 'Arial',
  font_color: '#000000',
  font_weight: 'normal',
  text_align: 'center',
}

/**
 * Certificate Editor - visual editor for positioning dynamic text fields
 * on top of the certificate template image.
 *
 * Fields are stored with percentage-based coordinates for responsiveness.
 */
export default function CertificateEditor({ templateUrl, initialFields = [], onSave, onBack }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [fields, setFields] = useState(() => {
    if (initialFields.length > 0) {
      return initialFields.map(f => ({
        id: f.id || crypto.randomUUID(),
        field_name: f.field_name,
        x_position: f.x_position,
        y_position: f.y_position,
        font_size: f.font_size,
        font_family: f.font_family,
        font_color: f.font_color,
        font_weight: f.font_weight,
        text_align: f.text_align,
      }))
    }
    // Default fields
    return AVAILABLE_FIELDS.map((f, i) => ({
      id: crypto.randomUUID(),
      field_name: f.name,
      x_position: 50,
      y_position: 20 + i * 15,
      ...DEFAULT_FIELD_STYLE,
    }))
  })

  const [selectedField, setSelectedField] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  // Track container size for drag calculations
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Draw the certificate on canvas
  const drawCertificate = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      setImageLoaded(true)
    }
    img.src = templateUrl
  }, [templateUrl])

  useEffect(() => {
    if (templateUrl) drawCertificate()
  }, [templateUrl, drawCertificate])

  // Handle mouse down on field (start drag)
  const handleFieldMouseDown = (e, fieldId) => {
    e.preventDefault()
    e.stopPropagation()
    const field = fields.find(f => f.id === fieldId)
    if (!field) return

    setSelectedField(fieldId)
    setDragging(fieldId)

    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const fieldPxX = (field.x_position / 100) * rect.width
    const fieldPxY = (field.y_position / 100) * rect.height

    setDragOffset({
      x: mouseX - fieldPxX,
      y: mouseY - fieldPxY,
    })
  }

  // Handle touch start for mobile
  const handleFieldTouchStart = (e, fieldId) => {
    e.preventDefault()
    const touch = e.touches[0]
    const field = fields.find(f => f.id === fieldId)
    if (!field) return

    setSelectedField(fieldId)
    setDragging(fieldId)

    const rect = containerRef.current.getBoundingClientRect()
    const touchX = touch.clientX - rect.left
    const touchY = touch.clientY - rect.top
    const fieldPxX = (field.x_position / 100) * rect.width
    const fieldPxY = (field.y_position / 100) * rect.height

    setDragOffset({
      x: touchX - fieldPxX,
      y: touchY - fieldPxY,
    })
  }

  // Handle mouse/touch move
  useEffect(() => {
    if (!dragging) return

    const handleMove = (clientX, clientY) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = clientX - rect.left - dragOffset.x
      const y = clientY - rect.top - dragOffset.y

      const xPercent = Math.max(0, Math.min(100, (x / rect.width) * 100))
      const yPercent = Math.max(0, Math.min(100, (y / rect.height) * 100))

      setFields(prev =>
        prev.map(f =>
          f.id === dragging
            ? { ...f, x_position: Math.round(xPercent * 100) / 100, y_position: Math.round(yPercent * 100) / 100 }
            : f
        )
      )
    }

    const handleMouseMove = (e) => handleMove(e.clientX, e.clientY)
    const handleTouchMove = (e) => {
      e.preventDefault()
      handleMove(e.touches[0].clientX, e.touches[0].clientY)
    }

    const handleEnd = () => setDragging(null)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [dragging, dragOffset])

  // Update selected field property
  const updateField = (fieldId, updates) => {
    setFields(prev =>
      prev.map(f => (f.id === fieldId ? { ...f, ...updates } : f))
    )
  }

  // Add a new custom field
  const addField = (fieldName) => {
    setFields(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        field_name: fieldName,
        x_position: 50,
        y_position: 50,
        ...DEFAULT_FIELD_STYLE,
      },
    ])
  }

  // Remove a field
  const removeField = (fieldId) => {
    setFields(prev => prev.filter(f => f.id !== fieldId))
    if (selectedField === fieldId) setSelectedField(null)
  }

  // Save fields
  const handleSave = async () => {
    setSaving(true)
    await onSave(fields)
    setSaving(false)
  }

  const selectedFieldData = fields.find(f => f.id === selectedField)

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Canvas Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Design Certificate Fields</h2>
            <p className="text-gray-500 text-sm mt-1">Drag fields to position them on the certificate.</p>
          </div>
          <button onClick={onBack} className="btn-secondary text-sm">
            Back
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          style={{ aspectRatio: '4/3' }}
        >
          {/* Hidden canvas for image loading */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Certificate background */}
          {templateUrl && (
            <img
              src={templateUrl}
              alt="Certificate template"
              className="w-full h-full object-contain"
              draggable={false}
            />
          )}

          {/* Draggable fields */}
          {fields.map((field) => {
            const isDragging = dragging === field.id
            const isSelected = selectedField === field.id
            return (
              <div
                key={field.id}
                className={`absolute cursor-move select-none transition-shadow ${
                  isDragging ? 'z-20 shadow-lg' : isSelected ? 'z-10' : 'z-5'
                }`}
                style={{
                  left: `${field.x_position}%`,
                  top: `${field.y_position}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: `${Math.max(12, field.font_size * 0.4)}px`,
                  fontFamily: field.font_family,
                  color: field.font_color,
                  fontWeight: field.font_weight,
                  textAlign: field.text_align,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  minWidth: '80px',
                  border: isSelected ? '2px solid #3b82f6' : '2px dashed rgba(0,0,0,0.2)',
                  backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.8)',
                }}
                onMouseDown={(e) => handleFieldMouseDown(e, field.id)}
                onTouchStart={(e) => handleFieldTouchStart(e, field.id)}
              >
                {field.field_name}
                {isSelected && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeField(field.id) }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex gap-4 justify-between items-center">
          <div className="flex gap-2 flex-wrap">
            {AVAILABLE_FIELDS.map(f => (
              <button
                key={f.name}
                onClick={() => addField(f.name)}
                className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
              >
                + {f.label}
              </button>
            ))}
            <button
              onClick={() => {
                const name = prompt('Enter field name (use {{FIELD_NAME}} format):')
                if (name && name.startsWith('{{') && name.endsWith('}}')) {
                  addField(name)
                } else if (name) {
                  addField(`{{${name.toUpperCase()}}}`)
                }
              }}
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              + Custom Field
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || fields.length === 0}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-full xl:w-80 flex-shrink-0">
        <div className="card sticky top-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Field Properties</h3>
          {selectedFieldData ? (
            <div className="space-y-4">
              <div>
                <label className="label">Field Name</label>
                <input
                  type="text"
                  value={selectedFieldData.field_name}
                  onChange={(e) => updateField(selectedField, { field_name: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">X Position (%)</label>
                  <input
                    type="number"
                    value={Math.round(selectedFieldData.x_position * 10) / 10}
                    onChange={(e) => updateField(selectedField, { x_position: parseFloat(e.target.value) || 0 })}
                    className="input-field text-sm"
                    min={0}
                    max={100}
                    step={0.5}
                  />
                </div>
                <div>
                  <label className="label">Y Position (%)</label>
                  <input
                    type="number"
                    value={Math.round(selectedFieldData.y_position * 10) / 10}
                    onChange={(e) => updateField(selectedField, { y_position: parseFloat(e.target.value) || 0 })}
                    className="input-field text-sm"
                    min={0}
                    max={100}
                    step={0.5}
                  />
                </div>
              </div>

              <div>
                <label className="label">Font Size (px)</label>
                <input
                  type="range"
                  min={12}
                  max={120}
                  value={selectedFieldData.font_size}
                  onChange={(e) => updateField(selectedField, { font_size: parseInt(e.target.value) })}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{selectedFieldData.font_size}px</span>
              </div>

              <div>
                <label className="label">Font Family</label>
                <select
                  value={selectedFieldData.font_family}
                  onChange={(e) => updateField(selectedField, { font_family: e.target.value })}
                  className="input-field text-sm"
                >
                  {FONT_FAMILIES.map(f => (
                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedFieldData.font_color}
                      onChange={(e) => updateField(selectedField, { font_color: e.target.value })}
                      className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedFieldData.font_color}
                      onChange={(e) => updateField(selectedField, { font_color: e.target.value })}
                      className="input-field text-sm flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Weight</label>
                  <select
                    value={selectedFieldData.font_weight}
                    onChange={(e) => updateField(selectedField, { font_weight: e.target.value })}
                    className="input-field text-sm"
                  >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Alignment</label>
                <div className="flex gap-2">
                  {['left', 'center', 'right'].map(align => (
                    <button
                      key={align}
                      onClick={() => updateField(selectedField, { text_align: align })}
                      className={`flex-1 py-2 text-sm rounded-lg border ${
                        selectedFieldData.text_align === align
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {align.charAt(0).toUpperCase() + align.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => removeField(selectedField)}
                className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Remove Field
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Click a field on the certificate to edit its properties.</p>
          )}
        </div>
      </div>
    </div>
  )
}
