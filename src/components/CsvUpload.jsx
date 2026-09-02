import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * CSV Upload component with drag-and-drop, parsing, validation, and preview.
 * Expects columns: Name, Course, Date (case-insensitive header matching).
 */
export default function CsvUpload({ projectId, existingRecipients = [], onUpload }) {
  const [csvData, setCsvData] = useState(null)
  const [parsedRows, setParsedRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [errors, setErrors] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const REQUIRED_HEADERS = ['name', 'course', 'date']

  /**
   * Parse CSV text into headers and rows.
   */
  const parseCsv = useCallback((text) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      setErrors(['CSV file must have at least a header row and one data row.'])
      return
    }

    // Parse header row
    const headerLine = lines[0]
    const rawHeaders = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const normalizedHeaders = rawHeaders.map(h => h.toLowerCase())

    // Check required headers
    const missing = REQUIRED_HEADERS.filter(rh => !normalizedHeaders.includes(rh))
    if (missing.length > 0) {
      setErrors([`Missing required columns: ${missing.join(', ')}. Found columns: ${rawHeaders.join(', ')}`])
      return
    }

    // Map columns to normalized names
    const nameIdx = normalizedHeaders.indexOf('name')
    const courseIdx = normalizedHeaders.indexOf('course')
    const dateIdx = normalizedHeaders.indexOf('date')

    // Parse data rows
    const rows = []
    const rowErrors = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue // Skip empty lines

      // Simple CSV parsing (handles basic quoted fields)
      const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const name = cells[nameIdx]
      const course = cells[courseIdx]
      const date = cells[dateIdx]

      if (!name || !course || !date) {
        rowErrors.push(`Row ${i + 1}: Missing data (Name: "${name}", Course: "${course}", Date: "${date}")`)
        continue
      }

      rows.push({ name, course, date })
    }

    if (rows.length === 0) {
      setErrors(['No valid data rows found in the CSV file.'])
      return
    }

    setHeaders(rawHeaders)
    setParsedRows(rows)
    setErrors(rowErrors)
  }, [])

  /**
   * Handle file selection via input or drag.
   */
  const handleFile = useCallback((file) => {
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Please upload a CSV file')
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      setCsvData(text)
      setErrors([])
      setParsedRows([])
      parseCsv(text)
    }
    reader.readAsText(file)
  }, [parseCsv])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleConfirmUpload = async () => {
    if (parsedRows.length === 0) return
    setUploading(true)
    try {
      await onUpload(csvData)
    } catch (error) {
      toast.error(error.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleReset = () => {
    setCsvData(null)
    setParsedRows([])
    setHeaders([])
    setErrors([])
  }

  // If there are existing recipients, show them
  if (existingRecipients.length > 0 && !csvData) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <h3 className="font-semibold text-gray-900">{existingRecipients.length} Recipients Loaded</h3>
              <p className="text-sm text-gray-500">Recipient data has been uploaded.</p>
            </div>
          </div>
          <button onClick={handleReset} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Upload New CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">#</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Name</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Course</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {existingRecipients.slice(0, 10).map((r, i) => (
                <tr key={r.id || i} className="border-b border-gray-100">
                  <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                  <td className="py-2 px-3">{r.data?.name || r.name}</td>
                  <td className="py-2 px-3">{r.data?.course || r.course}</td>
                  <td className="py-2 px-3">{r.data?.date || r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {existingRecipients.length > 10 && (
            <p className="text-sm text-gray-400 mt-3 text-center">
              ...and {existingRecipients.length - 10} more rows
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <label
        className={`card block cursor-pointer transition-all border-2 border-dashed ${
          dragActive ? 'border-primary-400 bg-primary-50' : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        <div className="text-center py-8">
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-lg font-medium text-gray-700 mb-1">
            {dragActive ? 'Drop your CSV file here' : 'Click to upload or drag a CSV file'}
          </p>
          <p className="text-sm text-gray-400">
            CSV with columns: Name, Course, Date
          </p>
        </div>
      </label>

      {/* CSV Format Help */}
      <div className="card bg-blue-50 border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Expected CSV Format</h4>
        <pre className="text-xs text-blue-800 bg-white p-3 rounded-lg overflow-x-auto">
{`Name,Course,Date
Rahul Sharma,Java Programming,2026-09-02
Priya Patel,Web Development,2026-09-02
Amit Kumar,Python Basics,2026-09-02`}
        </pre>
        <p className="text-xs text-blue-700 mt-2">
          Headers are case-insensitive. Only Name, Course, and Date columns are required.
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-900 mb-1">Validation Errors</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
                {errors.length > 5 && <li>...and {errors.length - 5} more errors</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              Preview ({parsedRows.length} recipients)
            </h3>
            <button onClick={handleReset} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">#</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Course</th>
                  <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                    <td className="py-2 px-3">{row.name}</td>
                    <td className="py-2 px-3">{row.course}</td>
                    <td className="py-2 px-3">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end gap-4">
            <button onClick={handleReset} className="btn-secondary text-sm">
              Cancel
            </button>
            <button
              onClick={handleConfirmUpload}
              disabled={uploading}
              className="btn-primary text-sm"
            >
              {uploading ? 'Uploading...' : `Confirm ${parsedRows.length} Recipients`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
